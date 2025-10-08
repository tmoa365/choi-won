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
        id: 'cosmetics-box-template',
        name: '화장품 상자',
        description: '세럼, 크림 등 화장품 제품을 위한 표준 단상자 템플릿입니다. 칼선이 포함되어 있습니다.',
        thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cgk8cGF0aCBkPSJNNjAuNSA0MC41SDExMS41VjE0NC41SDYwLjVaIiBmaWxsPSIjRThFQUZFIiBzdHJva2U9IiNDQ0NERTUiIHN0cm9rZS13aWR0aD0iMSIvPgoJPHBhdGggZD0iTTExMS41IDQwLjVIMTYyLjVWMTQ0LjVIMTExLjVaIiBmaWxsPSIjRjRGNUY3IiBzdHJva2U9IiNDQ0NERTUiIHN0cm9rZS13aWR0aD0iMSIvPgoJPHBhdGggZD0iTTkuNSA0MC41SDYwLjVWMTQ0LjVIOS41WiIgZmlsbD0iI0Y0RjVGNyIgc3Ryb2tlPSIjQ0NDREU1IiBzdHJva2Utd2lkdGg9IjEiLz4KCTxwYXRoIGQ9Ik02MC41IDEwLjVIMTExLjVWNDAuNUg2MC41WiIgZmlsbD0iI0Y5RjlGQiIgc3Ryb2tlPSIjQ0NDREU1IiBzdHJva2Utd2lkdGg9IjEiLz4KCTxwYXRoIGQ9Ik02MC41IDE0NC41SDExMS41VjE3NC41SDYwLjVaIiBmaWxsPSIjRjlGOUZCIiBzdHJva2U9IiNDQ0NERTUiIHN0cm9rZS13aWR0aD0iMSIvPgoJPHRleHQgeD0iODYiIHk9Ijk1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY0NzRERiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q09TTUVUSUNTzwv0ZXh0Pgo8L3N2Zz4=',
        project: {
            ...TEMPLATE_PROJECT_DEFAULTS,
            designBrief: {
                title: '글로우 세럼',
                subtitle: 'Glow Serum',
                bodyText: '비타민 C 유도체 함유\n수분 광채 피부 완성',
                contactInfo: '용량: 30ml / 1.0 fl.oz.',
                keywords: ['미니멀', '전문성', '우아함'],
                colorPalette: '부드러운 파스텔',
                toneAndManner: '세련되고 미래지향적',
                fontFamily: 'Noto Sans KR',
            },
            documents: [{
                id: uuidv4(),
                name: DesignType.ProductBox,
                pages: [{
                    id: uuidv4(),
                    type: DesignType.ProductBox,
                    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==',
                    textLayers: [],
                    imageLayers: [],
                    shapeLayers: [],
                    pageNumber: 1,
                    width_mm: 157,
                    height_mm: 157,
                    dieline: {
                        cutPath: "M 89 26 L 89 0 L 157 0 L 157 26 L 186 26 L 186 157 L 157 157 L 157 186 L 89 186 L 89 157 L 0 157 L 0 26 L 89 26 Z",
                        creasePath: "M 89 26 L 157 26 M 89 157 L 157 157 M 89 26 L 89 157 M 157 26 L 157 157"
                    }
                }]
            }]
        },
    },
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
                        // FIX: Add missing properties to this TextLayer object.
                        { id: uuidv4(), content: 'GRAND OPENING', top: 5880, left: 147, width: 1599, height: 169, fontSize: 141, fontWeight: 700, fontStyle: 'normal', textDecoration: 'none', color: '#FFFFFF', textAlign: 'left', fontFamily: 'Hahmlet', rotation: 0, opacity: 1, isVisible: true, isLocked: false }
                    ],
                    imageLayers: [],
                    shapeLayers: [
                        { id: uuidv4(), type: 'rectangle', top: 0, left: 0, width: 4961, height: 7016, rotation: 0, fill: '#1E1E1E', strokeColor: '#000000', strokeWidth: 0, opacity: 1, isVisible: true, isLocked: false },
                        { id: uuidv4(), type: 'line', top: 5693, left: 147, width: 885, height: 2, rotation: 0, fill: '#FFFFFF', strokeColor: '#FFFFFF', strokeWidth: 2, opacity: 1, isVisible: true, isLocked: false }
                    ],
                    pageNumber: 1,
                    width_mm: 420,
                    height_mm: 594,
                }]
            }]
        }
    }
];
