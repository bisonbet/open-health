import {
    BaseVisionParser,
    VisionModelOptions,
    VisionParseOptions,
    VisionParserModel
} from "@/lib/health-data/parser/vision/base-vision";
import fetch from 'node-fetch'
import {HealthCheckupSchema, HealthCheckupType} from "@/lib/health-data/parser/schema";
import {ChatOllama} from "@langchain/ollama";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {currentDeploymentEnv} from "@/lib/current-deployment-env";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ZodError } from "zod"; // Assuming zod is used for HealthCheckupSchema

export class OllamaVisionParser extends BaseVisionParser {

    private _apiUrl: string = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://ollama:11434';

    get apiKeyRequired(): boolean {
        return false
    }

    get enabled(): boolean {
        return currentDeploymentEnv === 'local';
    }

    get apiUrlRequired(): boolean {
        return true;
    }

    get name(): string {
        return 'Ollama'
    }

    get apiUrl(): string {
        return this._apiUrl;
    }

    async models(options?: VisionModelOptions): Promise<VisionParserModel[]> {
        try {
            const apiUrl = options?.apiUrl || this._apiUrl
            const response = await fetch(`${apiUrl}/api/tags`)
            // Assuming the response is JSON and has a 'models' property
            const data = await response.json() as { models: { name: string, model: string }[] };
            
            // Filter models that have vision capabilities
            const visionModels = await Promise.all(
                data.models.map(async (m) => {
                    try {
                        const showResponse = await fetch(`${apiUrl}/api/show`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ model: m.model })
                        });
                        const showData = await showResponse.json();
                        // Check if the model has vision capability
                        const hasVision = showData.capabilities?.includes('vision');
                        return hasVision ? {id: m.model, name: m.name} : null;
                    } catch (e) {
                        console.error(`Failed to check capabilities for model ${m.model}:`, e);
                        return null;
                    }
                })
            );
            
            // Filter out null values (models without vision capabilities)
            return visionModels.filter((model): model is VisionParserModel => model !== null);
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async parse(options: VisionParseOptions): Promise<HealthCheckupType> {
        const apiUrl = options.apiUrl || this._apiUrl;
        const llm = new ChatOllama({
            model: options.model.id,
            baseUrl: apiUrl,
            format: "json",
            numPredict: -1 // Corrected to camelCase
        });
        const messages = options.messages || ChatPromptTemplate.fromMessages([]);
        // <<< --- ADDED LOGGING HERE --- >>>
        // console.log("Ollama Prompt Messages Input (options.messages):", JSON.stringify(options.messages, null, 2));

        const chain = messages.pipe(llm).pipe(new JsonOutputParser());

        try {
            console.log(`Attempting to parse with Ollama model: ${options.model.id}`);
            // Increased retry attempts slightly
            const result = await chain.withRetry({ stopAfterAttempt: 5 }).invoke(options.input);

            // console.log("Ollama Raw JSON Output:", result);

            let dataToValidate: unknown = result;
            
            // Combined Transformation Logic Block Start
            const expectedKey = 'test_result';
            // Add other potential incorrect container keys here
            const potentialIncorrectKeys = ['test_results', 'testResults', 'results', 'testResult']; 

            if (dataToValidate && typeof dataToValidate === 'object') {
                const dataObject = dataToValidate as { [key: string]: unknown };

                // Case 1: Correct key is missing, check for known incorrect keys
                if (!(expectedKey in dataObject)) {
                    let foundIncorrectKey: string | null = null;
                    for (const key of potentialIncorrectKeys) {
                        if (key in dataObject) {
                            foundIncorrectKey = key;
                            break;
                        }
                    }

                    // Subcase 1.1: A known incorrect key was found (e.g., 'test_results')
                    if (foundIncorrectKey) {
                        // console.log(`Transforming key: Renaming '${foundIncorrectKey}' to '${expectedKey}' and extracting value...`);
                        // Preserve other potential top-level keys (like date/name) alongside the incorrect test key
                        const baseData: { [key: string]: unknown } = {};
                        for (const topKey in dataObject) {
                            if (topKey !== foundIncorrectKey) {
                                baseData[topKey] = dataObject[topKey];
                            }
                        }
                        // Assign the extracted value (the actual tests object) to the correct key
                        dataToValidate = {
                            ...baseData,
                            [expectedKey]: dataObject[foundIncorrectKey] 
                        };
                        // console.log("Transformed Data (Incorrect Key Renamed):", dataToValidate);
                    } 
                    // Subcase 1.2: Correct key is missing AND no known incorrect keys were found
                    // Assume the entire object is the flat test data that needs wrapping.
                    else {
                        // console.warn(`Expected key '${expectedKey}' not found, and no known alternatives found. Assuming the entire result object needs to be nested under '${expectedKey}'. Performing structural transformation.`);
                        dataToValidate = { [expectedKey]: dataToValidate };
                        // console.log("Transformed Data (Structurally Wrapped):", dataToValidate);
                    }
                }
                // Case 2: Correct key ('test_result') was already present - do nothing.
                else {
                   // console.log(`Correct key '${expectedKey}' found. No transformation needed.`);
                }
            }
            // Combined Transformation Logic Block End

            // Explicitly validate the potentially transformed JSON against the Zod schema
            const validatedResult = HealthCheckupSchema.parse(dataToValidate);
            // console.log("Ollama Parsed and Validated Result:", validatedResult);
            return validatedResult;

        } catch (e: unknown) {
            console.error(`Error parsing health data with Ollama model ${options.model.id}:`, e);

            // Check if it's a Zod validation error or a general parsing error (including stream)
            if (e instanceof ZodError || (e instanceof Error && (e.message.includes('json') || e.message.includes('parse') || e.message.includes('stream')))) {
                console.warn(`Ollama model ${options.model.id} failed to produce valid JSON conforming to schema or stream failed. Returning default object.`);
                // Return default object with required structure on failure
                return { test_result: {} } as HealthCheckupType;
            }
            // Re-throw other unexpected errors
            throw e;
        }
    }
}
