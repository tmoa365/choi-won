export enum DesignType {
  Poster = '포스터',
  Booklet = '안내 책자',
  CardNews = 'SNS 카드뉴스',
  BusinessCardFront = '명함 (앞면)',
  BusinessCardBack = '명함 (뒷면)',
  Banner = '현수막',
  Flyer = '전단지',
  Placard = '플래카드',
  VColoring = 'V컬러링',
  MobileBusinessCard = '모바일 명함',
  SeasonalGreeting = '절기 문자',
  // Stage 1 Additions
  Menu = '메뉴판',
  TableSetting = '테이블 세팅지',
  Coupon = '쿠폰/스탬프 카드',
  TableTent = '테이블 텐트',
  ProductTag = '제품 태그',
  PackagingSticker = '포장 스티커',
  GiftCertificate = '상품권',
  POP = 'POP 광고물',
  Leaflet = '리플렛/팜플렛',
  Ticket = '티켓/입장권',
  Invitation = '초대장',
  // Stage 2 Additions
  TShirt = '티셔츠',
  EcoBag = '에코백',
  Cap = '모자',
  Pouch = '파우치',
  // Stage 3 Additions
  ProductBox = '제품 단상자',
  WindowSheeting = '윈도우 시트지',
}

export type GenerationOption = DesignType | 'BusinessCardSet';
export type GenerationStatus = { step: 'idle' | 'backgrounds' | 'layout'; type: GenerationOption | null; };

export interface DesignBrief {
  title: string;
  subtitle: string;
  bodyText: string;
  contactInfo: string;
  keywords: string[];
  colorPalette: string;
  toneAndManner: string;
  fontFamily: string;
}

export interface DesignConcept {
  title: string;
  subtitle: string;
  keywords: string[];
  toneAndManner: string;
  description: string;
}

export type TextEffectType = 'none' | 'shadow' | 'lift' | 'stroke' | 'neon';

export type TextEffect =
  | { type: 'none' }
  | { type: 'shadow'; color: string; offset: number; direction: number; blur: number; transparency: number; }
  | { type: 'lift'; intensity: number; }
  | { type: 'stroke'; color: string; width: number; }
  | { type: 'neon'; color: string; intensity: number; };


export interface TextLayer {
  id: string;
  name?: string;
  content: string;
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  rotation: number;
  opacity: number;
  effect?: TextEffect;
  isVisible?: boolean;
  isLocked?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  groupId?: string;
}

export interface ImageLayer {
  id: string;
  name?: string;
  alt?: string;
  assetId: string; // Links to ImageAsset.id or special IDs like 'main_photo'
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  isVisible?: boolean;
  isLocked?: boolean;
  groupId?: string;
}

export type GradientStop = { offset: number; color: string; };
export type Gradient = { type: 'linear'; angle: number; stops: GradientStop[]; };
export type Fill = string | Gradient;

export interface ShapeLayer {
    id: string;
    name?: string;
    type: 'rectangle' | 'circle' | 'line';
    top: number;
    left: number;
    width: number;
    height: number;
    rotation: number;
    fill: Fill;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    borderRadius?: number;
    isVisible?: boolean;
    isLocked?: boolean;
    groupId?: string;
}

export interface Group {
    id: string;
    name: string;
}

export interface DesignPage {
  id: string;
  type: DesignType;
  base64: string;
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  shapeLayers: ShapeLayer[];
  groups?: Group[];
  pairId?: string;
  pageNumber: number;
  width_mm?: number;
  height_mm?: number;
  hGuides?: number[];
  vGuides?: number[];
  mockup?: {
    color: string;
  };
  dieline?: {
    cutPath: string;
    creasePath: string;
  };
  attachmentDirection?: 'inside' | 'outside';
}

export interface DesignDocument {
    id: string;
    name: string;
    pages: DesignPage[];
}

export interface ImageAsset {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export type BrandLogoRole = 'Primary Signature' | 'Symbol Only' | 'Logotype Only';
export interface BrandLogo {
  id: string;
  role: BrandLogoRole;
  assetId: string;
}

export type BrandColorRole = 'Main' | 'Sub' | 'Accent';
export interface BrandColor {
  id: string;
  role: BrandColorRole;
  value: string;
}

export type BrandFontRole = 'Headline' | 'Sub-headline' | 'Body Text';
export interface BrandFont {
  id: string;
  role: BrandFontRole;
  fontFamily: string;
  fontWeight: number;
}
export interface BrandKit {
  logos: BrandLogo[];
  colors: BrandColor[];
  fonts: BrandFont[];
  logoClearspace?: number; // As a percentage of logo width
  logoMinimumSize?: number; // In pixels
  usageRules?: string; // Text-based rules
}

export type DataMapping = { [layerId: string]: string }; // key: layerId, value: column header

export interface DesignProject {
  designBrief: DesignBrief;
  imageLibrary: ImageAsset[];
  documents: DesignDocument[];
  personalNotes: string;
  brandKit: BrandKit;
}

export type AllLayer = TextLayer | ImageLayer | ShapeLayer;

export type MagicWandState = { position: { x: number, y: number }, targetLayerIds: string[] };

type InteractionType = 'move' | 'resize' | 'rotate';
type Handle = 'tl' | 'tr' | 'bl' | 'br';
export type Interaction = {
    type: InteractionType;
    handle?: Handle;
    startX: number;
    startY: number;
    initialLayers: AllLayer[];
    initialAngle?: number;
    layerCenter?: { x: number; y: number };
};