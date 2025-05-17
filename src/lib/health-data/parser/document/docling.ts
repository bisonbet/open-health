import {
  BaseDocumentParser,
  DocumentModelOptions,
  DocumentOCROptions,
  DocumentParseOptions,
  DocumentParseResult,
  DocumentParserModel,
  OCRParseResult,
} from "@/lib/health-data/parser/document/base-document";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import { currentDeploymentEnv } from "@/lib/current-deployment-env";

/**
 * Represents the structure returned by docling-serve when we ask for JSON (OCR).
 * Adjust as necessary if docling-serve's schema changes.
 */
interface DoclingJsonContent {
  pages: {
    [pageNumber: string]: {
      size: {
        width: number;
        height: number;
      };
    };
  };
  texts: {
    text: string;
    prov: {
      page_no: number;
      bbox: {
        l: number;
        t: number;
        r: number;
        b: number;
      };
    }[];
  }[];
}

/**
 * The structure we'll return from `convertJsonContent`. This is an example shape
 * based on your usage in the code. Adjust as needed in your system.
 */
interface OcrResultDocument {
  metadata: {
    pages: {
      height: number;
      page: number;
      width: number;
    }[];
  };
  pages: {
    height: number;
    id: number;
    text: string;
    width: number;
    words: {
      boundingBox: {
        vertices: {
          x: number;
          y: number;
        }[];
      } | null;
      confidence: number;
      id: number;
      text: string;
    }[];
  }[];
  text?: string;
  stored: boolean;
}

export class DoclingDocumentParser extends BaseDocumentParser {
  private doclingUrl: string;

  constructor() {
    super();
    this.doclingUrl = process.env.DOCLING_URL || 'http://docling-serve:5001';
  }

  get apiKeyRequired(): boolean {
    return false;
  }

  get enabled(): boolean {
    return currentDeploymentEnv === "local";
  }

  get name(): string {
    return "Docling";
  }

  // Wrap in try/catch: if something goes wrong, return an empty model list.
  async models(_options?: DocumentModelOptions): Promise<DocumentParserModel[]> {
    void _options; // Mark as used to satisfy ESLint
    try {
      return [{ id: "document-parse", name: "Document Parse" }];
    } catch (error) {
      console.error("[Docling] Error in models:", error);
      return [];
    }
  }

  /**
   * OCR method. If an unexpected error happens it returns an empty OCR response.
   */
  async ocr(options: DocumentOCROptions): Promise<OCRParseResult> {
    try {
      console.log("[Docling] Starting ocr method...");
      const inputPath = options.input;

      // 1. Prepare the file data (Buffer if remote, ReadStream if local)
      let fileData: Buffer | fs.ReadStream;
      const fileName = "defaultfile.pdf";

      if (inputPath.startsWith("http://") || inputPath.startsWith("https://")) {
        console.log(`[Docling] Detected remote URL. Downloading from: ${inputPath}`);
        const fileResponse = await fetch(inputPath);
        if (!fileResponse.ok) {
          throw new Error(
            `Failed to download remote file: ${inputPath}. Status: ${fileResponse.status}`
          );
        }
        fileData = await fileResponse.buffer();
        console.log(`[Docling] Download complete. Size: ${fileData.length} bytes.`);
      } else {
        if (!fs.existsSync(inputPath)) {
          throw new Error(`File does not exist: ${inputPath}`);
        }
        const stats = fs.statSync(inputPath);
        console.log(`[Docling] Local file found. Size: ${stats.size} bytes.`);
        fileData = fs.createReadStream(inputPath);
      }

      // 2. Build form data just like your working curl
      const formData = new FormData();
      formData.append("ocr_engine", "easyocr");
      formData.append("pdf_backend", "dlparse_v4");
      formData.append("from_formats", "pdf");
      formData.append("from_formats", "docx");
      formData.append("from_formats", "image");
      formData.append("force_ocr", "true");
      formData.append("image_export_mode", "placeholder");
      formData.append("ocr_lang", "en");
      formData.append("ocr_confidence_threshold", "0.7");  // Adjust confidence threshold
      formData.append("ocr_dpi", "300");  // Increase DPI for better quality
      formData.append("ocr_preprocessing", "true");  // Enable image preprocessing
      formData.append("table_mode", "accurate");
      formData.append("files", fileData, fileName);
      formData.append("abort_on_error", "false");
      formData.append("to_formats", "json");
      formData.append("return_as_file", "false");
      formData.append("do_ocr", "true");

      console.log("[Docling] FormData built. Sending request now...");

      // 3. Send to docling-serve
      const response = await fetch(`${this.doclingUrl}/v1alpha/convert/file`, {
        method: "POST",
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json",
        },
        body: formData,
      });

      console.log(`[Docling] OCR response returned with status: ${response.status}`);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Docling server error (OCR): ${response.status} - ${response.statusText}\n${errText}`
        );
      }

      // 4. Parse response
      const data = await response.json();
      if (!data.document || !data.document.json_content) {
        console.error("Docling OCR response:", data);
        throw new Error("No `document.json_content` in docling-serve response");
      }
      const doclingJson = data.document.json_content as DoclingJsonContent;
      const convertedJsonContent = this.convertJsonContent(doclingJson);

      return { ocr: convertedJsonContent };
    } catch (error) {
      console.error("[Docling] Error in ocr:", error);
      // Return an empty OCR response if an error occurs.
      return { ocr: { metadata: { pages: [] }, pages: [], stored: false, text: "" } };
    }
  }

  /**
   * parse method. If an unexpected error happens it returns an empty document.
   */
  async parse(options: DocumentParseOptions): Promise<DocumentParseResult> {
    try {
      console.log("[Docling] Starting parse method...");
      const inputPath = options.input;

      let fileData: Buffer | fs.ReadStream;
      const fileName = "defaultfile.pdf";

      if (inputPath.startsWith("http://") || inputPath.startsWith("https://")) {
        console.log(`[Docling] Detected remote URL. Downloading from: ${inputPath}`);
        const fileResponse = await fetch(inputPath);
        if (!fileResponse.ok) {
          throw new Error(
            `Failed to download remote file: ${inputPath}. Status: ${fileResponse.status}`
          );
        }
        fileData = await fileResponse.buffer();
        console.log(`[Docling] Download complete. Size: ${fileData.length} bytes.`);
      } else {
        if (!fs.existsSync(inputPath)) {
          throw new Error(`File does not exist: ${inputPath}`);
        }
        const stats = fs.statSync(inputPath);
        console.log(`[Docling] Local file found. Size: ${stats.size} bytes.`);
        fileData = fs.createReadStream(inputPath);
      }

      // Build the multipart form data
      const formData = new FormData();
      formData.append("ocr_engine", "easyocr");
      formData.append("pdf_backend", "dlparse_v4");
      formData.append("from_formats", "pdf");
      formData.append("from_formats", "docx");
      formData.append("from_formats", "image");
      formData.append("force_ocr", "true");
      formData.append("image_export_mode", "placeholder");
      formData.append("ocr_lang", "en");
      formData.append("ocr_confidence_threshold", "0.7");  // Adjust confidence threshold
      formData.append("ocr_dpi", "300");  // Increase DPI for better quality
      formData.append("ocr_preprocessing", "true");  // Enable image preprocessing
      formData.append("table_mode", "accurate");
      formData.append("files", fileData, fileName);
      formData.append("abort_on_error", "false");
      formData.append("to_formats", "md");
      formData.append("return_as_file", "false");
      formData.append("do_ocr", "true");

      console.log("[Docling] FormData for parse built. Sending request now...");
      const response = await fetch(`${this.doclingUrl}/v1alpha/convert/file`, {
        method: "POST",
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json",
        },
        body: formData,
      });

      console.log(`[Docling] parse response returned with status: ${response.status}`);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Docling server error (Parse): ${response.status} - ${response.statusText}\n${errText}`
        );
      }

      const data = await response.json();
      if (!data.document || !data.document.md_content) {
        console.error("Docling parse response:", data);
        throw new Error("No `document.md_content` in docling-serve response");
      }
      const { md_content } = data.document;

      return { document: { content: { markdown: md_content } } };
    } catch (error) {
      console.error("[Docling] Error in parse:", error);
      // Return an empty document if an error occurs.
      return { document: { content: { markdown: "" } } };
    }
  }

  /**
   * Convert docling-serve's JSON structure into the shape we need.
   */
  private convertJsonContent(data: DoclingJsonContent): OcrResultDocument {
    try {
      const result: OcrResultDocument = {
        metadata: { pages: [] },
        pages: [],
        stored: false,
        text: ""
      };

      if (!data.pages || !data.texts) {
        console.error("Unexpected JSON content structure:", data);
        return result;
      }

      // Process each page
      for (const [pageNumStr, pageVal] of Object.entries(data.pages)) {
        const pageNum = parseInt(pageNumStr, 10);
        const pageHeight = pageVal.size.height;
        const pageWidth = pageVal.size.width;

        // Add page metadata
        result.metadata.pages.push({
          height: pageHeight,
          page: pageNum,
          width: pageWidth,
        });

        const pageObject = {
          height: pageHeight,
          id: pageNum - 1, // or just pageNum if you prefer
          text: "",
          width: pageWidth,
          words: [] as {
            boundingBox: { vertices: { x: number; y: number }[] } | null;
            confidence: number;
            id: number;
            text: string;
          }[],
        };

        let wordId = 0;
        let fullText = "";

        data.texts.forEach((textElement) => {
          textElement.prov.forEach((provItem) => {
            if (provItem.page_no === pageNum) {
              pageObject.words.push({
                boundingBox: this.convertCoordinates(provItem.bbox, pageHeight),
                confidence: 0.98,
                id: wordId++,
                text: textElement.text,
              });
              fullText += textElement.text + " ";
            }
          });
        });

        pageObject.text = fullText.trim();
        result.pages.push(pageObject);
      }

      // Combine entire doc text
      result.text = result.pages.map((p) => p.text).join("\n");
      return result;
    } catch (error) {
      console.error("[Docling] Error in convertJsonContent:", error);
      return { metadata: { pages: [] }, pages: [], stored: false, text: "" };
    }
  }

  private convertCoordinates(
    bbox: { l: number; t: number; r: number; b: number },
    pageHeight: number
  ): { vertices: { x: number; y: number }[] } | null {
    try {
      if (!bbox) return null;
      return {
        vertices: [
          { x: Math.round(bbox.l), y: Math.round(pageHeight - bbox.t) },
          { x: Math.round(bbox.r), y: Math.round(pageHeight - bbox.t) },
          { x: Math.round(bbox.r), y: Math.round(pageHeight - bbox.b) },
          { x: Math.round(bbox.l), y: Math.round(pageHeight - bbox.b) },
        ],
      };
    } catch (error) {
      console.error("[Docling] Error in convertCoordinates:", error);
      return null;
    }
  }
}
