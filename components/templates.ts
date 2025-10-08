import { DesignProject, DesignType, TextLayer, ImageLayer, ShapeLayer, DesignDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string; // base64 data URL
  project: DesignProject;
}

const TEMPLATE_PROJECT_DEFAULTS: Omit<DesignProject, 'designBrief' | 'documents'> = {
    imageLibrary: [],
    personalNotes: '',
    brandKit: {
        logos: [],
        colors: [],
        fonts: [],
    },
};

export const TEMPLATES: Template[] = [
    {
        id: 'cafe-poster-modern',
        name: '모던 카페 포스터',
        description: '세련된 느낌의 카페 오픈 또는 신메뉴 홍보용 포스터 템플릿입니다.',
        thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAClAGADASIAAhEBAxEB/8QAGwABAAMBAQEBAAAAAAAAAAAAAAUGBwIDBAj/xAAzEAABAwIFAwMCBQUBAAAAAAABAgMEBREABhIhMRNBURQiYTJxFZEHFiNCUoGhM2Kxwf/EABcBAQEBAQAAAAAAAAAAAAAAAAABAgP/xAAeEQEBAAEEAwEAAAAAAAAAAAAAAREhAhIxIUFRcf/aAAwDAQACEQMRAD8A/S9RRRQFFFFAUVCqdTp8BDb0+U1hOrS2lRCjcrk2A5Jt9B2G245VdNAUUUUAUVhcuc00p19xLaEJuVrNgB6k1pIkNSo6JLDqVsrSFoWnkKB5BFA2ooooCiiigKKKKAooooCivm9vWvugKKEqCkhSSCk7gjYig+0UUUBRRQSBuaAooqNIlxo+LzyG27CwK1AXPoO59qAkkDmhcAZJAFfVLSlN1qCUjcqJsAKiSp8SC0X5T6G2wbXUdv2e59qAkgggEEEbgg3BqpUavUupPyIsN/E7GUW3myhSVJUCRzcb2NiORsdoTq9Rj0qnyJ8grLbKCshCSpRA5AA5JqHozU49NpLEl1tLD8hAdcaS4VpQpQuU3IBNs/t7UBvRRXHFA5oqhUeuU+sJdXT3+MMOFtamxKVpJG4CgLWPqNx2q+gKKKKAooooCsMh5uMy4+8sIabSVrUeAALk1aYJJAuT2qBNrNPhxH5L0lonGtTxbSolxYF7hCQColOw2HO3egLdGp8uqP1Gt1F9sPO3EVtp0lENkclCbmwUo2KzbfYHk3l9SaZFrNKkU2UpYaeSLELsUkEEEH0IB/avdMlxqlT2J0ZxS2XkhxCihSSUnkbEAj7VfQY4zDUVhthhsIabSEISngACwAqyiiiAKjSpcaG0X5L6GmhwVqNh/s/pUq+EgHmaAiVeqRKVS5FSleIY7KbqwJUpRA2sBySeg5qPoWfNm6cxIqDBamLUshLDKkBKBsoEKUokgjI3FtthsTXvU9Kk1eiS6fGcQ2t9HhdSySEhRAUdr8bXB9jW/S4UeDS48KMjCwwgIT+fc+p3J96AsKKKKArxSlKSUoSpRTuQkXIoMVRnMvxHmHk3acQULTfexFwf3FZW+lBf6V0+m6NAnRYbC0yONqckrUVOLUE2BJPP4j+B2AFZ6KKKAooooCiiigKKKKAooooCiiigKKKKAooooCiivhIAJJAA3JPAoOSgLkkADck8VGnVCBUErcgyW30oVgrArex9D2PvUeqUuDWILkGe2VsOFJNhYpUk3CkkcKBAP+9RNGaU1RpLUZan1vqU644485bEtalrKlKIAG5J7DvQGeiiigKKKKAooooCiiigKKKKAooooP/2Q==',
        project: {
            ...TEMPLATE_PROJECT_DEFAULTS,
            designBrief: {
                title: '어반 그라인드',
                subtitle: 'GRAND OPENING',
                bodyText: '8월 24일, 최고의 커피를 만나보세요.\n서울시 커피구 향기로운 123',
                contactInfo: 'www.urbangrind.com',
                keywords: ['모던', '미니멀', '친근함'],
                colorPalette: '모던한 무채색',
                toneAndManner: '세련되고 미래지향적',
                fontFamily: 'Hahmlet',
            },
            documents: [{
                id: uuidv4(),
                name: DesignType.Poster,
                pages: [{
                    id: uuidv4(),
                    type: DesignType.Poster,
                    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==',
                    textLayers: [
                        { id: uuidv4(), content: 'URBAN GRIND', top: 521, left: 147, width: 4202, height: 494, fontSize: 411, fontWeight: 900, fontStyle: 'normal', textDecoration: 'none', color: '#FFFFFF', textAlign: 'left', fontFamily: 'Hahmlet', rotation: 0, opacity: 1, isVisible: true, isLocked: false },
                        { id: uuidv4(), content: 'CAFE', top: 928, left: 147, width: 1421, height: 351, fontSize: 292, fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', color: '#FFFFFF', textAlign: 'left', fontFamily: 'Hahmlet', rotation: 0, opacity: 0.8, isVisible: true, isLocked: false },
                        { id: uuidv4(), content: 'GRAND OPENING', top: 5880, left: 147, width: 1599, height: 169, fontSize: 141, fontWeight: 700, fontStyle: 'normal', textDecoration: 'none', color: '#FFFFFF', textAlign: 'left', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, isVisible: true, isLocked: false },
                        { id: uuidv4(), content: '8월 24일 | 서울시 커피구 향기로운 123', top: 6092, left: 147, width: 2354, height: 106, fontSize: 88, fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', color: '#D1D5DB', textAlign: 'left', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, isVisible: true, isLocked: false }
                    ],
                    imageLayers: [],
                    shapeLayers: [
                        { id: uuidv4(), type: 'rectangle', top: 5851, left: 147, width: 4627, height: 8, rotation: 0, fill: '#FFFFFF', strokeColor: '#000000', strokeWidth: 0, opacity: 0.5, isVisible: true, isLocked: false }
                    ],
                    pageNumber: 1,
                }]
            }]
        },
    },
    {
        id: 'corp-bizcard-clean',
        name: '기업용 명함',
        description: '어떤 비즈니스에도 어울리는 깔끔하고 전문적인 명함 템플릿입니다.',
        thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAABAKADAAQAAAABAAABAAAAAABQTL3AAAAATUlEQVR4Ae3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8A8GAAGv9pA+AAAAAElFTkSuQmCC',
        project: {
            ...TEMPLATE_PROJECT_DEFAULTS,
            designBrief: {
                title: 'Alex Kim',
                subtitle: 'Lead Developer',
                bodyText: 'Creative software solutions for the modern web.',
                contactInfo: 'Tel: 010-1234-5678\nEmail: alex.k@example.com\nWeb: www.alexkim.dev',
                keywords: ['전문성', '모던', '미니멀'],
                colorPalette: '신뢰의 파랑',
                toneAndManner: '진중하고 신뢰감',
                fontFamily: 'Noto Sans KR',
            },
            documents: [{
                id: uuidv4(),
                name: DesignType.BusinessCardFront,
                pages: [
                    {
                        id: uuidv4(), type: DesignType.BusinessCardFront, pageNumber: 1, pairId: 'bizcard-1',
                        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==',
                        textLayers: [
                            { id: uuidv4(), content: 'Alex Kim', top: 165, left: 354, width: 620, height: 97, fontSize: 81, fontWeight: 900, color: '#111827', textAlign: 'right', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none', isVisible: true, isLocked: false },
                            { id: uuidv4(), content: 'Lead Developer', top: 270, left: 354, width: 620, height: 43, fontSize: 36, fontWeight: 400, color: '#4B5563', textAlign: 'right', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none', isVisible: true, isLocked: false }
                        ],
                        imageLayers: [
                            { id: uuidv4(), assetId: 'logo_photo', top: 184, left: 63, width: 177, height: 118, rotation: 0, opacity: 1, isVisible: true, isLocked: false }
                        ],
                        shapeLayers: [
                            { id: uuidv4(), type: 'rectangle', top: 0, left: 0, width: 319, height: 591, rotation: 0, fill: '#3B82F6', strokeColor: '#000000', strokeWidth: 0, opacity: 1, isVisible: true, isLocked: false }
                        ]
                    },
                    {
                        id: uuidv4(), type: DesignType.BusinessCardBack, pageNumber: 2, pairId: 'bizcard-1',
                        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==',
                        textLayers: [
                            { id: uuidv4(), content: 'T: 010-1234-5678', top: 224, left: 59, width: 917, height: 43, fontSize: 36, fontWeight: 400, color: '#4B5563', textAlign: 'left', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none', isVisible: true, isLocked: false },
                            { id: uuidv4(), content: 'E: alex.k@example.com', top: 283, left: 59, width: 917, height: 43, fontSize: 36, fontWeight: 400, color: '#4B5563', textAlign: 'left', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none', isVisible: true, isLocked: false },
                            { id: uuidv4(), content: 'W: www.alexkim.dev', top: 342, left: 59, width: 917, height: 43, fontSize: 36, fontWeight: 400, color: '#4B5563', textAlign: 'left', fontFamily: 'Noto Sans KR', rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none', isVisible: true, isLocked: false }
                        ],
                        imageLayers: [],
                        shapeLayers: [
                             { id: uuidv4(), type: 'rectangle', top: 59, left: 59, width: 945, height: 6, rotation: 0, fill: '#3B82F6', strokeColor: '#000000', strokeWidth: 0, opacity: 1, isVisible: true, isLocked: false }
                        ]
                    }
                ]
            }]
        }
    }
];