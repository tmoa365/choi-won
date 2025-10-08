import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { DesignBrief, DesignPage, DesignType, TextLayer, ImageLayer, ShapeLayer, DesignConcept, DesignProject, DesignDocument, ImageAsset, GenerationOption, AllLayer, BrandKit } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DESIGN_KEYWORDS, MATERIAL_DIMENSIONS, TONE_AND_MANNERS, getAvailableColorPalettes } from "../constants";
import { mmToPx, ptToPx, fileToDataURL } from "../vicEdit/utils";
import { BANNER_DESIGN_PRINCIPLES, BUSINESS_CARD_BACK_PRINCIPLES, BUSINESS_CARD_FRONT_PRINCIPLES } from "../components/designPrinciples";
import { KOREAN_FONTS_LIST } from "../components/fonts";


const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const tmoaStudio = new GoogleGenAI({ apiKey: API_KEY });

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
        : `Your task is to generate compelling "body text" and formatted "contact information" from scratch.`;

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
        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: COPY_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error generating design copy:', error);
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


export const expandBriefFromIdea = async (idea: string, designType: DesignType, context: Record<string, string> = {}): Promise<DesignBrief> => {
    
    const contextString = Object.entries(context).filter(([, value]) => value).map(([key, value]) => `- ${key}: ${value}`).join('\n');

    const prompt = `
        You are an expert Creative Director. A user has provided a simple idea for a specific design type and some context. Your task is to expand this into a complete, professional design brief.

        **User's Idea:** "${idea}"
        **Design Type:** "${designType}"
        **User-provided Information:**
        ${contextString || "No specific information provided yet."}

        **Available Options for your response:**
        - **Keywords:** ${DESIGN_KEYWORDS.join(', ')}
        - **Color Palettes:** ${Object.keys(getAvailableColorPalettes()).join(', ')}
        - **Tone & Manner:** ${Object.keys(TONE_AND_MANNERS).join(', ')}
        - **Font Families:** ${KOREAN_FONTS_LIST.map(f => f.name).join(', ')}

        **Instructions:**
        1.  Analyze the user's idea, design type, and provided information to understand the subject, purpose, and audience.
        2.  Create a compelling **title** and **subtitle**. These MUST incorporate the user's information. For example, if the design type is a business card and the user provided a name and title, use those.
        3.  Write a concise and effective **bodyText** and **contactInfo**, using the user's information and adding logical placeholders where needed. Use '\\n' for line breaks.
        4.  Select exactly 3 of the most relevant **keywords** from the list.
        5.  Select the most fitting **colorPalette**, **toneAndManner**, and **fontFamily** from the provided lists.
        6.  Your response MUST be a single JSON object that strictly conforms to the provided schema. Do not include any other text, markdown, or explanations.
    `;

     try {
        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: BRIEF_EXPANSION_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error expanding brief from idea:', error);
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
        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: CONCEPTS_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error generating design concepts:', error);
        throw new Error("Failed to generate AI concepts. The model may have returned an invalid format.");
    }
};


const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '3:4') => {
    try {
        const response = await tmoaStudio.models.generateImages({
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

        const response = await tmoaStudio.models.generateImages({
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


const generateImageFromImageAndText = async (prompt: string, imageBase64: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
        const textPart = { text: prompt };

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
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
        throw new Error("AI image generation from image failed, no image was returned.");
    } catch (error) {
        console.error('Error generating image from image and text:', error);
        throw error;
    }
};

export const generateDesignElement = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = `Create a high-quality, simple, flat, vector-style icon based on the following request: "${prompt}".
        - The background MUST be transparent (real alpha channel).
        - CRITICAL: Do NOT draw a checkerboard pattern to simulate transparency. The background must not contain any patterns.
        - The icon should be modern, clean, and suitable for a graphic design project.
        - Avoid complex details, text, letters, or numbers.
        - The main object should be centered.`;

        const response = await tmoaStudio.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("AI Element generation failed, no image was returned.");
    } catch (error) {
        console.error('Error generating AI element:', error);
        throw error;
    }
};


const LAYOUT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        textLayers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, 
                    name: { type: Type.STRING, description: "A short, descriptive name for the layer, e.g., 'Main Title' or 'Logo'." },
                    content: { type: Type.STRING },
                    top: { type: Type.NUMBER }, left: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    fontSize: { type: Type.NUMBER }, 
                    fontWeight: { type: Type.NUMBER, description: "A numeric font weight, e.g., 400 for normal, 700 for bold. Must be a weight available for the chosen fontFamily." },
                    fontStyle: { type: Type.STRING, enum: ['normal', 'italic'], description: "Font style, 'normal' or 'italic'."},
                    textDecoration: { type: Type.STRING, enum: ['none', 'underline'], description: "Text decoration, 'none' or 'underline'."},
                    color: { type: Type.STRING }, textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                    fontFamily: { type: Type.STRING, description: "The font name. Must be one of the provided font names in the list." }, 
                    rotation: { type: Type.NUMBER }, opacity: { type: Type.NUMBER },
                    letterSpacing: { type: Type.NUMBER, description: "The letter spacing in pixels." },
                    lineHeight: { type: Type.NUMBER, description: "The line height as a multiplier (e.g., 1.5)." },
                    effect: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['none', 'shadow', 'lift', 'stroke', 'neon'] },
                            color: { type: Type.STRING },
                            offset: { type: Type.NUMBER },
                            direction: { type: Type.NUMBER },
                            blur: { type: Type.NUMBER },
                            transparency: { type: Type.NUMBER },
                            intensity: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                        }
                    }
                },
                required: ['id', 'name', 'content', 'top', 'left', 'width', 'height', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'color', 'textAlign', 'fontFamily', 'rotation', 'opacity']
            }
        },
        imageLayers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, 
                    name: { type: Type.STRING, description: "A short, descriptive name for the layer, e.g., 'Main Title' or 'Logo'." },
                    assetId: { type: Type.STRING },
                    top: { type: Type.NUMBER }, left: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    rotation: { type: Type.NUMBER }, opacity: { type: Type.NUMBER },
                },
                required: ['id', 'name', 'assetId', 'top', 'left', 'width', 'height', 'rotation', 'opacity']
            }
        },
        shapeLayers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING, description: "A short, descriptive name for the layer, e.g., 'Main Title' or 'Logo'." },
                    type: { type: Type.STRING, enum: ['rectangle', 'circle', 'line'] },
                    top: { type: Type.NUMBER }, left: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    rotation: { type: Type.NUMBER }, 
                    fill: { type: Type.STRING, description: "The fill color as a hex string, e.g., '#FFFFFF'." }, 
                    strokeColor: { type: Type.STRING },
                    strokeWidth: { type: Type.NUMBER }, 
                    opacity: { type: Type.NUMBER },
                    borderRadius: { type: Type.NUMBER, description: "The corner radius in pixels for rectangles." },
                },
                required: ['id', 'name', 'type', 'top', 'left', 'width', 'height', 'rotation', 'fill', 'strokeColor', 'strokeWidth', 'opacity']
            }
        }
    },
    required: ['textLayers', 'imageLayers', 'shapeLayers']
};

const generateLayoutFromPrompt = async (prompt: string, imageBase64?: string): Promise<{ textLayers: TextLayer[]; imageLayers: ImageLayer[]; shapeLayers: ShapeLayer[] }> => {
    try {
        const parts: ({ text: string; } | { inlineData: { mimeType: string; data: string; }; })[] = [{ text: prompt }];
        if (imageBase64) {
            parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
        }

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: LAYOUT_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        const jsonResponse = JSON.parse(jsonString);
        
        const ensureLayerDefaults = (layer: any) => ({
            ...layer,
            isVisible: true,
            isLocked: false,
        });
        
         const ensureTextDefaults = (layer: any) => ({
            ...layer,
            fontStyle: layer.fontStyle || 'normal',
            textDecoration: layer.textDecoration || 'none'
        });

        return {
            textLayers: (jsonResponse.textLayers || []).map(ensureLayerDefaults).map(ensureTextDefaults),
            imageLayers: (jsonResponse.imageLayers || []).map(ensureLayerDefaults),
            shapeLayers: (jsonResponse.shapeLayers || []).map(ensureLayerDefaults)
        };
    } catch (error) {
        console.error('Error generating layout:', error);
        throw error;
    }
};

const getAspectRatio = (type: DesignType): '1:1' | '3:4' | '16:9' | '4:3' | '9:16' => {
    const dims = MATERIAL_DIMENSIONS[type];
    const ratio = dims.width_mm / dims.height_mm;
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - (9 / 16)) < 0.1) return '9:16';
    if (Math.abs(ratio - 0.75) < 0.1) return '3:4';
    if (Math.abs(ratio - 1.77) < 0.2) return '16:9'; 
    if (Math.abs(ratio - 1.33) < 0.1) return '4:3';
    if (ratio > 2) return '16:9';
    return '3:4';
};

const getBrandKitPrompt = (project: DesignProject): string => {
    const { brandKit } = project;
    if (!brandKit || (brandKit.logos.length === 0 && brandKit.colors.length === 0 && brandKit.fonts.length === 0)) {
        return '';
    }

    let prompt = "\n**Brand Guidebook Instructions:** The user has a brand kit. You MUST adhere to these branding guidelines; it is mandatory.";
    
    const primaryLogo = brandKit.logos.find(l => l.role === 'Primary Signature');
    if (primaryLogo) {
        prompt += `\n- The design MUST include a placeholder for the brand logo. Use 'brand_logo' as the assetId for this image layer.`;
    }

    if (brandKit.colors.length > 0) {
        const mainColors = brandKit.colors.filter(c => c.role === 'Main').map(c => c.value);
        const subColors = brandKit.colors.filter(c => c.role === 'Sub').map(c => c.value);
        const accentColors = brandKit.colors.filter(c => c.role === 'Accent').map(c => c.value);
        
        prompt += `\n- The color palette is strictly defined. You MUST only use these colors.
          - Main colors (for backgrounds, large areas): ${mainColors.join(', ') || 'none'}.
          - Sub colors (for secondary elements): ${subColors.join(', ') || 'none'}.
          - Accent colors (for buttons, highlights, calls to action): ${accentColors.join(', ') || 'none'}.`;
    }

    if (brandKit.fonts.length > 0) {
        const headlineFont = brandKit.fonts.find(f => f.role === 'Headline');
        const bodyFont = brandKit.fonts.find(f => f.role === 'Body Text');
        
        prompt += `\n- The typography is strictly defined. You MUST follow these rules:`;
        if (headlineFont) {
            prompt += `\n  - For all main titles and headlines, you MUST use the font "${headlineFont.fontFamily}" with a weight of ${headlineFont.fontWeight}.`;
        }
        if (bodyFont) {
            prompt += `\n  - For all body text and paragraphs, you MUST use the font "${bodyFont.fontFamily}" with a weight of ${bodyFont.fontWeight}.`;
        }
    }

    return prompt;
};

const getPreviewImagePrompts = (project: DesignProject) => {
    const designBrief = project.designBrief;
    const brandPrompt = getBrandKitPrompt(project);
    const mainColors = project.brandKit?.colors.filter(c => c.role === 'Main').map(c => c.value);
    const colorPalette = mainColors && mainColors.length > 0
        ? `the mandatory brand colors: ${mainColors.join(', ')}`
        : `a color palette of ${designBrief.colorPalette}`;

    const hasUserImage = project.imageLibrary.length > 0;
    const mainImagePrompt = hasUserImage
        ? "Use the main image provided by the user as the primary visual element and build the design around it."
        : `The main image should reflect the keywords: ${designBrief.keywords.join(', ')}.`;

    const basePrompt = `Create a complete, visually stunning design for a {type}. It should look like a final product.
- **Content**: The design is for "${designBrief.title}" with subtitle "${designBrief.subtitle}". ${mainImagePrompt}
- **Style**: Use ${colorPalette}. The overall style is ${designBrief.toneAndManner}.
- **Text**: The design MUST include visually rendered text for the title, subtitle, and some body text. The text does not need to be real words; it can be stylized placeholder text (lorem ipsum or abstract shapes that look like letters).
- **Composition**: Create a professional, well-balanced composition. Photorealistic, ultra-high detail.
${brandPrompt}`;

    return {
        [DesignType.Poster]: basePrompt.replace('{type}', 'promotional poster'),
        [DesignType.Booklet]: basePrompt.replace('{type}', 'A4 booklet cover'),
        [DesignType.CardNews]: basePrompt.replace('{type}', 'square social media card'),
        [DesignType.BusinessCardFront]: basePrompt.replace('{type}', 'front of a business card'),
        [DesignType.BusinessCardBack]: basePrompt.replace('{type}', 'back of a business card'),
        [DesignType.Banner]: basePrompt.replace('{type}', 'long horizontal banner'),
        [DesignType.Flyer]: basePrompt.replace('{type}', 'promotional A4 flyer'),
        [DesignType.Placard]: basePrompt.replace('{type}', 'large placard banner'),
        [DesignType.VColoring]: basePrompt.replace('{type}', 'vertical mobile screen for a V-Coloring service, focusing on a single strong visual element'),
        [DesignType.MobileBusinessCard]: basePrompt.replace('{type}', 'vertical mobile business card'),
        [DesignType.SeasonalGreeting]: basePrompt.replace('{type}', 'warm seasonal greeting image for mobile message'),
    }
};


export const generateFullDesignPreviews = async (designType: DesignType, projectData: DesignProject, numberOfImages: number = 3): Promise<string[]> => {
    const imagePrompt = getPreviewImagePrompts(projectData)[designType];
    const aspectRatio = getAspectRatio(designType);
    const hasUserImage = projectData.imageLibrary.length > 0;

    if (hasUserImage) {
        const firstImageAsset = projectData.imageLibrary[0];
        const file = firstImageAsset.file;
        const dataUrl = await fileToDataURL(file);
        const imageBase64 = dataUrl.split(',')[1];
        
        const generationPromises = Array(numberOfImages).fill(0).map(() => 
            generateImageFromImageAndText(imagePrompt, imageBase64)
        );
        const results = await Promise.all(generationPromises);
        return results;
    } else {
        const generationPromises = Array(numberOfImages).fill(0).map(() => 
            generateImage(imagePrompt, aspectRatio)
        );
        const results = await Promise.all(generationPromises);
        return results;
    }
};

const getLayoutPrompt = (type: DesignType, project: DesignProject, originalLayout?: DesignPage, pageContext?: 'cover' | 'inner' | 'cta'): string => {
    const designBrief = project.designBrief;
    const dimensions = MATERIAL_DIMENSIONS[type];
    const canvasWidthPx = mmToPx(dimensions.width_mm);
    const canvasHeightPx = mmToPx(dimensions.height_mm);
    const safetyMarginPx = mmToPx(3);
    const firstBodyLine = designBrief.bodyText.split('\n')[0] || '핵심 내용';
    const brandPrompt = getBrandKitPrompt(project);
    const primaryFont = project.brandKit?.fonts.find(f => f.role === 'Headline')?.fontFamily || designBrief.fontFamily;
    
    let adaptationPrompt = '';
    if (originalLayout) {
        adaptationPrompt = `
            **Adaptation Task:** This is an adaptation of a previous design.
            - **Original Type:** ${originalLayout.type}
            - **Original Layers:** ${JSON.stringify({ textLayers: originalLayout.textLayers, imageLayers: originalLayout.imageLayers, shapeLayers: originalLayout.shapeLayers }, null, 2)}
            - **Instruction:** Maintain the style, fonts, colors, and overall visual identity of the original design while adapting it to the new '${type}' format. The layer content (text, image assets) should remain the same, but their positions and sizes must be adjusted for the new canvas dimensions.
        `;
    }


    const basePrompt = `You are an expert typographer and graphic designer. Your task is to design a professional layout for a ${canvasWidthPx}px by ${canvasHeightPx}px canvas for a '${type}'.
    
    **Layer Naming Rule:** For each layer you create, you MUST provide a short, descriptive 'name' in Korean (e.g., '메인 제목', '로고 이미지', '배경 사각형').
    
    **Typography Rules:**
    1. You are provided with a list of available fonts and their characteristics.
    2. Analyze the design's tone and manner: "${TONE_AND_MANNERS[designBrief.toneAndManner]}".
    3. Based on this tone, you MUST select the most appropriate font from the list for each text element.
    4. You MUST also select an appropriate numeric font weight (e.g., 400, 700, 900) that is available for your chosen font. Use heavier weights for titles and lighter weights for body text to create a clear hierarchy. You can also use 'italic' fontStyle and 'underline' textDecoration for emphasis.
    5. The default primary font is "${primaryFont}", but you should make a better choice if the list provides a more suitable option for the tone.

    **Available Fonts and Their Characteristics:**
    ${JSON.stringify(KOREAN_FONTS_LIST.map(f => ({ name: f.name, weights: f.weights, style: f.style, description: f.description })), null, 2)}

    **General Layout Rules:**
    - Adhere to a ${safetyMarginPx}px safety margin for all critical elements.
    - For every generated layer, you MUST include 'isVisible: true' and 'isLocked: false'.
    - Use text effects ('effect' object) for professional styling, like a subtle shadow or lift.
    - IMPORTANT: You are analyzing a provided image to create this layout. The positions and styles should match the image.
    ${brandPrompt}
    ${adaptationPrompt}
    Your output MUST be a JSON object with 'textLayers', 'imageLayers', and 'shapeLayers' arrays, conforming to the schema.`;

    switch(type) {
        case DesignType.Poster: return `${basePrompt}
            - **Image Layers**: Designate one main area for 'main_photo'.
            - **Text Layers**: Main Title ("${designBrief.title}"): ~${ptToPx(120)}px, boldest weight. Subtitle ("${designBrief.subtitle}"): ~${ptToPx(60)}px. Body Text ("${designBrief.bodyText}"): ~${ptToPx(40)}px.`;
        case DesignType.Flyer: return `${basePrompt}
            - **Task**: Design a content-rich A4 flyer. Balance headlines, body text, and images.
            - **Image Layers**: Designate one main area for 'main_photo' and possibly smaller areas for other images.
            - **Text Layers**: Main Title ("${designBrief.title}"): ~${ptToPx(80)}px. Subtitle: ~${ptToPx(40)}px. Body Text ("${designBrief.bodyText}"): ~${ptToPx(12)}px. Contact Info ("${designBrief.contactInfo}"): ~${ptToPx(10)}px.`;
        case DesignType.Booklet:
            if (pageContext === 'cover') {
                return `${basePrompt}
                - **Task**: Design an impactful **cover page** layout.
                - **Image Layers**: One small area for 'main_photo'.
                - **Text Layers**: Title ("${designBrief.title}"): ~${ptToPx(60)}px. Subtitle ("${designBrief.subtitle}"): ~${ptToPx(40)}px. Key Point ("${firstBodyLine}"): ~${ptToPx(32)}px.`;
            } else { // 'inner' page
                 return `${basePrompt}
                - **Task**: Design a clean and readable **inner page** layout.
                - **Layout Style**: Prioritize clarity and readability for content. Use columns or structured blocks.
                - **Text Layers**: Create placeholders for a heading, subheading, and a main body text block. Use standard readable font sizes (~${ptToPx(12)} for body). Use "${designBrief.bodyText}" as placeholder content.
                - **Image Layers**: Include one placeholder for a content-related image ('main_photo').
                - **Shape Layers**: Use subtle lines or shapes to divide sections.`;
            }
        case DesignType.CardNews: 
            let cardNewsPrompt = basePrompt;
            switch(pageContext) {
                case 'cover':
                    cardNewsPrompt += `\n- **Task**: Design an engaging **cover page** for a square social media card. Focus on the main title ("${designBrief.title}") with maximum visual impact. Use a large font size (~${ptToPx(48)}px).`;
                    break;
                case 'inner':
                    cardNewsPrompt += `\n- **Task**: Design a clean and informative **content page**. Present the body text ("${designBrief.bodyText}") clearly. Use a readable font size (~${ptToPx(28)}px). You can use bullet points or short paragraphs.`;
                    break;
                case 'cta':
                    cardNewsPrompt += `\n- **Task**: Design a final **call-to-action (CTA) page**. It should prominently feature the contact information ("${designBrief.contactInfo}") and a concluding message.`;
                    break;
                default:
                    cardNewsPrompt += `
                        - **Image Layers**: Area for 'main_photo'.
                        - **Text Layers**: Header/Footer for Title/Subtitle (~${ptToPx(22)}px). Main Message ("${designBrief.title}"): ~${ptToPx(48)}px. Body Text ("${designBrief.bodyText.replace(/\n/g, ', ')}"): ~${ptToPx(28)}px.
                        - **Shape Layers**: Use subtle shapes like lines or a semi-transparent rectangle to organize content.`;
            }
            return cardNewsPrompt;
        case DesignType.BusinessCardFront: return `${basePrompt}\n${BUSINESS_CARD_FRONT_PRINCIPLES}
            - **Data**: Name/Company: ${designBrief.title}, Title/Role: ${designBrief.subtitle}.
            - **Task**: Create text, image, and shape layers for the FRONT of the business card. Include a placeholder for a logo ('logo_photo' or 'brand_logo' if a brand kit is used).`;
        case DesignType.BusinessCardBack: return `${basePrompt}\n${BUSINESS_CARD_BACK_PRINCIPLES}
            - **Data**: Body Text: "${designBrief.bodyText}", Contact Info: "${designBrief.contactInfo}".
            - **Task**: Create text and shape layers for the BACK of the business card. Clearly format the body text and contact information.`;
        case DesignType.Placard:
        case DesignType.Banner: return `${basePrompt}\n${BANNER_DESIGN_PRINCIPLES}
            - **Image Layers**: Designate a large area for 'main_photo'.
            - **Text Layers**: Main Message ("${designBrief.title}"): ~${ptToPx(200)}px. Sub-message ("${designBrief.subtitle}"): ~${ptToPx(100)}px. Text MUST have strong effects for visibility.`;
        case DesignType.VColoring: return `${basePrompt}
            - **Task**: Design a 9:16 vertical mobile screen for V-Coloring.
            - **Layout Style**: Focus on a single, powerful visual and very large, readable text. The message must be understood in seconds.
            - **Text Layers**: One main message ("${designBrief.title}") with a very large font size (~${ptToPx(150)}px) and strong visual effects.
            - **Image Layers**: Include one placeholder for a main visual ('main_photo') or a logo ('brand_logo').
            - **Shape Layers**: Use bold shapes or colors for impact.`;
        case DesignType.MobileBusinessCard: return `${basePrompt}
            - **Task**: Design a 9:16 vertical mobile business card.
            - **Layout Style**: Clean, professional, and easy to read on a mobile device. Think about scrollability by placing elements vertically.
            - **Text Layers**: Create placeholders for Name ("${designBrief.title}"), Title ("${designBrief.subtitle}"), and Contact Info sections ("${designBrief.contactInfo}"). Use readable font sizes (~${ptToPx(18)} for body).
            - **Image Layers**: Include a prominent placeholder for a profile picture or logo ('main_photo' or 'brand_logo').
            - **Shape Layers**: Use subtle lines or blocks to separate information sections. Add placeholders for clickable icons (phone, email, web).`;
        case DesignType.SeasonalGreeting: return `${basePrompt}
            - **Task**: Design a vertical image for a seasonal greeting MMS message.
            - **Layout Style**: Warm, friendly, and celebratory, fitting the specified holiday.
            - **Text Layers**: A large, decorative greeting message ("${designBrief.title}"). A smaller sign-off for the sender at the bottom.
            - **Image Layers**: Placeholder for a relevant seasonal image ('main_photo').
            - **Shape Layers**: Use festive decorative elements (e.g., simple snowflakes for winter, floral elements for spring).`;
        default: return basePrompt;
    }
}

export const generatePageLayout = async (type: DesignType, project: DesignProject, imageBase64?: string, originalLayout?: DesignPage, pageContext?: 'cover' | 'inner' | 'cta'): Promise<Omit<DesignPage, 'id' | 'pairId' | 'base64' | 'type' | 'pageNumber'>> => {
    const layout = await generateLayoutFromPrompt(getLayoutPrompt(type, project, originalLayout, pageContext), imageBase64);
    return { textLayers: layout.textLayers, imageLayers: layout.imageLayers, shapeLayers: layout.shapeLayers };
};

export const convertPreviewToEditableDocument = async (
    previewBase64: string,
    designType: GenerationOption,
    project: DesignProject
): Promise<DesignDocument> => {
    
    // Step 1: Extract the background from the preview image.
    const backgroundExtractionPrompt = `Analyze the provided image. Your task is to intelligently remove all text elements, logos, and simple foreground graphic elements, leaving only the main background image. Use inpainting techniques to seamlessly fill the areas where the elements were removed. Return only the final, clean background image. Do not add any text.`;
    
    const backgroundResponse = await tmoaStudio.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [
            { inlineData: { data: previewBase64, mimeType: 'image/png' } },
            { text: backgroundExtractionPrompt },
        ]},
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    
    let backgroundBase64 = previewBase64; // Fallback to original
    for (const part of backgroundResponse.candidates[0].content.parts) {
        if (part.inlineData) {
            backgroundBase64 = part.inlineData.data;
            break;
        }
    }

    // Step 2: Generate layouts by analyzing the preview image.
    if (designType === DesignType.Booklet) {
        const [coverLayout, innerLayout] = await Promise.all([
            generatePageLayout(designType, project, previewBase64, undefined, 'cover'),
            generatePageLayout(designType, project, undefined, undefined, 'inner'), // Inner page doesn't need image analysis
        ]);
        const dimensions = MATERIAL_DIMENSIONS[designType];
        const coverPage: DesignPage = { ...coverLayout, id: uuidv4(), type: designType, base64: backgroundBase64, pageNumber: 1, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm };
        const innerPage: DesignPage = { ...innerLayout, id: uuidv4(), type: designType, base64: backgroundBase64, pageNumber: 2, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm };
        return { id: uuidv4(), name: designType, pages: [coverPage, innerPage] };

    } else if (designType === 'BusinessCardSet') {
        // For biz cards, we assume the preview is the front. We generate the back layout from text.
        const frontLayout = await generatePageLayout(DesignType.BusinessCardFront, project, previewBase64);
        const backLayout = await generatePageLayout(DesignType.BusinessCardBack, project);
        const pairId = uuidv4();
        const frontDims = MATERIAL_DIMENSIONS[DesignType.BusinessCardFront];
        const backDims = MATERIAL_DIMENSIONS[DesignType.BusinessCardBack];
        const frontPage: DesignPage = { ...frontLayout, id: uuidv4(), type: DesignType.BusinessCardFront, base64: backgroundBase64, pairId, pageNumber: 1, width_mm: frontDims.width_mm, height_mm: frontDims.height_mm };
        const backPage: DesignPage = { ...backLayout, id: uuidv4(), type: DesignType.BusinessCardBack, base64: backgroundBase64, pairId, pageNumber: 2, width_mm: backDims.width_mm, height_mm: backDims.height_mm };
        return { id: uuidv4(), name: '명함 세트', pages: [frontPage, backPage] };

    } else if (designType === DesignType.CardNews) {
        const [page1Layout, page2Layout, page3Layout] = await Promise.all([
            generatePageLayout(designType, project, previewBase64, undefined, 'cover'),
            generatePageLayout(designType, project, undefined, undefined, 'inner'),
            generatePageLayout(designType, project, undefined, undefined, 'cta'),
        ]);
        const dimensions = MATERIAL_DIMENSIONS[designType];
        const pages: DesignPage[] = [
            { ...page1Layout, id: uuidv4(), type: designType, base64: backgroundBase64, pageNumber: 1, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm },
            { ...page2Layout, id: uuidv4(), type: designType, base64: backgroundBase64, pageNumber: 2, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm },
            { ...page3Layout, id: uuidv4(), type: designType, base64: backgroundBase64, pageNumber: 3, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm },
        ];
        return { id: uuidv4(), name: designType, pages };
    } else {
        const singleDesignType = designType as DesignType;
        const layout = await generatePageLayout(singleDesignType, project, previewBase64);
        const dimensions = MATERIAL_DIMENSIONS[singleDesignType];
        const page: DesignPage = { ...layout, id: uuidv4(), type: singleDesignType, base64: backgroundBase64, pageNumber: 1, width_mm: dimensions.width_mm, height_mm: dimensions.height_mm };
        return { id: uuidv4(), name: singleDesignType, pages: [page] };
    }
};



export const searchImages = async (query: string): Promise<string[]> => {
    const prompt = `A professional, high-quality, photorealistic stock photo for a marketing campaign. The photo should represent: "${query}".
    - Style: Clean, modern, well-lit, visually appealing.
    - IMPORTANT: Do NOT include any text, letters, logos, or watermarks in the image.`;
    try {
        const response = await tmoaStudio.models.generateImages({
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

export const adaptDesign = async (originalPage: DesignPage, targetType: DesignType, projectData: DesignProject): Promise<DesignDocument> => {
    // 1. Generate a new background that is consistent with the original
    const originalPrompt = getPreviewImagePrompts(projectData)[originalPage.type];
    const adaptPrompt = `Create a new background image for a '${targetType}' based on the style of a previous design.
    The original design's style was described as: "${originalPrompt}"
    Adapt this style to the new format, maintaining the core visual identity (colors, mood, complexity). Generate ONLY the background image without any text.`;
    const newAspectRatio = getAspectRatio(targetType);
    const newBase64 = await generateImage(adaptPrompt, newAspectRatio);

    // 2. Generate a new layout, providing the original layout as context
    const newLayout = await generatePageLayout(targetType, projectData, undefined, originalPage);
    
    const dimensions = MATERIAL_DIMENSIONS[targetType];

    const adaptedPage: DesignPage = {
        ...newLayout,
        id: uuidv4(),
        type: targetType,
        base64: newBase64,
        pageNumber: 1,
        width_mm: dimensions.width_mm,
        height_mm: dimensions.height_mm,
    };
    
    const adaptedDocument: DesignDocument = {
        id: uuidv4(),
        name: targetType,
        pages: [adaptedPage]
    };
    return adaptedDocument;
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

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
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
            text: 'Analyze the main subject of this image and create a new version with the background completely removed, resulting in a transparent background. The resulting background must be true transparency (alpha channel), not a checkerboard pattern. Only return the edited image, do not add any text.',
        };

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
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
        throw new Error("Background removal failed, no image was returned in the response.");
    } catch (error) {
        console.error('Error removing background:', error);
        throw error;
    }
};

export const generateAltText = async (base64ImageData: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: base64ImageData, mimeType: 'image/png' } };
        const textPart = { text: "시각 장애 사용자를 위해 이 이미지에 대한 간결하고 설명적인 대체 텍스트를 한국어로 제공해주세요." };

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error generating alt text:', error);
        throw new Error("Failed to generate alt text.");
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

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: COLOR_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        const colors: string[] = result.colors || [];
        // Validate that the returned colors are valid hex codes
        return colors.filter(color => /^#[0-9A-F]{6}$/i.test(color));
    } catch (error) {
        console.error('Error extracting colors from image:', error);
        throw new Error("Failed to extract colors from image.");
    }
};

export const scanDesignFromImage = async (
    imageBase64: string,
    targetType: DesignType,
    project: DesignProject
): Promise<DesignDocument> => {
    
    // Per user feedback, do not automatically "restore" the background by removing elements.
    // Instead, use the original uploaded image as the background to "decompose" it into layers.
    const backgroundBase64 = imageBase64;

    // Generate layout by analyzing the uploaded image.
    const layout = await generatePageLayout(targetType, project, imageBase64);
    const dimensions = MATERIAL_DIMENSIONS[targetType];
    const page: DesignPage = { 
        ...layout, 
        id: uuidv4(), 
        type: targetType, 
        base64: backgroundBase64, 
        pageNumber: 1,
        width_mm: dimensions.width_mm,
        height_mm: dimensions.height_mm,
    };
    
    return { 
        id: uuidv4(), 
        name: `${targetType} (스캔됨)`, 
        pages: [page] 
    };
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
        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: FONT_SUGGESTION_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error suggesting font:', error);
        throw new Error("Failed to suggest font.");
    }
};

export const cropImageWithAI = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = 'Identify the main subject of this image and crop the image to focus tightly on it, maintaining the original aspect ratio. Return only the final, cropped image. If the original image had a transparent background, the cropped image must also have a real transparent background (alpha channel), not a checkerboard pattern.';
    try {
        const response = await tmoaStudio.models.generateContent({
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
        throw new Error("AI smart crop failed, no image was returned.");
    } catch (error) {
        console.error('Error with AI smart crop:', error);
        throw error;
    }
};

const getRefinementPrompt = (page: DesignPage, project: DesignProject, refinementPrompt: string): string => {
    const designBrief = project.designBrief;
    const dimensions = MATERIAL_DIMENSIONS[page.type];
    const canvasWidthPx = mmToPx(dimensions.width_mm);
    const canvasHeightPx = mmToPx(dimensions.height_mm);

    const existingLayout = JSON.stringify({ textLayers: page.textLayers, imageLayers: page.imageLayers, shapeLayers: page.shapeLayers }, null, 2);

    return `You are an expert graphic designer tasked with refining an existing design based on a user's request.

    **User's Refinement Request:** "${refinementPrompt}"

    **Original Design Brief:**
    - Title: ${designBrief.title}
    - Tone & Manner: "${TONE_AND_MANNERS[designBrief.toneAndManner]}"
    - Color Palette Concept: ${designBrief.colorPalette}
    - Keywords: ${designBrief.keywords.join(', ')}

    **Existing Layout (JSON):**
    ${existingLayout}

    **Your Task:**
    1.  Analyze the user's request and the existing layout.
    2.  Generate a **new layout** as a JSON object that creatively incorporates the user's feedback.
    3.  You can adjust colors, fonts, positions, sizes, and effects. You can add minor decorative shapes.
    4.  You MUST preserve the core text content and image assets ('assetId').
    5.  The new layout must be for a ${canvasWidthPx}px by ${canvasHeightPx}px canvas.
    6.  Adhere to the same JSON schema as the original layout. Your output MUST be only the JSON object.
    
    **Available Fonts:**
    ${JSON.stringify(KOREAN_FONTS_LIST.map(f => ({ name: f.name, weights: f.weights, style: f.style })), null, 2)}
    `;
};

export const refinePageLayout = async (page: DesignPage, project: DesignProject, refinementPrompt: string): Promise<Omit<DesignPage, 'id' | 'pairId' | 'base64' | 'type' | 'pageNumber'>> => {
    const layout = await generateLayoutFromPrompt(getRefinementPrompt(page, project, refinementPrompt));
    return { textLayers: layout.textLayers, imageLayers: layout.imageLayers, shapeLayers: layout.shapeLayers };
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
        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: TEXT_REFINEMENT_SCHEMA,
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.refinedText || textToRefine;
    } catch (error) {
        console.error('Error refining text content:', error);
        throw new Error("Failed to refine text content.");
    }
};

const getMagicWandPrompt = (
    page: DesignPage,
    project: DesignProject,
    selectedLayers: AllLayer[],
    clickPosition: { x: number, y: number },
    instruction: string
): string => {
    const designBrief = project.designBrief;
    const dimensions = MATERIAL_DIMENSIONS[page.type];
    const canvasWidthPx = mmToPx(dimensions.width_mm);
    const canvasHeightPx = mmToPx(dimensions.height_mm);
    const primaryFont = project.brandKit.fonts.find(f => f.role === 'Headline')?.fontFamily || designBrief.fontFamily;

    return `You are an expert AI design assistant integrated into a design tool. You will modify a design layout based on a user's natural language command, their selection, and where they clicked.

    **User's Command:** "${instruction}"

    **Context:**
    - **Selected Layers:** The user has these layers selected (JSON): ${JSON.stringify(selectedLayers, null, 2)}
    - **Click Position:** The user clicked at coordinates (x: ${Math.round(clickPosition.x)}, y: ${Math.round(clickPosition.y)}) on the canvas. This position indicates the user's focus or the target area for the action.

    **Original Design Brief:**
    - Title: ${designBrief.title}
    - Tone & Manner: "${TONE_AND_MANNERS[designBrief.toneAndManner]}"
    - Color Palette Concept: ${designBrief.colorPalette}
    - Keywords: ${designBrief.keywords.join(', ')}

    **Existing Full Layout (JSON):**
    ${JSON.stringify({ textLayers: page.textLayers, imageLayers: page.imageLayers, shapeLayers: page.shapeLayers }, null, 2)}
    
    **Your Task:**
    1.  Analyze the user's command, their selection, and their click position to understand their intent. For example, if they ask to create a "reflection", you should create a duplicated, flipped, and faded version of the selected layer below it. If they ask to add an "icon", generate a new shape layer that looks like that icon near the click position.
    2.  Generate a **COMPLETE NEW LAYOUT** as a single JSON object that creatively incorporates the user's request.
    3.  You can add, remove, or modify layers. You can change properties like position, size, color, font, content, etc.
    4.  When adding new layers, you MUST generate a new unique UUID for the 'id' field using a format like 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
    5.  Your response must be a single JSON object conforming to the standard layout schema, containing 'textLayers', 'imageLayers', and 'shapeLayers' arrays. Do not add any other text.
    6.  For every generated layer, you MUST include a short, descriptive 'name' in Korean.
    7. Preserve the IDs of layers that are not changed or are only slightly modified.
    
    **Canvas and Font Info:**
    - Canvas dimensions: ${canvasWidthPx}px by ${canvasHeightPx}px.
    - Default primary font: "${primaryFont}".
    - Available Fonts: ${JSON.stringify(KOREAN_FONTS_LIST.map(f => ({ name: f.name, weights: f.weights, style: f.style })), null, 2)}
    `;
};

export const executeMagicWandAction = async (
    page: DesignPage,
    project: DesignProject,
    selectedLayers: AllLayer[],
    clickPosition: { x: number, y: number },
    instruction: string
): Promise<Omit<DesignPage, 'id' | 'pairId' | 'base64' | 'type' | 'pageNumber'>> => {
    const prompt = getMagicWandPrompt(page, project, selectedLayers, clickPosition, instruction);
    try {
        const layout = await generateLayoutFromPrompt(prompt);
        return { textLayers: layout.textLayers, imageLayers: layout.imageLayers, shapeLayers: layout.shapeLayers };
    } catch (error) {
        console.error("Error executing Magic Wand action:", error);
        throw new Error("AI Magic Wand action failed.");
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

        const drawX = (targetWidth - naturalWidth) / 2;
        const drawY = (targetHeight - naturalHeight) / 2;

        ctx.drawImage(img, drawX, drawY, naturalWidth, naturalHeight);

        const compositeBase64 = canvas.toDataURL('image/png').split(',')[1];

        const fullPrompt = `You are an AI image editor. The user has provided an image placed on a larger transparent canvas. 
        Your task is to fill the surrounding transparent area, seamlessly extending the original image to create a larger picture. 
        Match the style, lighting, and content of the original image perfectly. The final image should have no transparency.
        User's additional instruction: "${prompt || 'Continue the image naturally.'}"`;

        const imagePart = { inlineData: { data: compositeBase64, mimeType: 'image/png' } };
        const textPart = { text: fullPrompt };

        const response: GenerateContentResponse = await tmoaStudio.models.generateContent({
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
        throw new Error("AI image expansion failed, no image was returned.");

    } catch (error) {
        console.error("Error in expandImageWithAI:", error);
        throw new Error("Failed to expand image with AI.");
    }
};