import { GenerateContentResponse, Modality, Type } from "@google/genai";
import { ai } from "./geminiClient";
import { processChromaKeyTransparency } from "../vicEdit/utils";

const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '3:4') => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("Image generation failed, no image returned.");
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
};

export const generateInArea = async (prompt: string, width: number, height: number): Promise<string> => {
    const aspectRatioValue = width / height;
    const supportedRatios = {
        '1:1': 1, '3:4': 0.75, '4:3': 1.333, '9:16': 0.5625, '16:9': 1.777
    };
    
    let closestRatio: keyof typeof supportedRatios = '1:1';
    let minDiff = Infinity;

    for (const key in supportedRatios) {
        const ratio = supportedRatios[key as keyof typeof supportedRatios];
        const diff = Math.abs(aspectRatioValue - ratio);
        if (diff < minDiff) {
            minDiff = diff;
            closestRatio = key as keyof typeof supportedRatios;
        }
    }

    try {
        const fullPrompt = `Create a high-quality, photorealistic image based on the user's prompt: "${prompt}". 
        The image should be self-contained and fit well within its boundaries. 
        Do not include any text unless explicitly requested.`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: closestRatio,
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("Image generation for area failed, no image returned.");
    } catch (error) {
        console.error('Error generating image in area:', error);
        throw error;
    }
};

const editImageWithText = async (prompt: string, imageBase64: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
        const textPart = { text: prompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("AI image generation from image failed, no image was returned in the response.");
    } catch (error) {
        console.error('Error generating image from image and text:', error);
        throw error;
    }
};

export const generateDesignElement = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = `Create a high-quality, simple, flat, vector-style icon based on the following request: "${prompt}".
        - The background MUST be a solid, vibrant green color screen (#00FF00). The background must not contain any other patterns or colors.
        - The icon should be modern, clean, and suitable for a graphic design project.
        - Avoid complex details, text, letters, or numbers.
        - The main object should be centered.`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const greenScreenedBase64 = response.generatedImages[0].image.imageBytes;
            // Post-process to make the green background transparent
            const finalBase64 = await processChromaKeyTransparency(
                `data:image/png;base64,${greenScreenedBase64}`,
                { r: 0, g: 255, b: 0 },
                40 // Tolerance for anti-aliasing and color variations
            );
            // Return only the base64 part
            return finalBase64.split(',')[1];
        }
        throw new Error("AI Element generation failed, no image was returned.");
    } catch (error) {
        console.error('Error generating AI element:', error);
        throw error;
    }
};

export const searchImages = async (query: string): Promise<string[]> => {
    const prompt = `A professional, high-quality, photorealistic stock photo for a marketing campaign. The photo should represent: "${query}".
    - Style: Clean, modern, well-lit, visually appealing.
    - IMPORTANT: Do NOT include any text, letters, logos, or watermarks in the image.`;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 4,
                outputMimeType: 'image/png',
                aspectRatio: '4:3',
            },
        });
        
        return response.generatedImages?.map(img => img.image.imageBytes) || [];
    } catch (error) {
        console.error('Error searching images:', error);
        throw error;
    }
};

export const editBackgroundImage = async (base64ImageData: string, prompt: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: 'image/png', // Assuming PNG from previous steps
            },
        };
        const textPart = { text: prompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("AI image editing failed, no image was returned in the response.");
    } catch (error) {
        console.error('Error editing background image:', error);
        throw error;
    }
};

export const removeBackgroundImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: 'Analyze the main subject of this image. Your task is to create a new version where the original background is completely replaced with a solid, vibrant green color screen (#00FF00). The subject must be perfectly preserved with clean, anti-aliased edges. The background MUST be ONLY the color #00FF00 green, with no other patterns or colors. Only return the edited image.',
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const greenScreenedBase64 = part.inlineData.data;
                // Post-process the image to make the green background transparent
                const finalBase64 = await processChromaKeyTransparency(
                    `data:image/png;base64,${greenScreenedBase64}`,
                    { r: 0, g: 255, b: 0 },
                    40 // Tolerance for anti-aliasing
                );
                return finalBase64.split(',')[1];
            }
        }
        throw new Error("Background removal failed, no image was returned in the response.");
    } catch (error) {
        console.error('Error removing background:', error);
        throw error;
    }
};

export const extractCleanBackground = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = `Analyze this image and identify the main foreground subjects (people, objects, prominent text). Your task is to remove these foreground subjects completely and intelligently fill in the erased areas using the surrounding background textures and patterns (inpainting). The result should be a clean, realistic background image with no trace of the original subjects. Return only the final background image.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [
                { inlineData: { data: base64ImageData, mimeType } },
                { text: prompt },
            ]},
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("AI background extraction failed, no image was returned.");
    } catch (error) {
        console.error('Error with AI background extraction:', error);
        throw error;
    }
};

const COLOR_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        colors: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "A hexadecimal color code string." },
            description: "An array of 4-5 dominant hexadecimal color codes from the image."
        }
    },
    required: ['colors']
};

export const extractColorsFromImage = async (base64ImageData: string): Promise<string[]> => {
    try {
        const imagePart = { inlineData: { data: base64ImageData, mimeType: 'image/png' } };
        const textPart = { text: "이 이미지를 분석하고 가장 지배적이고 대표적인 색상 4-5개를 추출합니다. JSON 객체에 16진수 색상 코드 배열로 반환합니다." };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: COLOR_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        try {
            const result = JSON.parse(jsonString);
            const colors: string[] = result.colors || [];
            // Validate that the returned colors are valid hex codes
            return colors.filter(color => /^#[0-9A-F]{6}$/i.test(color));
        } catch (parseError) {
            console.error("JSON parsing error in extractColorsFromImage. Raw response:", jsonString);
            throw new Error("AI 응답이 잘못된 JSON 형식입니다.");
        }
    } catch (error) {
        console.error('Error extracting colors from image:', error);
        if (error instanceof Error && error.message.includes("JSON")) {
            throw error;
        }
        throw new Error("Failed to extract colors from image.");
    }
};

export const cropImageWithAI = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = 'Identify the main subject of this image. Your task is to create a new, tightly cropped version focusing on this subject. The background of the new image must be completely replaced with a solid, vibrant green color screen (#00FF00). The subject must be perfectly preserved with clean, anti-aliased edges against the green background. The background MUST be ONLY the color #00FF00 green. Return only the final, cropped image.';
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [
                { inlineData: { data: base64ImageData, mimeType } },
                { text: prompt },
            ]},
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const greenScreenedBase64 = part.inlineData.data;
                const finalBase64 = await processChromaKeyTransparency(
                    `data:image/png;base64,${greenScreenedBase64}`,
                    { r: 0, g: 255, b: 0 },
                    40 // Tolerance
                );
                return finalBase64.split(',')[1];
            }
        }
        throw new Error("AI smart crop failed, no image was returned.");
    } catch (error) {
        console.error('Error with AI smart crop:', error);
        throw error;
    }
};

export const expandImageWithAI = async (
    base64ImageData: string, 
    mimeType: string, 
    targetWidth: number, 
    targetHeight: number, 
    prompt: string
): Promise<string> => {
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = `data:${mimeType};base64,${base64ImageData}`;
        });

        const { naturalWidth, naturalHeight } = img;
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        // Draw original image in the center of the new larger canvas
        const drawX = (targetWidth - naturalWidth) / 2;
        const drawY = (targetHeight - naturalHeight) / 2;
        ctx.drawImage(img, drawX, drawY, naturalWidth, naturalHeight);

        // Get the base64 of the composite image (original image on a transparent larger canvas)
        const compositeBase64 = canvas.toDataURL('image/png').split(',')[1];

        const fullPrompt = `You are an AI image editor performing an 'outpainting' task. The user has provided an image placed on a larger transparent canvas. 
        Your task is to fill in the surrounding transparent area, seamlessly extending the original image to create a larger, complete picture. 
        You must match the style, lighting, and content of the original image perfectly. The final image should have no transparency.
        Here is the user's specific instruction for the expansion: "${prompt || 'Continue the image naturally in all directions.'}"`;

        const imagePart = { inlineData: { data: compositeBase64, mimeType: 'image/png' } };
        const textPart = { text: fullPrompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("AI image expansion failed, no image was returned in the response.");

    } catch (error) {
        console.error("Error in expandImageWithAI:", error);
        throw new Error("Failed to expand image with AI.");
    }
};

// Exporting internal functions for use in designService
export { generateImage, editImageWithText };