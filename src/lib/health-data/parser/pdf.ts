/* eslint-disable */

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HealthCheckupSchema, HealthCheckupType } from "@/lib/health-data/parser/schema";
import { fileTypeFromBuffer } from "file-type";
import { getFileMd5, processBatchWithConcurrency } from "@/lib/health-data/parser/util";
import { getParsePrompt, MessagePayload } from "@/lib/health-data/parser/prompt";
import visions from "@/lib/health-data/parser/vision";
import documents from "@/lib/health-data/parser/document";
import { put } from "@vercel/blob";
import { currentDeploymentEnv } from "@/lib/current-deployment-env";
import fs from "node:fs";
import fetch from "node-fetch";
import { tasks } from "@trigger.dev/sdk/v3";
import type { pdfToImages } from "@/trigger/pdf-to-image";
import { exec } from "child_process";
import { promisify } from "util";
import { enhanceVitalSigns } from "@/lib/health-data/parser/vital-signs-enhancer";

const execPromise = promisify(exec);

interface VisionParserOptions {
  parser: string;
  model: string;
  apiKey: string;
  apiUrl?: string;
}

interface DocumentParserOptions {
  parser: string;
  model: string;
  apiKey: string;
}

interface SourceParseOptions {
  file: string;
  visionParser?: VisionParserOptions;
  documentParser?: DocumentParserOptions;
}

interface InferenceOptions {
  imagePaths: string[];
  excludeImage: boolean;
  excludeText: boolean;
  visionParser: VisionParserOptions;
  documentParser: DocumentParserOptions;
  useClinicalPrompts?: boolean;
}

interface TestResult {
  value: string | null;
  unit: string | null;
}

function isTestResult(value: any): value is TestResult {
  return value && typeof value === 'object' && 'value' in value;
}

async function documentOCR({
  document,
  documentParser,
}: {
  document: string;
  documentParser: DocumentParserOptions;
}) {
  // Get the document parser
  const parser = documents.find((e) => e.name === documentParser.parser);
  if (!parser) throw new Error("Invalid document parser");

  // Get the ocr result
  const models = await parser.models();
  const model = models.find((e) => e.id === documentParser.model);
  if (!model) throw new Error("Invalid document parser model");

  // Get the ocr result
  const { ocr } = await parser.ocr({ input: document, model, apiKey: documentParser.apiKey });
  return ocr;
}

async function documentParse({
  document,
  documentParser,
}: {
  document: string;
  documentParser: DocumentParserOptions;
}): Promise<any> {
  // Get the document parser
  const parser = documents.find((e) => e.name === documentParser.parser);
  if (!parser) throw new Error("Invalid document parser");

  // Get the ocr result
  const models = await parser.models();
  const model = models.find((e) => e.id === documentParser.model);
  if (!model) throw new Error("Invalid document parser model");

  // Get the parse result
  const { document: result } = await parser.parse({ input: document, model, apiKey: documentParser.apiKey });
  return result;
}

/**
 * Detect if a document is primarily clinical narrative vs lab results
 * @param ocrText - OCR extracted text from the document
 * @returns boolean - true if document appears to be clinical narrative
 */
function isClinicalDocument(ocrText: string): boolean {
  const clinicalKeywords = [
    'consultation', 'visit', 'examination', 'assessment', 'diagnosis', 'treatment', 'plan',
    'chief complaint', 'history of present illness', 'physical exam', 'impression',
    'discharge', 'admit', 'recommendation', 'follow-up', 'continue', 'discontinue',
    'medication', 'prescription', 'instructions', 'clinic', 'appointment',
    'symptoms', 'patient reports', 'on examination', 'findings', 'appears',
    'imaging', 'x-ray', 'ct scan', 'mri', 'ultrasound', 'ecg', 'ekg',
    'provider', 'physician', 'doctor', 'nurse', 'clinician'
  ];

  const labKeywords = [
    'result', 'value', 'reference', 'range', 'normal', 'abnormal', 'high', 'low',
    'mg/dl', 'mmol/l', 'g/dl', 'mcg', 'ng/ml', 'iu/l', 'u/l',
    'complete blood count', 'cbc', 'basic metabolic', 'comprehensive metabolic',
    'lipid panel', 'thyroid', 'glucose', 'hemoglobin', 'hematocrit',
    'cholesterol', 'triglycerides', 'creatinine', 'bun'
  ];

  const text = ocrText.toLowerCase();
  const clinicalScore = clinicalKeywords.filter(keyword => text.includes(keyword)).length;
  const labScore = labKeywords.filter(keyword => text.includes(keyword)).length;

  // If we have more clinical keywords than lab keywords, treat as clinical document
  // Also treat as clinical if we have significant clinical content even with some lab content
  return clinicalScore > labScore || clinicalScore >= 3;
}

async function inference(inferenceOptions: InferenceOptions) {
  const {
    imagePaths,
    excludeImage,
    excludeText,
    visionParser: visionParserOptions,
    documentParser: documentParserOptions,
    useClinicalPrompts = false,
  } = inferenceOptions;

  // Extract text data if not excluding text
  const pageDataList:
    | { page_content: string }[]
    | undefined = !excludeText
    ? await processBatchWithConcurrency(
        imagePaths,
        async (path) => {
          const { content } = await documentParse({ document: path, documentParser: documentParserOptions });
          const { markdown } = content;
          return { page_content: markdown };
        },
        2
      )
    : undefined;

  // Extract image data if not excluding images
  const imageDataList: string[] = !excludeImage
    ? await processBatchWithConcurrency(
        imagePaths,
        async (path) => {
          let buffer: Buffer;
          if (path.startsWith("http://") || path.startsWith("https://")) {
            // Handle remote URLs
            const fileResponse = await fetch(path);
            buffer = Buffer.from(await fileResponse.arrayBuffer());
          } else {
            // Handle local file paths
            buffer = fs.readFileSync(path);
          }
          return `data:image/png;base64,${buffer.toString("base64")}`;
        },
        4
      )
    : [];

  // Batch Inputs
  const numPages = pageDataList ? pageDataList.length : imageDataList.length;
  const batchInputs: MessagePayload[] = new Array(numPages).fill(0).map((_, i) => ({
    ...(!excludeText && pageDataList ? { context: pageDataList[i].page_content } : {}),
    ...(!excludeImage && imageDataList ? { image_data: imageDataList[i] } : {}),
  }));

  // Generate Messages
  const messages = ChatPromptTemplate.fromMessages(getParsePrompt({ excludeImage, excludeText, useClinicalPrompts }));

  // Select Vision Parser
  const visionParser = visions.find((e) => e.name === visionParserOptions.parser);
  if (!visionParser) throw new Error("Invalid vision parser");

  // Get models
  const visionParserModels = await visionParser.models({ apiUrl: visionParserOptions.apiUrl });
  const visionParserModel = visionParserModels.find((e) => e.id === visionParserOptions.model);
  if (!visionParserModel) throw new Error("Invalid vision parser model");

  // Process the batch inputs with reduced concurrency for Ollama
  const concurrencyLimit = visionParserOptions.parser === 'Ollama' ? 1 : 4;
  const batchData = await processBatchWithConcurrency(
    batchInputs,
    async (input) =>
      visionParser.parse({
        model: visionParserModel,
        messages: messages,
        input: input,
        apiKey: visionParserOptions.apiKey,
        apiUrl: visionParserOptions.apiUrl,
      }),
    concurrencyLimit
  );

  // Merge the results
  const data: { [key: string]: HealthCheckupType } = batchData.reduce((acc, curr, i) => {
    acc[`page_${i}`] = curr;
    return acc;
  }, {} as { [key: string]: HealthCheckupType });

  // Merge Results
  const mergeInfo: { [key: string]: { pages: number[]; values: any[] } } = {};

  for (const key of HealthCheckupSchema.shape.test_result.keyof().options) {
    const testFields = [];
    const testPages: number[] = [];
    for (let i = 0; i < numPages; i++) {
      const healthCheckup = data[`page_${i}`];
      const healthCheckupTestResult = healthCheckup.test_result;

      if (healthCheckupTestResult.hasOwnProperty(key) && healthCheckupTestResult[key]) {
        testFields.push(healthCheckupTestResult[key]);
        testPages.push(i);
      }
    }

    if (testFields.length > 0) {
      mergeInfo[key] = { pages: testPages, values: testFields };
    }
  }

  const mergedTestResult: { [key: string]: any } = {};
  const mergedTestResultPage: { [key: string]: { page: number } } = {};

  // Merge the results
  for (const mergeInfoKey in mergeInfo) {
    const mergeTarget = mergeInfo[mergeInfoKey];
    mergedTestResult[mergeInfoKey] = mergeTarget.values[0];
    mergedTestResultPage[mergeInfoKey] = {
      page: mergeTarget.pages[0] + 1,
    };
  }

  let mergeData: any = {};

  // Merge name and date
  for (let i = 0; i < numPages; i++) {
    const healthCheckup = data[`page_${i}`];
    mergeData = {
      ...mergeData,
      ...healthCheckup,
    };
  }

  // Update test_result with merged data
  mergeData["test_result"] = mergedTestResult;

  // Create final HealthCheckup object
  const finalHealthCheckup = HealthCheckupSchema.parse(mergeData);

  return {
    finalHealthCheckup: finalHealthCheckup,
    mergedTestResultPage: mergedTestResultPage,
  };
}

/**
 * Convert a document to images
 * - pdf: convert to images using an external tool (pdftoppm)
 * - image: nothing
 *
 * @param file
 *
 * @returns {Promise<string[]>} - List of image paths
 */
async function documentToImages({ file: filePath }: Pick<SourceParseOptions, "file">): Promise<string[]> {
  let fileBuffer: Buffer;
  
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    // Handle remote URLs
    const fileResponse = await fetch(filePath);
    fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
  } else {
    // Handle local file paths
    fileBuffer = fs.readFileSync(filePath);
  }
  const result = await fileTypeFromBuffer(fileBuffer);
  const fileHash = await getFileMd5(fileBuffer);
  if (!result) throw new Error("Invalid file type");
  const mime = result.mime;

  const images: string[] = [];
  if (mime === "application/pdf") {
    if (currentDeploymentEnv === "local") {
      // Write PDF to a temporary file
      const tmpDir = "/tmp";
      const pdfFilePath = `${tmpDir}/${fileHash}.pdf`;
      fs.writeFileSync(pdfFilePath, fileBuffer);

      // Use pdftoppm to convert PDF pages to PNG images.
      // This will generate files like: /tmp/<fileHash>-1.png, /tmp/<fileHash>-2.png, etc.
      try {
        await execPromise(`pdftoppm -png "${pdfFilePath}" "${tmpDir}/${fileHash}"`);
      } catch (error) {
        throw new Error("pdftoppm conversion failed: " + error);
      }

      // Read the generated PNG files
      const tmpFiles = fs.readdirSync(tmpDir);
      const pngFiles = tmpFiles
        .filter((f) => f.startsWith(fileHash + "-") && f.endsWith(".png"))
        .sort((a, b) => {
          const pageA = parseInt(a.split("-")[1].split(".")[0]);
          const pageB = parseInt(b.split("-")[1].split(".")[0]);
          return pageA - pageB;
        });

      for (const f of pngFiles) {
        const fullPath = `${tmpDir}/${f}`;
        const imageBuffer = fs.readFileSync(fullPath);
        images.push(`data:image/png;base64,${imageBuffer.toString("base64")}`);
      }

      // Cleanup temporary files
      fs.unlinkSync(pdfFilePath);
      for (const f of pngFiles) {
        fs.unlinkSync(`${tmpDir}/${f}`);
      }
    } else {
      const result = await tasks.triggerAndPoll<typeof pdfToImages>(
        "pdf-to-image",
        { pdfUrl: filePath },
        { pollIntervalMs: 5000 }
      );
      if (result.status === "COMPLETED" && result.output) {
        images.push(...result.output.images.map((image) => `data:image/png;base64,${image}`));
      } else {
        throw new Error("Failed to convert the pdf to images");
      }
    }
  } else {
    images.push(`data:${mime};base64,${fileBuffer.toString("base64")}`);
  }

  // Write the image data to files and create public URLs
  const imagePaths = [];
  for (let i = 0; i < images.length; i++) {
    if (currentDeploymentEnv === "local") {
      const localImagePath = `./public/uploads/${fileHash}_${i}.png`;
      fs.writeFileSync(localImagePath, Buffer.from(images[i].split(",")[1], "base64"));
      imagePaths.push(localImagePath);
    } else {
      const blob = await put(
        `/uploads/${fileHash}_${i}.png`,
        Buffer.from(images[i].split(",")[1], "base64"),
        { access: "public", contentType: "image/png" }
      );
      imagePaths.push(blob.downloadUrl);
    }
  }

  return imagePaths;
}

/**
 * Parse the health data
 *
 * @param options
 */
export async function parseHealthData(options: SourceParseOptions) {
  let { file: filePath } = options;
  
  // Convert public URL to local path for processing in local environment
  if (currentDeploymentEnv === "local" && filePath.includes("/api/static/uploads/")) {
    const filename = filePath.split("/").pop();
    filePath = `./public/uploads/${filename}`;
  }

  // VisionParser
  const visionParser =
    options.visionParser || {
      parser: "OpenAI",
      model: "gpt-4o",
      apiKey: process.env.OPENAI_API as string,
    };

  // Document Parser
  const documentParser =
    options.documentParser || {
      parser: "Docling",
      model: "document-parse",
      apiKey: "",  // Docling doesn't require an API key
    };

  // Prepare images
  const imagePaths = await documentToImages({ file: filePath });

  // Prepare OCR results
  const ocrResults = await documentOCR({
    document: filePath,
    documentParser: documentParser,
  });

  // Detect document type using OCR text
  const ocrText = (ocrResults as { text?: string })?.text || "";
  const useClinicalPrompts = isClinicalDocument(ocrText);
  
  console.log(`Document type detection: ${useClinicalPrompts ? 'Clinical' : 'Lab'} document`);
  console.log(`OCR keywords found in: ${ocrText.substring(0, 200)}...`);

  // Prepare parse results
  await processBatchWithConcurrency(
    imagePaths,
    async (path) => documentParse({ document: path, documentParser: documentParser }),
    3
  );

  // Merge the results with appropriate prompts
  const baseInferenceOptions = { imagePaths, visionParser, documentParser, useClinicalPrompts };
  const [
    { finalHealthCheckup: resultTotal, mergedTestResultPage: resultTotalPages },
    { finalHealthCheckup: resultText, mergedTestResultPage: resultTextPages },
    { finalHealthCheckup: resultImage, mergedTestResultPage: resultImagePages },
  ] = await Promise.all([
    inference({ ...baseInferenceOptions, excludeImage: false, excludeText: false }),
    inference({ ...baseInferenceOptions, excludeImage: false, excludeText: true }),
    inference({ ...baseInferenceOptions, excludeImage: true, excludeText: false }),
  ]);

  const resultDictTotal = resultTotal.test_result;
  const resultDictText = resultText.test_result;
  const resultDictImage = resultImage.test_result;

  const mergedTestResult: { [key: string]: any } = {};
  const mergedPageResult: { [key: string]: { page: number } | null } = {};

  for (const key of HealthCheckupSchema.shape.test_result.keyof().options) {
    const valueTotal =
      resultDictTotal.hasOwnProperty(key) &&
      resultDictTotal[key] !== null &&
      isTestResult(resultDictTotal[key]) &&
      resultDictTotal[key].value !== null
        ? resultDictTotal[key]
        : null;
    const pageTotal = valueTotal !== null ? resultTotalPages[key] : null;

    const valueText =
      resultDictText.hasOwnProperty(key) &&
      resultDictText[key] !== null &&
      isTestResult(resultDictText[key]) &&
      resultDictText[key].value !== null
        ? resultDictText[key]
        : null;
    const pageText = valueText !== null ? resultTextPages[key] : null;

    const valueImage =
      resultDictImage.hasOwnProperty(key) &&
      resultDictImage[key] !== null &&
      isTestResult(resultDictImage[key]) &&
      resultDictImage[key].value !== null
        ? resultDictImage[key]
        : null;
    const pageImage = valueImage !== null ? resultImagePages[key] : null;

    if (valueTotal === null) {
      if (valueText !== null) {
        mergedTestResult[key] = valueText;
        mergedPageResult[key] = pageText;
      } else if (valueImage !== null) {
        mergedTestResult[key] = valueImage;
        mergedPageResult[key] = pageImage;
      } else {
        mergedTestResult[key] = valueText;
        mergedPageResult[key] = pageText;
      }
    } else {
      mergedTestResult[key] = valueTotal;
      mergedPageResult[key] = pageTotal;
    }
  }

  // Remove all null values in mergedTestResult
  for (const key in mergedTestResult) {
    if (mergedTestResult[key] === null) {
      delete mergedTestResult[key];
    }
  }

  // Enhance with vital signs extraction
  const ocrTextForVitalSigns = (ocrResults as { text?: string })?.text || "";
  const enhancedResult = enhanceVitalSigns({
    ...resultTotal,
    test_result: mergedTestResult,
  }, ocrTextForVitalSigns);

  const healthCheckup = HealthCheckupSchema.parse(enhancedResult);

  return { data: [healthCheckup], pages: [mergedPageResult], ocrResults: [ocrResults] };
}
