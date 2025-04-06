import { BaseMessagePromptTemplateLike } from "@langchain/core/prompts";

export interface MessagePayload {
    context?: string; // Parsed text
    image_data?: string; // Base64 encoded image data
}

const prompts: {
    [key: string]: BaseMessagePromptTemplateLike[]
} = {
    // <<< --- REVISED 'both' PROMPT --- >>>
    both: [
        [
            "human",
            `You are a highly precise health data analyst. Your task is to extract test results from BOTH text and image data, cross-validate them, and output them in a **strict JSON format**.

**Critical Output Format Requirements:**
1.  The entire output MUST be a single JSON object.
2.  The JSON object MUST have a single top-level key named EXACTLY \`test_result\`.
3.  The value of \`test_result\` MUST be an object.
4.  Inside \`test_result\`, EVERY key MUST be the **snake_case** name of the test. Use snake_case ONLY. Do NOT use CamelCase or Title Case.
5.  The value for each snake_case test key MUST be an object with EXACTLY two keys: \`value\` (as a string) and \`unit\` (as a string or null). For example, the structure has keys 'value' and 'unit' like in "value": "122", "unit": "mg/dL" . Do NOT use plain numbers or strings as values.
6.  If no valid results are found, \`test_result\` should be an empty object.

**Step-by-Step Extraction and Validation Process:**

Step 1: Independent Extraction
*   Analyze the provided image data. Extract all identifiable test names, their values, and units.
*   Analyze the provided parsed text ({context}). Extract all identifiable test names, their values, and units.

Step 2: Cross-Validation and Prioritization
*   Compare the results from the image and the text.
*   If the parsed text shows signs of errors (e.g., broken numbers, strange characters, nonsensical values), **prioritize the data extracted from the image** for that specific test.
*   If the image data is unclear or unreadable (e.g., blurry text, cut-off values), **prioritize the data from the parsed text** if it appears clean and correct for that specific test.
*   If both sources seem reliable but differ, use your best judgment to select the most likely correct value, prioritizing clarity and completeness.

Step 3: Handle Special Cases
*   For multi-component tests (e.g., blood pressure), create **separate snake_case keys** with their respective values formatted using the required value/unit object structure.
*   If tests are labeled (e.g., left/right), incorporate this into the snake_case key if appropriate (e.g., \`left_vision\`, \`right_vision\`).

Step 4: Final JSON Construction
*   Consolidate the validated and prioritized results.
*   Ensure every result is placed inside the \`test_result\` object.
*   Verify that all keys inside \`test_result\` are **snake_case**.
*   Verify that all values inside \`test_result\` are objects in the required value/unit format.
*   Remove duplicate tests. If a test appears multiple times, select the single most accurate validated value.

**Final Reminder:** Adherence to the specified JSON structure (\`test_result\` key, snake_case inner keys, value/unit objects) is paramount. Double-check your final JSON output before finishing.`
        ],
        ["human", 'This is the parsed text:\n{context}'],
        ["human", [{ type: "image_url", image_url: { url: '{image_data}' } }]],
    ],

    // <<< --- REVISED 'onlyText' PROMPT --- >>>
    onlyText: [
        [
            "human",
            `As a precise health data analyst focus on accurately extracting test results from the parsed text of the health report.
Your primary goal is to output a JSON object adhering strictly to the specified format.

**Required Output Format:**
1.  The entire output MUST be a single JSON object.
2.  The JSON object MUST have a single top-level key named EXACTLY \`test_result\`.
3.  The value of \`test_result\` MUST be an object containing the extracted test results.
4.  Inside \`test_result\`, EVERY key MUST be the **snake_case** name of the test. Use snake_case ONLY.
5.  The value for each snake_case test key MUST be an object containing EXACTLY \`value\` (string) and \`unit\` (string or null) keys (e.g., having keys 'value' and 'unit' like in  "value": "122", "unit": "mg/dL" ). Do NOT use plain numbers/strings.
6.  If no results are found, \`test_result\` MUST be an empty object.

**Extraction Guidelines:**
1.  Extract only the actual test results from the text. Ignore reference ranges or irrelevant text/numbers.
2.  For multi-component tests (e.g., blood pressure), create separate **snake_case** keys with their values formatted using the required value/unit object structure.
3.  Ensure results are correctly labeled (e.g., left/right) if applicable, incorporating this into the snake_case key if necessary.
4.  Avoid duplicate test keys within \`test_result\`.

**Final Check:** Ensure the final JSON strictly follows the format described above: \`test_result\` key, **snake_case** inner keys, and value/unit objects inside.`
        ],
        ["human", 'This is the parsed text:\n{context}']
    ],

    // <<< --- REVISED 'onlyImage' PROMPT --- >>>
    onlyImage: [
        [
            "human",
            `As a precise health data analyst, your task is to accurately extract test results ONLY from the provided image data and format them into a **strict JSON structure**.

**Critical Output Format Requirements:**
1.  The entire output MUST be a single JSON object.
2.  The JSON object MUST have a single top-level key named EXACTLY \`test_result\`.
3.  The value of \`test_result\` MUST be an object.
4.  Inside \`test_result\`, EVERY key MUST be the **snake_case** name of the test. Use snake_case ONLY.
5.  The value for each snake_case test key MUST be an object with EXACTLY two keys: \`value\` (as a string) and \`unit\` (as a string or null). For example, the structure has keys 'value' and 'unit' like in "value": "122", "unit": "mg/dL" . Do NOT use plain numbers or strings as values.
6.  If no valid results are found, \`test_result\` MUST be an empty object.

**Extraction Guidelines (Image Only):**
1.  Carefully analyze the image to identify test names, values, and units. Be mindful of potential OCR inaccuracies.
2.  Extract only the actual test results. Do not extract reference ranges or other non-result text/numbers.
3.  For multi-component tests (e.g., blood pressure), create separate **snake_case** keys with their values formatted using the required value/unit object structure.
4.  Ensure results are correctly labeled (e.g., left/right) if applicable, incorporating this into the snake_case key if necessary.
5.  Avoid duplicate test keys within \`test_result\`. If a test appears multiple times, select the clearest reading.

**Final Check:** Ensure the final JSON strictly follows the format described: \`test_result\` key, **snake_case** inner keys, and value/unit objects inside.`
        ],
        ["human", [{ type: "image_url", image_url: { url: '{image_data}' } }]],
    ]
};

/**
 * Get the appropriate prompt based on the input type
 *
 * @param excludeImage
 * @param excludeText
 */
export function getParsePrompt({ excludeImage, excludeText }: {
    excludeImage: boolean,
    excludeText: boolean
}): BaseMessagePromptTemplateLike[] {
    if (!excludeImage && !excludeText) {
        return prompts.both
    } else if (excludeImage && !excludeText) {
        return prompts.onlyText
    } else if (!excludeImage && excludeText) {
        return prompts.onlyImage
    } else {
        throw new Error('Invalid prompt type')
    }
}
