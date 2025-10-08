import { GenerateContentResponse, Type } from "@google/genai";
import { ai } from "./geminiClient";
import { DesignBrief, DesignConcept, DesignType, TextLayer } from "../types";
import { DESIGN_KEYWORDS, getAvailableColorPalettes, TONE_AND_MANNERS } from "../constants";
import { KOREAN_FONTS_LIST } from "../components/fonts";

const COPY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        bodyText: {
            type: Type.STRING,
            description: "Compelling body text for the design. Could be a slogan, a description, or a list of services. Should be concise and impactful. Use newline characters (\\n) for line breaks."
        },
        contactInfo: {
            type: Type.STRING,
            description: "Well-formatted contact information. Include placeholders if specific info isn't provided. Use newline characters (\\n) for line breaks. Example: 'Tel: 010-1234-5678\\nEmail: contact@example.com'"
        },
    },
    required: ['bodyText', 'contactInfo']
};

export const generateDesignCopy = async (designBrief: DesignBrief): Promise<{ bodyText: string; contactInfo: string }> => {
    const toneAndMannerDesc = TONE_AND_MANNERS[designBrief.toneAndManner] || 'professional';
    
    const refinementInstruction = (designBrief.bodyText || designBrief.contactInfo) 
        ? `The user has provided some initial text. Your task is to refine and improve it, or provide a completely new, better alternative if the existing text is weak.
        - Existing Body Text: "${designBrief.bodyText}"
        - Existing Contact Info: "${designBrief.contactInfo}"`
        : `Your task is to generate compelling "body text" and "contact information" from scratch.`;

    const prompt = `
        You are an expert copywriter creating content for a design project.

        **Project Details:**
        - **Title:** ${designBrief.title}
        - **Subtitle:** ${designBrief.subtitle || 'Not provided'}
        - **Core Keywords:** ${designBrief.keywords.join(', ')}
        - **Desired Tone & Manner:** ${toneAndMannerDesc}

        **Instructions:**
        1.  ${refinementInstruction}
        2.  Based on the project details, write a concise and effective **body text**. This could be a slogan, a short description, key features, or an event detail. It should be engaging and fit the specified tone.
        3.  Create a well-formatted **contact information** block. If specific details are missing, use logical placeholders like '전화번호' (Phone Number), '주소' (Address), '웹사이트' (Website), etc.
        4.  Use newline characters (\\n) for clear line breaks in both fields.
        5.  Your response MUST be a JSON object conforming to the provided schema. Do not include any other text or explanations.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: COPY_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON parsing error in generateDesignCopy. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error generating design copy:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to generate AI copy. The model may have returned an invalid format.");
    }
};

const BRIEF_EXPANSION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy and professional title for the design project based on the user's idea." },
        subtitle: { type: Type.STRING, description: "A supportive subtitle that complements the title." },
        bodyText: { type: Type.STRING, description: "A well-written, concise body text or slogan for the design. Use newline characters (\\n) for line breaks." },
        contactInfo: { type: Type.STRING, description: "Formatted contact information with logical placeholders if details are missing. Use newline characters (\\n) for line breaks." },
        keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 3 relevant keywords from the provided list that best capture the essence of the idea."
        },
        colorPalette: {
            type: Type.STRING,
            description: "The most fitting color palette for this concept from the provided list."
        },
        toneAndManner: {
            type: Type.STRING,
            description: "The most fitting tone and manner for this concept from the provided list."
        },
        fontFamily: {
            type: Type.STRING,
            description: "The most appropriate font family for the main title from the provided list."
        }
    },
    required: ['title', 'subtitle', 'bodyText', 'contactInfo', 'keywords', 'colorPalette', 'toneAndManner', 'fontFamily']
};


export const expandBriefFromIdea = async (
    idea: string, 
    designType: DesignType, 
    imageBase64?: string,
    mimeType?: string
): Promise<DesignBrief> => {
    
    const imageInstruction = imageBase64 
        ? `**Reference Image:** An image is provided to show the desired visual style. You MUST analyze it to inform your choices.`
        : `**Reference Image:** No image provided. Make creative choices based on the text alone.`;

    const prompt = `
        You are an expert Creative Director. A user has provided a simple idea for a specific design type, and optionally a reference image. Your task is to expand this into a complete, professional design brief by analyzing both inputs.

        **User's Idea (Text):** "${idea}"
        **Design Type:** "${designType}"
        ${imageInstruction}

        **Available Options for your response (You MUST choose from these lists):**
        - **Keywords:** ${DESIGN_KEYWORDS.join(', ')}
        - **Color Palettes:** ${Object.keys(getAvailableColorPalettes()).join(', ')}
        - **Tone & Manner:** ${Object.keys(TONE_AND_MANNERS).join(', ')}
        - **Font Families:** ${KOREAN_FONTS_LIST.map(f => f.name).join(', ')}

        **Instructions:**
        1.  **Analyze the Text:** Extract key information from the user's idea: product/event name, purpose, dates, locations, special offers, etc.
        2.  **Analyze the Image (if provided):**
            -   **Visual Style:** Is it modern, minimalist, retro, elegant? This informs your choice of 'keywords' and 'toneAndManner'.
            -   **Color Palette:** Identify the dominant colors. Choose the CLOSEST matching palette from the 'Color Palettes' list.
            -   **Typography:** What is the feeling of the fonts used (e.g., bold sans-serif, delicate serif, handwritten)? Choose the BEST matching font from the 'Font Families' list for the main headline.
        3.  **Synthesize and Generate:** Combine your analysis of both text and image to create the final brief.
            -   Create a compelling **title** and **subtitle** using the extracted information.
            -   Write a concise and effective **bodyText** and **contactInfo**, using extracted details and adding logical placeholders (e.g., '연락처', '웹사이트') where needed. Use '\\n' for line breaks.
            -   If the user's text implies a coupon (e.g., "쿠폰을 추가해줘"), add a coupon section to the bodyText like "\\n\\n[하단 쿠폰 영역]\\n- 아메리카노 1잔 무료\\n- 사용기한: ~12/31".
            -   Select exactly 3 of the most relevant **keywords**.
            -   Select the most fitting **colorPalette**, **toneAndManner**, and **fontFamily**.
        4.  **Output Format:** Your response MUST be a single JSON object that strictly conforms to the provided schema. Do not include any other text, markdown, or explanations.
    `;

    const parts: any[] = [{ text: prompt }];
    if (imageBase64 && mimeType) {
        parts.push({ inlineData: { data: imageBase64, mimeType } });
    }

     try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: BRIEF_EXPANSION_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON parsing error in expandBriefFromIdea. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error expanding brief from idea:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to generate AI brief. The model may have returned an invalid format.");
    }
};

const CONCEPTS_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A catchy and creative title for the design concept." },
            subtitle: { type: Type.STRING, description: "A supportive subtitle that complements the title." },
            description: { type: Type.STRING, description: "A brief, one-sentence explanation of the concept's creative direction in Korean." },
            keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of up to 3 relevant keywords from the provided list."
            },
            toneAndManner: {
                type: Type.STRING,
                description: "The most fitting tone and manner for this concept from the provided list."
            }
        },
        required: ['title', 'subtitle', 'description', 'keywords', 'toneAndManner']
    }
};

export const generateDesignConcepts = async (idea: string): Promise<DesignConcept[]> => {
    const prompt = `
        You are a brilliant Creative Director specializing in branding and marketing. Your task is to brainstorm three distinct and compelling design concepts based on a user's simple idea.

        **User's Idea:** "${idea}"

        **Your Task:**
        Generate an array of 3 unique JSON objects, each representing a design concept.

        **Available Options for your response:**
        - **Keywords:** ${Object.keys(DESIGN_KEYWORDS).join(', ')}
        - **Tone & Manner:** ${Object.keys(TONE_AND_MANNERS).join(', ')}

        **Instructions:**
        1.  For each concept, create a catchy **title** and a supportive **subtitle** in Korean.
        2.  Write a short **description** (in Korean, 1-2 sentences) explaining the creative direction and target audience for each concept.
        3.  Select up to 3 relevant **keywords** for each concept from the provided list.
        4.  Select the most fitting **toneAndManner** for each concept from the provided list.
        5.  Your entire response MUST be a single JSON object (an array) that strictly conforms to the provided schema. Do not include any other text, markdown, or explanations.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: CONCEPTS_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON parsing error in generateDesignConcepts. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error generating design concepts:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to generate AI concepts. The model may have returned an invalid format.");
    }
};

export const generateAltText = async (base64ImageData: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: base64ImageData, mimeType: 'image/png' } };
        const textPart = { text: "시각 장애 사용자를 위해 이 이미지에 대한 간결하고 설명적인 대체 텍스트를 한국어로 제공해주세요." };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating alt text:', error);
        throw new Error("Failed to generate alt text.");
    }
};

const FONT_SUGGESTION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        fontFamily: { type: Type.STRING, description: "The name of the suggested font from the provided list." },
        fontWeight: { type: Type.NUMBER, description: "The suggested numeric font weight available for the chosen font." },
    },
    required: ['fontFamily', 'fontWeight']
};

export const suggestFont = async (
    targetLayer: TextLayer, 
    allLayers: TextLayer[], 
    designBrief: DesignBrief
): Promise<{fontFamily: string; fontWeight: number;}> => {
    const otherLayers = allLayers.filter(l => l.id !== targetLayer.id);
    const prompt = `
        You are an expert typographer. Your task is to suggest a font family and weight for a specific text layer within a design, ensuring it creates a harmonious and effective hierarchy with other text elements.

        **Design Brief:**
        - **Tone & Manner:** ${TONE_AND_MANNERS[designBrief.toneAndManner]}
        - **Keywords:** ${designBrief.keywords.join(', ')}

        **Target Layer to Improve:**
        - **Current Content:** "${targetLayer.content}"
        - **Description:** This layer appears to be a ${targetLayer.fontSize > 40 ? 'main title or headline' : targetLayer.fontSize > 20 ? 'subtitle or subheading' : 'body text or caption'}.
        - **Current Font:** ${targetLayer.fontFamily} at ${targetLayer.fontWeight} weight.

        **Other Text Layers for Context:**
        ${JSON.stringify(otherLayers.map(l => ({ content: l.content, font: l.fontFamily, size: l.fontSize })), null, 2)}

        **Available Fonts and Their Characteristics:**
        ${JSON.stringify(KOREAN_FONTS_LIST.map(f => ({ name: f.name, weights: f.weights, style: f.style, description: f.description })), null, 2)}
        
        **Instruction:**
        Based on all the provided information, choose the BEST font family and an appropriate font weight from the "Available Fonts" list for the "Target Layer". Your choice should enhance readability and align with the overall design brief. Return your suggestion as a JSON object.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: FONT_SUGGESTION_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON parsing error in suggestFont. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error suggesting font:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to suggest font.");
    }
};

const TEXT_REFINEMENT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        refinedText: {
            type: Type.STRING,
            description: "The improved and refined version of the user's text, based on their instruction."
        }
    },
    required: ['refinedText']
};

export const refineTextContent = async (textToRefine: string, instruction: string): Promise<string> => {
    const prompt = `
        You are an expert copywriter. A user wants to refine a piece of text based on their instruction.

        **Original Text:**
        "${textToRefine}"

        **User's Instruction:**
        "${instruction}"

        **Your Task:**
        Rewrite the "Original Text" according to the "User's Instruction". The new text should be well-written, clear, and fulfill the user's goal.
        Return the result as a JSON object with a single key "refinedText".
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: TEXT_REFINEMENT_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            const result = JSON.parse(jsonString);
            return result.refinedText || textToRefine;
        } catch (parseError) {
            console.error("JSON parsing error in refineTextContent. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error refining text content:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to refine text content.");
    }
};