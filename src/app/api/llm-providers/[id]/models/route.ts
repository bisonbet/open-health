import {NextResponse} from "next/server";
import {auth} from "@/auth";

export interface LLMProviderModel {
    id: string
    name: string
}

export interface LLMProviderModelListResponse {
    llmProviderModels: LLMProviderModel[]
}

export async function GET() {
    const session = await auth()
    if (!session || !session.user) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401})
    }

    try {
        const ollamaApiUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://ollama:11434";
        const listModelsUrl = new URL("/api/tags", ollamaApiUrl).toString();

        console.log(`Attempting to fetch models from Ollama at: ${listModelsUrl}`);
        const response = await fetch(listModelsUrl);

        if (!response.ok) {
            console.error(`Ollama API request failed: ${response.status} ${response.statusText}`);
            const errorBody = await response.text();
            console.error("Ollama Error Body:", errorBody);
            return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: response.status });
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.models)) {
            console.error("Invalid response structure from Ollama /api/tags");
            return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: 500 });
        }

        const models: LLMProviderModel[] = data.models.map(
            (model: { name: string, model: string }) => ({ id: model.model, name: model.name })
        );

        return NextResponse.json<LLMProviderModelListResponse>({
            llmProviderModels: models,
        });

    } catch (error: unknown) {
        console.error(`Error fetching models from Ollama:`, error);
        return NextResponse.json<LLMProviderModelListResponse>({ llmProviderModels: [] }, { status: 500 });
    }
}
