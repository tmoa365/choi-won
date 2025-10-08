export interface KoreanFont {
    name: string;
    fontFamily: string;
    weights: number[];
    style: 'sans-serif' | 'serif' | 'handwriting' | 'display';
    description: string;
}

export const KOREAN_FONTS_LIST: KoreanFont[] = [
    { name: 'Noto Sans KR', fontFamily: '"Noto Sans KR", sans-serif', weights: [400, 700, 900], style: 'sans-serif', description: '가장 표준적이고 깨끗하며, 가독성이 매우 뛰어난 현대적인 고딕체. 어떤 디자인에도 잘 어울림.' },
    { name: 'Nanum Gothic', fontFamily: '"Nanum Gothic", sans-serif', weights: [400, 700], style: 'sans-serif', description: 'Noto Sans KR과 유사하지만 약간 더 부드러운 느낌을 주는 대중적인 고딕체.' },
    { name: 'IBM Plex Sans KR', fontFamily: '"IBM Plex Sans KR", sans-serif', weights: [400, 700], style: 'sans-serif', description: '기술적이고 현대적인 느낌이 강한 고딕체로, IT나 미래지향적 컨셉에 적합.' },
    { name: 'Gowun Dodum', fontFamily: '"Gowun Dodum", sans-serif', weights: [400], style: 'sans-serif', description: '단정하고 부드러운 느낌의 고딕체로, 친근하고 따뜻한 분위기를 연출할 때 좋음.' },
    { name: 'Nanum Myeongjo', fontFamily: '"Nanum Myeongjo", serif', weights: [400, 700], style: 'serif', description: '가장 표준적인 명조체로, 문학적이고 클래식하며, 신뢰감을 주는 디자인에 적합.' },
    { name: 'Gowun Batang', fontFamily: '"Gowun Batang", serif', weights: [400, 700], style: 'serif', description: '옛스러운 느낌이 더해진 명조체로, 전통적이거나 감성적인 분위기에 잘 어울림.' },
    { name: 'Hahmlet', fontFamily: '"Hahmlet", serif', weights: [400, 700], style: 'serif', description: '현대적으로 디자인된 명조체로, 세련되고 우아한 느낌을 줌.' },
    { name: 'Jua', fontFamily: '"Jua", sans-serif', weights: [400], style: 'display', description: '굵고 둥근 형태의 제목용 서체로, 친근하고 귀여운 느낌을 강조할 때 사용.' },
    { name: 'Do Hyeon', fontFamily: '"Do Hyeon", sans-serif', weights: [400], style: 'display', description: '각지고 꽉 찬 형태의 제목용 서체로, 강하고 복고적인 느낌을 줌.' },
    { name: 'Black Han Sans', fontFamily: '"Black Han Sans", sans-serif', weights: [400], style: 'display', description: '매우 굵고 강렬한 인상을 주는 제목용 서체로, 시선을 사로잡는 데 효과적.' },
    { name: 'Yeon Sung', fontFamily: '"Yeon Sung", cursive', weights: [400], style: 'handwriting', description: '부드럽고 유려한 필기체로, 감성적이고 인간적인 느낌을 전달.' },
    { name: 'Nanum Pen Script', fontFamily: '"Nanum Pen Script", cursive', weights: [400], style: 'handwriting', description: '가늘고 자연스러운 펜글씨 형태로, 개인적이고 친근한 메모 느낌을 줌.' },
    { name: 'Gaegu', fontFamily: '"Gaegu", cursive', weights: [400], style: 'handwriting', description: '어린 아이의 글씨처럼 귀엽고 장난스러운 느낌의 손글씨체.' },
    { name: 'Hi Melody', fontFamily: '"Hi Melody", cursive', weights: [400], style: 'handwriting', description: '밝고 경쾌한 느낌의 손글씨체로, 긍정적이고 즐거운 분위기에 적합.' },
];

export const KOREAN_FONTS_MAP: { [key: string]: string } = KOREAN_FONTS_LIST.reduce((acc, font) => {
    acc[font.name] = font.fontFamily;
    return acc;
}, {} as { [key: string]: string });