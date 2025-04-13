import {NextRequest, NextResponse} from "next/server";
import prisma from "@/lib/prisma";
// import {currentDeploymentEnv} from "@/lib/current-deployment-env"; // Not strictly needed anymore here

export interface LLMProviderModel {
    id: string
    name: string
}

export interface LLMProviderModelListResponse {
    llmProviderModels: LLMProviderModel[]
}

export async function GET(
    req: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const {id} = await params;
    const llmProvider = await prisma.lLMProvider.findUniqueOrThrow({
        where: {id}
    });

    // Explicitly check if it's the Ollama provider
    if (llmProvider.providerId === "ollama") {
        try {
            // Use configured URL or default
            const ollamaApiUrl = llmProvider.apiURL || "http://ollama:11434";
            const listModelsUrl = new URL("/api/tags", ollamaApiUrl).toString();

            const response = await fetch(listModelsUrl);

            if (!response.ok) {
                // Log error and return empty list or specific error response
                console.error(`Ollama API request failed: ${response.status} ${response.statusText}`);
                const errorBody = await response.text();
                console.error("Ollama Error Body:", errorBody);
                return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: response.status });
            }

            const data = await response.json();

            // Validate response structure
            if (!data || !Array.isArray(data.models)) {
                 console.error("Invalid response structure from Ollama /api/tags");
                 return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: 500 });
            }

            // Map models correctly
            const models: LLMProviderModel[] = data.models.map(
                 // Type assertion for clarity, adjust if Ollama model structure differs
                (model: { name: string, model: string }) => ({ id: model.model, name: model.name })
            );

            return NextResponse.json<LLMProviderModelListResponse>({
                llmProviderModels: models,
            });

        } catch (error: unknown) {
            // Catch fetch errors or other unexpected errors
            console.error(`Error fetching models from Ollama (${llmProvider.apiURL || 'default'}):`, error);
            return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: 500 });
        }
    } else {
        // Handle non-Ollama providers if necessary, or return error/empty
        console.warn(`[API LLM Models] Provider ID '${llmProvider.providerId}' is not Ollama.`);
        return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, {status: 404}); // Not Found or Bad Request?
    }
}
