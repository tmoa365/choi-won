import { DesignBrief } from '../types';
import { ptToPx } from '../vicEdit/utils';
import { KOREAN_FONTS_LIST } from './fonts';

export const BUSINESS_CARD_FRONT_PRINCIPLES = `
- **Rule 1 (Clear Hierarchy):** The most important information (usually the company/person's name and logo) must be the most prominent. Establish a clear visual flow.
- **Rule 2 (Dynamic & Professional Layout):** Avoid overly static, centered layouts. Use principles of alignment, proximity, and white space to create a balanced and professional design.
- **Rule 3 (Brand Consistency):** The design must reflect the brand's identity. Use the brand's official colors, fonts, and logo consistently.
- **Rule 4 (Readability First):** Choose clean, legible fonts. Ensure there's enough contrast between text and background. Don't make the font size too small.
- **Rule 5 (Memorable Element):** Include one unique visual element to make the card memorable, whether it's a bold color, a unique layout, a tactile finish, or a clever use of the logo.
`;

export const BUSINESS_CARD_BACK_PRINCIPLES = `
- **Rule 1 (Clarity and Function):** The back side is for detailed information. Prioritize readability and clear organization. Use ample white space to avoid a cluttered look.
- **Rule 2 (Structured Information):** Logically group information into sections: Contact Details (phone, email, website), Address, Social Media, and perhaps a short tagline or list of services.
- **Rule 3 (Maintain Branding):** Continue the visual identity from the front. Use brand colors for headings or icons, and include a smaller version of the logo if appropriate.
- **Rule 4 (Call to Action):** Make it easy for the recipient to act. List contact information clearly. A QR code linking to a website, portfolio, or social media profile is highly effective.
- **Rule 5 (Professional Typography):** Use a highly readable sans-serif font for body text. Create a clear hierarchy with font sizes and weights (e.g., bold for headings, regular for details).
`;

// Dynamically get recommended fonts to avoid hardcoding issues
const getRecommendedFonts = (): string => {
    const recommended = ['Black Han Sans', 'Jua', 'Do Hyeon'];
    return KOREAN_FONTS_LIST
        .filter(font => recommended.includes(font.name))
        .map(font => `\`${font.name}\``)
        .join(', ');
};

export const LARGE_BANNER_PRINCIPLES = (brief: DesignBrief) => `
**CRITICAL DESIGN RULES for Large Banners (600x90cm):**
You MUST follow these rules precisely to ensure readability from a distance.
1.  **Dominant Readability**: The absolute priority is making text readable from over 30 meters away, often by people in moving cars. Aesthetics are secondary to legibility.
2.  **Font Choice**: You MUST use ultra-bold, thick-stroke fonts. From the available list, prioritize: ${getRecommendedFonts()}. NEVER use thin, decorative, or handwriting fonts.
3.  **High Contrast**: Use a simple, high-contrast color scheme. The most effective combination is a yellow background with black or dark blue text.
4.  **Text Size Hierarchy (MANDATORY)**: You must adhere to this physical size guide. All font sizes are approximate target values in pixels.
    -   **Main Headline (e.g., "${brief.title}")**: This is the most crucial element. Font size MUST be between ${ptToPx(1000)}px and ${ptToPx(1400)}px. It should occupy 40-55% of the banner's height.
    -   **Sub Headline (e.g., "${brief.subtitle}")**: Font size MUST be between ${ptToPx(425)}px and ${ptToPx(700)}px.
    -   **Detailed Info (e.g., date, location)**: Font size MUST be between ${ptToPx(220)}px and ${ptToPx(340)}px. Keep it concise (max 2 lines).
    -   **Contact/Host Info (e.g., "${brief.contactInfo}")**: This is the smallest text. Font size MUST be between ${ptToPx(140)}px and ${ptToPx(200)}px.
5.  **Text Effects**: Apply a subtle but strong drop shadow (그림자) or a thin, dark stroke (외곽선) to all text to make it pop. Avoid thick strokes, as they can merge letters from a distance.
6.  **Minimalism**: Keep the message singular and the number of words to a minimum. Use one dominant image if necessary, but text is the priority.
`;

export const WIDE_BANNER_PRINCIPLES = (brief: DesignBrief) => `
**CRITICAL DESIGN RULES for Wide Banners (600x30cm):**
This format is extremely narrow and long. The rules are strict.
1.  **Single Message Only**: The entire banner MUST contain only ONE SINGLE LINE of text. Trying to fit more than one line will result in a failed design.
2.  **Maximize Font Size**: The text height must fill 60-70% of the banner's height. This means the font size must be approximately between ${ptToPx(510)}px and ${ptToPx(620)}px.
3.  **Content**: Combine all essential information into one line. For example: "${brief.title} GRAND OPEN ☎ ${brief.contactInfo}".
4.  **Font Choice & Contrast**: Same as large banners. Use ultra-bold fonts like ${getRecommendedFonts()} and high-contrast colors (e.g., yellow background, black text).
5.  **No Auxiliary Info**: Do not add any secondary text elements. All information must be in the single main line.
`;

export const X_BANNER_PRINCIPLES = (brief: DesignBrief) => `
**CRITICAL DESIGN RULES for X-Banners (60x180cm):**
This is a vertical, indoor banner viewed from a closer distance. A clear top-to-bottom hierarchy is key.
1.  **Font Choice**: Use bold, clear fonts like ${getRecommendedFonts()} for headlines. Body text can be a standard sans-serif like 'Noto Sans KR'.
2.  **Layout Hierarchy (Top to Bottom)**:
    -   **Top 1/3 (Eye-level)**: Place the **Main Headline** here. This should grab attention first. Font size should be approximately between ${ptToPx(425)}px and ${ptToPx(570)}px.
    -   **Center**: Place a key **image ('main_photo')** or the most important content/explanation. Text here should be around ${ptToPx(200)}px to ${ptToPx(300)}px. Keep text to 3-4 lines max.
    -   **Bottom**: Place **Contact Info** or a QR code. Text size should be around ${ptToPx(140)}px to ${ptToPx(220)}px. If using a QR code, ensure it is at least 5cm wide (approx. 590px).
3.  **High Contrast**: Maintain high contrast between text and background for readability in various indoor lighting conditions.
`;

export const FLYER_PRINCIPLES = (brief: DesignBrief) => `
**CRITICAL DESIGN RULES for A4 Flyers (Z-Pattern Reading Flow):**
You MUST follow these rules precisely to create an effective, action-driving flyer. The primary goal is to grab attention in 3 seconds and guide the user's eye along a Z-shaped path.

1.  **Layout Hierarchy (MANDATORY Z-Pattern)**:
    -   **Top-Left (Hook)**: Place the **Main Headline**. This is the most powerful element, grabbing initial attention.
    -   **Top-Right (Interest)**: Place a compelling **image ('main_photo')** or a strong sub-headline.
    -   **Center (Details)**: Arrange the **Body Text** and key information, guiding the eye diagonally downwards.
    -   **Bottom-Right (Action)**: Place the **Call to Action (CTA)**, contact info, and any coupons. This is the final point of the 'Z' scan.

2.  **Font Pairing**: You MUST use a combination of a bold, high-impact font for headlines and a clean, highly readable sans-serif for body text.
    -   **Recommended Headline Fonts**: \`Black Han Sans\`.
    -   **Recommended Body Fonts**: \`Noto Sans KR\`.

3.  **Text Size & Style Hierarchy (MANDATORY)**: Adhere strictly to this guide for an A4 flyer. All font sizes are target values in pixels.
    -   **Main Headline (Hook)**: Font size MUST be between ${ptToPx(40)}px and ${ptToPx(70)}px. Use bold or heavy weights. Letter spacing should be tight (-70 to -100). Make it dynamic and impactful. Emphasize important numbers (e.g., '50%') by making them even larger than the text. The '%' symbol should be smaller.
    -   **Sub Headline**: Font size MUST be between ${ptToPx(18)}px and ${ptToPx(26)}px. Use bold or medium weight.
    -   **Key Info (Date/Place)**: Font size MUST be between ${ptToPx(14)}px and ${ptToPx(18)}px. Use bold weight and consider pairing with simple icons for clarity.
    -   **Body Text**: Font size MUST be between ${ptToPx(10)}px and ${ptToPx(12)}px. Line height should be generous (1.5 to 1.6). Keep it concise.
    -   **Emphasis Text**: For special offers within the body (e.g., "선착순 100명!"). Font size: ${ptToPx(12)}px to ${ptToPx(15)}px. Use a different color, heavy weight, or a background highlight shape.
    -   **Call to Action (CTA)**: Font size MUST be between ${ptToPx(16)}px and ${ptToPx(22)}px. Place this text inside a button-like shape layer to encourage action. Content should be a direct command (e.g., "지금 바로 전화하세요!").
    -   **Contact Info**: Font size MUST be between ${ptToPx(9)}px and ${ptToPx(10)}px. Place near the CTA.
    -   **Fine Print**: Font size MUST be between ${ptToPx(7)}px and ${ptToPx(8)}px. This is the smallest text, for legal notices.

4.  **Whitespace & Contrast**: Do not clutter the design. Use generous margins and spacing around important elements to increase focus and readability.

5.  **Coupon Area**: If the body text contains the phrase "[하단 쿠폰 영역]", you MUST create a distinct coupon area at the bottom of the flyer. This area should be visually separated, for example with a dashed line shape layer to simulate a perforation, and should contain the coupon details from the body text.
`;