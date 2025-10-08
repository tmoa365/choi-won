import { GenerateContentResponse, Type, Modality } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { ai } from "./geminiClient";
import { generateImage, editImageWithText } from "./imageService";
import { DesignPage, DesignType, TextLayer, ImageLayer, ShapeLayer, DesignProject, DesignDocument, GenerationOption, AllLayer, BrandKit } from '../types';
import { MATERIAL_DIMENSIONS, TONE_AND_MANNERS } from "../constants";
import { mmToPx, ptToPx, fileToDataURL } from "../vicEdit/utils";
import { BANNER_DESIGN_PRINCIPLES, BUSINESS_CARD_BACK_PRINCIPLES, BUSINESS_CARD_FRONT_PRINCIPLES } from "../components/designPrinciples";
import { KOREAN_FONTS_LIST } from "../components/fonts";

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

        const response: GenerateContentResponse = await ai.models.generateContent({
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
        if (brandKit.logoClearspace) {
            prompt += `\n- Logo Clearspace Rule: You MUST maintain a minimum empty space around the logo, equal to ${brandKit.logoClearspace}% of the logo's width.`;
        }
        if (brandKit.logoMinimumSize) {
            prompt += `\n- Logo Minimum Size Rule: The logo's width MUST NOT be smaller than ${brandKit.logoMinimumSize}px.`;
        }
    }
    
    if (brandKit.usageRules) {
        prompt += `\n- General Usage Rules: ${brandKit.usageRules}`;
    }

    if (brandKit.colors.length > 0) {
        const mainColors = brandKit.colors.filter(c => c.role === 'Main').map(c => c.value);
        const subColors = brandKit.colors.filter(c => c.role === 'Sub').map(c => c.value);
        const accentColors = brandKit.colors.filter(c => c.role === 'Accent').map(c => c.value);
        
        prompt += `\n- The color palette is strictly defined. You MUST only use these colors.
          - Main colors (for backgrounds, large areas): ${mainColors.join(', ') || 'none'}. Use these primarily.
          - Sub colors (for secondary elements): ${subColors.join(', ') || 'none'}.
          - Accent colors (for buttons, highlights, calls to action): ${accentColors.join(', ') || 'none'}. Use these sparingly for emphasis.`;
    }

    if (brandKit.fonts.length > 0) {
        const headlineFont = brandKit.fonts.find(f => f.role === 'Headline');
        const subheadlineFont = brandKit.fonts.find(f => f.role === 'Sub-headline');
        const bodyFont = brandKit.fonts.find(f => f.role === 'Body Text');
        
        prompt += `\n- The typography is strictly defined. You MUST follow these rules:`;
        if (headlineFont) {
            prompt += `\n  - For all main titles and headlines, you MUST use the font "${headlineFont.fontFamily}" with a weight of ${headlineFont.fontWeight}.`;
        }
        if (subheadlineFont) {
            prompt += `\n  - For subtitles and secondary headings, you MUST use the font "${subheadlineFont.fontFamily}" with a weight of ${subheadlineFont.fontWeight}.`;
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
        [DesignType.Menu]: basePrompt.replace('{type}', 'stylish restaurant menu cover'),
        [DesignType.TableSetting]: basePrompt.replace('{type}', 'elegant paper table setting mat'),
        [DesignType.Coupon]: basePrompt.replace('{type}', 'modern coupon or stamp card'),
        [DesignType.TableTent]: basePrompt.replace('{type}', 'promotional table tent card'),
        [DesignType.ProductTag]: basePrompt.replace('{type}', 'fashion product hang tag'),
        [DesignType.PackagingSticker]: basePrompt.replace('{type}', 'circular product packaging sticker'),
        [DesignType.GiftCertificate]: basePrompt.replace('{type}', 'premium gift certificate'),
        [DesignType.POP]: basePrompt.replace('{type}', 'point-of-purchase sign'),
        [DesignType.Leaflet]: basePrompt.replace('{type}', 'tri-fold leaflet'),
        [DesignType.Ticket]: basePrompt.replace('{type}', 'event ticket'),
        [DesignType.Invitation]: basePrompt.replace('{type}', 'formal invitation card'),
        [DesignType.TShirt]: basePrompt.replace('{type}', 't-shirt graphic design'),
        [DesignType.EcoBag]: basePrompt.replace('{type}', 'eco-bag graphic design'),
        [DesignType.Cap]: basePrompt.replace('{type}', 'baseball cap graphic design'),
        [DesignType.Pouch]: basePrompt.replace('{type}', 'small pouch graphic design'),
        [DesignType.ProductBox]: basePrompt.replace('{type}', 'elegant cosmetics product box packaging'),
        [DesignType.WindowSheeting]: basePrompt.replace('{type}', 'bold and clear window graphic'),
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
            editImageWithText(imagePrompt, imageBase64)
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

const getLayoutPrompt = (type: DesignType, project: DesignProject, originalLayout?: DesignPage, pageContext?: 'cover' | 'inner' | 'cta', dieline?: { cutPath: string; creasePath: string; }): string => {
    const designBrief = project.designBrief;
    const dimensions = MATERIAL_DIMENSIONS[type];
    const canvasWidthPx = mmToPx(dimensions.width_mm);
    const canvasHeightPx = mmToPx(dimensions.height_mm);
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
    
    let dielinePrompt = '';
    if (dieline) {
        dielinePrompt = `
            **Packaging Dieline Rules (CRITICAL):**
            - This design is for a product box with a specific dieline. You MUST place all content within the safe panels defined by the cut and crease lines.
            - **Cut Path (Magenta):** This is the outer boundary. No content should extend beyond this path.
            - **Crease Path (Cyan):** These are fold lines. CRITICAL: Do NOT place any important text or logos directly on or too close to these lines, as they will be folded.
            - You must analyze the panels created by these lines and place content (like front panel, side panels, top flap) logically. Assume the largest central panel is the front.
        `;
    }


    const basePrompt = `You are an expert typographer and graphic designer using a vector design tool. Your task is to analyze an image of a design and convert it into a structured JSON layout for a ${canvasWidthPx}px by ${canvasHeightPx}px canvas for a '${type}'.
    
    **CRITICAL RULE #1: All coordinate and dimension values (top, left, width, height) MUST be valid numbers within the canvas boundaries. 'left' must be between 0 and ${canvasWidthPx}. 'top' must be between 0 and ${canvasHeightPx}. A layer's right edge (left + width) CANNOT exceed ${canvasWidthPx}. A layer's bottom edge (top + height) CANNOT exceed ${canvasHeightPx}. Do NOT generate nonsensical or out-of-bounds numbers.**
    
    **CRITICAL RULE #2: Layer Naming:** For each layer you create, you MUST provide a short, descriptive 'name' in Korean (e.g., '메인 제목', '로고 이미지', '배경 사각형').
    
    **Typography Rules:**
    1. You are provided with a list of available fonts. You MUST select the most appropriate font from this list for each text element based on the design's tone.
    2. You MUST also select an appropriate numeric font weight (e.g., 400, 700, 900) that is available for your chosen font. Use heavier weights for titles and lighter weights for body text to create a clear hierarchy.
    3. The default primary font is "${primaryFont}", but you should make a better choice if the list provides a more suitable option.

    **Available Fonts and Their Characteristics:**
    ${JSON.stringify(KOREAN_FONTS_LIST.map(f => ({ name: f.name, weights: f.weights, style: f.style, description: f.description })), null, 2)}

    **General Layout Rules:**
    - IMPORTANT: You are analyzing a provided image to create this layout. The positions and styles should match the image with extreme precision.
    ${brandPrompt}
    ${dielinePrompt}
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
        case DesignType.ProductBox: return `${basePrompt}
            - **Task**: Design a layout for a product box.
            - **Content**: The product is "${designBrief.title}". Key feature: "${firstBodyLine}".
            - **Layout Style**: Place the product name, logo, and key feature on the main front panel. Place secondary information like ingredients or instructions on the side panels. The top flap could have the logo or a pattern.`;
        case DesignType.WindowSheeting: return `${basePrompt}
            - **Task**: Design a layout for a window graphic.
            - **Layout Style**: Bold, clear, and readable from a distance. Use very large text and high-contrast colors. Focus on one key message.
            - **Text Layers**: One main message ("${designBrief.title}") with a very large font size and strong visual weight.
            - **Image Layers**: A placeholder for a logo ('brand_logo') or a simple, impactful graphic ('main_photo').
            - **CRITICAL ATTACHMENT RULE**: If the user's context indicates this is for 'inside' attachment (내부 부착), you MUST horizontally mirror all text layers and any asymmetrical image/shape layers. This is so the design is readable from the outside when applied to the inside of a glass window. If the context says 'outside' attachment (외부 부착), do not mirror anything.`;
        case DesignType.TShirt:
        case DesignType.EcoBag:
             const productInfo = `This design will be printed on a ${project.designBrief.colorPalette} ${type}.`;
             return `${basePrompt}
             - **Task**: Design a graphic for a ${type}. ${productInfo}
             - **Layout Style**: The design should be a self-contained graphic. Place text and images together in a visually appealing composition.
             - **Text Layers**: A main slogan or title ("${designBrief.title}").
             - **Image Layers**: A main graphic element ('main_photo').`;
        default: return basePrompt;
    }
}

export const generatePageLayout = async (type: DesignType, project: DesignProject, imageBase64?: string, originalLayout?: DesignPage, pageContext?: 'cover' | 'inner' | 'cta', dieline?: { cutPath: string; creasePath: string; }): Promise<Omit<DesignPage, 'id' | 'pairId' | 'base64' | 'type' | 'pageNumber'>> => {
    const layout = await generateLayoutFromPrompt(getLayoutPrompt(type, project, originalLayout, pageContext, dieline), imageBase64);
    return { textLayers: layout.textLayers, imageLayers: layout.imageLayers, shapeLayers: layout.shapeLayers };
};

export const convertPreviewToEditableDocument = async (
    previewBase64: string,
    designType: GenerationOption,
    project: DesignProject
): Promise<DesignDocument> => {
    
    // Step 1: Extract the background from the preview image.
    const backgroundExtractionPrompt = `You are a professional background designer.
    Analyze the provided image, which is a complete design.
    Your task is to identify the background style, colors, textures, and geometric patterns.
    Then, create a brand new, clean background image that captures the essential style of the original background, but contains ABSOLUTELY NO text, logos, or foreground elements.
    The final output MUST be only the clean background image. Do not add any text, elements, or explanations.`;
    
    const backgroundResponse = await ai.models.generateContent({
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
