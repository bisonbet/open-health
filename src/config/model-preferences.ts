export interface ModelPreference {
    id: string;
    name: string;
}

// List of preferred models for chat, in order of preference
export const CHAT_MODEL_PREFERENCES: ModelPreference[] = [
    { id: "deepseek-r1:32b", name: "DeepSeek R1 32B" },
    { id: "qwen3:30b-a3b", name: "Qwen 3 30B A3B" },
    { id: "gemma3:27b", name: "Gemma 3 27B" }
];

// List of preferred models for vision/document parsing, in order of preference
export const VISION_MODEL_PREFERENCES: ModelPreference[] = [
    { id: "gemma3:27b", name: "Gemma 3 27B" },
    { id: "gemma3:12b", name: "Gemma 3 12B" },
    { id: "gemma3:4b", name: "Gemma 3 4B" }
];

// Helper function to get the first available model from a list of preferences
export async function getFirstAvailableModel(preferences: ModelPreference[]): Promise<ModelPreference | null> {
    const ollamaApiUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://ollama:11434";
    
    try {
        const response = await fetch(`${ollamaApiUrl}/api/tags`);
        if (!response.ok) {
            console.error(`Failed to fetch models from Ollama: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const availableModels = new Set(data.models.map((m: { model: string }) => m.model));

        // Find the first preferred model that is available
        for (const preference of preferences) {
            if (availableModels.has(preference.id)) {
                return preference;
            }
        }

        // If no preferred model is available, return the first available model
        if (data.models.length > 0) {
            const firstModel = data.models[0];
            return { id: firstModel.model, name: firstModel.name };
        }

        return null;
    } catch (error) {
        console.error('Error checking available models:', error);
        return null;
    }
} 