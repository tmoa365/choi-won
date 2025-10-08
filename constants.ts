import { DesignType } from './types';
import { PARTY_BRANDING } from './components/brandAssets';

export const DESIGN_KEYWORDS = ['모던', '미니멀', '클래식', '강렬함', '우아함', '재치', '전문성', '친근함'];

export const COLOR_PALETTES: { [key: string]: string } = {
  '신뢰의 파랑': 'trustworthy deep blue, navy, and sky blue tones',
  '열정의 빨강': 'passionate bright red, crimson, and maroon tones',
  '희망의 초록': 'hopeful forest green, lime, and teal tones',
  '안정의 보라': 'stable and calming purple, violet, and lavender tones',
  '긍정의 노랑': 'positive and energetic yellow, gold, and orange tones',
  '모던한 무채색': 'modern and chic achromatic colors like black, white, and grey',
  '부드러운 파스텔': 'soft and gentle pastel tones like baby pink, mint, and light yellow',
};

export const getAvailableColorPalettes = (): { [key: string]: string } => {
    const partyPalettes: { [key: string]: string } = {};
    for (const party of Object.values(PARTY_BRANDING)) {
        if (party.colorPaletteKey) {
            partyPalettes[party.colorPaletteKey] = `The official color palette of ${party.officialName}: ${Object.values(party.colors).join(', ')}`;
        }
    }
    return { ...partyPalettes, ...COLOR_PALETTES };
};

export const TONE_AND_MANNERS: { [key: string]: string } = {
  '진중하고 신뢰감': 'A serious, trustworthy, and professional style',
  '친근하고 역동적': 'A friendly, dynamic, and approachable style',
  '세련되고 미래지향적': 'A sophisticated, futuristic, and modern style',
};

export const MATERIAL_DIMENSIONS: { [key in DesignType]: { width_mm: number; height_mm: number } } = {
  [DesignType.Poster]: { width_mm: 420, height_mm: 594 }, // A2
  [DesignType.Booklet]: { width_mm: 210, height_mm: 297 }, // A4
  [DesignType.CardNews]: { width_mm: 120, height_mm: 120 }, // 1:1 ratio
  [DesignType.BusinessCardFront]: { width_mm: 90, height_mm: 50 },
  [DesignType.BusinessCardBack]: { width_mm: 90, height_mm: 50 },
  [DesignType.Banner]: { width_mm: 5000, height_mm: 900 },
  [DesignType.Flyer]: { width_mm: 210, height_mm: 297 }, // A4
  [DesignType.Placard]: { width_mm: 5000, height_mm: 900 },
  [DesignType.VColoring]: { width_mm: 108, height_mm: 192 }, // 9:16
  [DesignType.MobileBusinessCard]: { width_mm: 108, height_mm: 192 }, // 9:16
  [DesignType.SeasonalGreeting]: { width_mm: 108, height_mm: 135 }, // 4:5
  // Stage 1
  [DesignType.Menu]: { width_mm: 210, height_mm: 297 }, // A4
  [DesignType.TableSetting]: { width_mm: 420, height_mm: 297 }, // A3
  [DesignType.Coupon]: { width_mm: 90, height_mm: 50 },
  [DesignType.TableTent]: { width_mm: 297, height_mm: 210 }, // A4 landscape
  [DesignType.ProductTag]: { width_mm: 50, height_mm: 90 },
  [DesignType.PackagingSticker]: { width_mm: 60, height_mm: 60 },
  [DesignType.GiftCertificate]: { width_mm: 150, height_mm: 70 },
  [DesignType.POP]: { width_mm: 148, height_mm: 210 }, // A5
  [DesignType.Leaflet]: { width_mm: 297, height_mm: 210 }, // A4 landscape for tri-fold
  [DesignType.Ticket]: { width_mm: 150, height_mm: 70 },
  [DesignType.Invitation]: { width_mm: 100, height_mm: 150 },
  // Stage 2
  [DesignType.TShirt]: { width_mm: 280, height_mm: 400 },
  [DesignType.EcoBag]: { width_mm: 260, height_mm: 300 },
  [DesignType.Cap]: { width_mm: 120, height_mm: 60 },
  [DesignType.Pouch]: { width_mm: 180, height_mm: 120 },
};