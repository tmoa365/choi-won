import React from 'react';

// --- 더불어민주당 (Democratic Party) Assets ---
const MinjooPartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="250" height="77" viewBox="0 0 250 77" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <style>
      {`
        .minjoo-font-1 { font-family: 'Nanum Brush Script', cursive; font-size: 36px; fill: #004EA2; }
        .minjoo-font-2 { font-family: 'Noto Sans KR', sans-serif; font-size: 58px; font-weight: 900; fill: #004EA2; letter-spacing: -0.05em;}
      `}
    </style>
    <text x="25" y="40" className="minjoo-font-1">더불어</text>
    <text x="20" y="75" className="minjoo-font-2">민주당</text>
  </svg>
);

const MinjooPartyLogoVertical: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="60" height="250" viewBox="0 0 60 250" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <style>
          {`
            .minjoo-v-font-1 { font-family: 'Nanum Brush Script', cursive; font-size: 32px; fill: #004EA2; }
            .minjoo-v-font-2 { font-family: 'Noto Sans KR', sans-serif; font-size: 52px; font-weight: 900; fill: #004EA2; letter-spacing: -0.1em; }
          `}
        </style>
        <text x="30" y="40" textAnchor="middle" className="minjoo-v-font-1">더불어</text>
        <text x="30" y="100" textAnchor="middle" className="minjoo-v-font-2">민</text>
        <text x="30" y="155" textAnchor="middle" className="minjoo-v-font-2">주</text>
        <text x="30" y="210" textAnchor="middle" className="minjoo-v-font-2">당</text>
    </svg>
);


// --- 국민의힘 (People Power Party) Assets ---
const PeoplePowerPartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="200" height="70" viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <style>
          {`
            .ppp-font { font-family: 'Noto Sans KR', sans-serif; font-size: 38px; font-weight: 700; fill: #231F20; }
          `}
        </style>
        <path d="M42.0312 18.2344C44.75 14.8281 48.0156 12.0312 51.8281 9.84375C54.125 8.5 56.5781 7.54688 59.1875 6.98438C61.7969 6.39062 64.4375 6.09375 67.1094 6.09375C69.7812 6.09375 72.3906 6.39062 74.9375 6.98438C77.5156 7.54688 79.9375 8.5 82.2031 9.84375C86.0156 12.0312 89.25 14.8281 91.9062 18.2344L82.125 24.8906C80.8438 23.1406 79.2812 21.8438 77.4375 21C75.625 20.125 73.5938 19.6875 71.3438 19.6875C69.9688 19.6875 68.6406 19.8594 67.3594 20.1875C66.1094 20.5156 64.9531 21.0156 63.8906 21.6875C60.0156 23.9531 57.2656 27.5781 55.6406 32.5625C57.4375 30.8438 59.5625 29.6875 62.0156 29.1094C64.5 28.5 67.125 28.1875 69.8906 28.1875C73.1875 28.1875 76.2188 28.8281 78.9844 30.125C81.75 31.3906 84.0625 33.2344 85.9219 35.6562C87.7812 38.0469 89.125 40.8906 89.9531 44.1875C90.8125 47.4531 91.25 50.9375 91.25 54.6406C91.25 58.3438 90.8125 61.8281 89.9531 65.1094C89.125 68.3594 87.7812 71.1875 85.9219 73.5938C84.0625 76 81.75 77.8438 78.9844 79.125C76.2188 80.4062 73.1875 81.0469 69.8906 81.0469C67.125 81.0469 64.5 80.7344 62.0156 80.1406C59.5625 79.5781 57.4375 78.4219 55.6406 76.6719C57.2656 81.6562 60.0156 85.2812 63.8906 87.5469C64.9531 88.2188 66.1094 88.7188 67.3594 89.0469C68.6406 89.375 69.9688 89.5469 71.3438 89.5469C73.5938 89.5469 75.625 89.1094 77.4375 88.2344C79.2812 87.3594 80.8438 86.0625 82.125 84.3594L91.9062 91C89.25 94.375 86.0156 97.1719 82.2031 99.3906C79.9375 100.734 77.5156 101.688 74.9375 102.266C72.3906 102.859 69.7812 103.156 67.1094 103.156C64.4375 103.156 61.7969 102.859 59.1875 102.266C56.5781 101.688 54.125 100.734 51.8281 99.3906C48.0156 97.1719 44.75 94.375 42.0312 91C39.3125 87.5938 37.1406 83.7344 35.5156 79.4219C33.9219 75.0781 33.125 70.3906 33.125 65.3594V43.8906C33.125 38.8594 33.9219 34.1719 35.5156 29.8281C37.1406 25.5156 39.3125 21.6562 42.0312 18.2344Z" transform="scale(0.6) translate(-25, -5)" fill="#E60024"/>
        <text x="80" y="52" className="ppp-font">국민의힘</text>
    </svg>
);
const PeoplePowerPartyLogoVertical: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="70" height="200" viewBox="0 0 70 200" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <style>
            {` .ppp-v-font { font-family: 'Noto Sans KR', sans-serif; font-size: 38px; font-weight: 700; fill: #231F20; } `}
        </style>
        <text x="35" y="40" textAnchor="middle" writingMode="vertical-rl" className="ppp-v-font">국민의힘</text>
        <path d="M42.0312 18.2344C44.75 14.8281 48.0156 12.0312 51.8281 9.84375C54.125 8.5 56.5781 7.54688 59.1875 6.98438C61.7969 6.39062 64.4375 6.09375 67.1094 6.09375C69.7812 6.09375 72.3906 6.39062 74.9375 6.98438C77.5156 7.54688 79.9375 8.5 82.2031 9.84375C86.0156 12.0312 89.25 14.8281 91.9062 18.2344L82.125 24.8906C80.8438 23.1406 79.2812 21.8438 77.4375 21C75.625 20.125 73.5938 19.6875 71.3438 19.6875C69.9688 19.6875 68.6406 19.8594 67.3594 20.1875C66.1094 20.5156 64.9531 21.0156 63.8906 21.6875C60.0156 23.9531 57.2656 27.5781 55.6406 32.5625C57.4375 30.8438 59.5625 29.6875 62.0156 29.1094C64.5 28.5 67.125 28.1875 69.8906 28.1875C73.1875 28.1875 76.2188 28.8281 78.9844 30.125C81.75 31.3906 84.0625 33.2344 85.9219 35.6562C87.7812 38.0469 89.125 40.8906 89.9531 44.1875C90.8125 47.4531 91.25 50.9375 91.25 54.6406C91.25 58.3438 90.8125 61.8281 89.9531 65.1094C89.125 68.3594 87.7812 71.1875 85.9219 73.5938C84.0625 76 81.75 77.8438 78.9844 79.125C76.2188 80.4062 73.1875 81.0469 69.8906 81.0469C67.125 81.0469 64.5 80.7344 62.0156 80.1406C59.5625 79.5781 57.4375 78.4219 55.6406 76.6719C57.2656 81.6562 60.0156 85.2812 63.8906 87.5469C64.9531 88.2188 66.1094 88.7188 67.3594 89.0469C68.6406 89.375 69.9688 89.5469 71.3438 89.5469C73.5938 89.5469 75.625 89.1094 77.4375 88.2344C79.2812 87.3594 80.8438 86.0625 82.125 84.3594L91.9062 91C89.25 94.375 86.0156 97.1719 82.2031 99.3906C79.9375 100.734 77.5156 101.688 74.9375 102.266C72.3906 102.859 69.7812 103.156 67.1094 103.156C64.4375 103.156 61.7969 102.859 59.1875 102.266C56.5781 101.688 54.125 100.734 51.8281 99.3906C48.0156 97.1719 44.75 94.375 42.0312 91C39.3125 87.5938 37.1406 83.7344 35.5156 79.4219C33.9219 75.0781 33.125 70.3906 33.125 65.3594V43.8906C33.125 38.8594 33.9219 34.1719 35.5156 29.8281C37.1406 25.5156 39.3125 21.6562 42.0312 18.2344Z" transform="scale(0.6) translate(-30, 200)" fill="#E60024"/>
    </svg>
);

// --- 정의당 (Justice Party) ---
const JusticePartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="200" height="50" viewBox="0 0 200 50" fill="#FFD600" xmlns="http://www.w3.org/2000/svg" {...props}>
        <text x="10" y="35" fontFamily="'Noto Sans KR', sans-serif" fontSize="30" fontWeight="900">정의당</text>
    </svg>
);

// --- 진보당 (Progressive Party) ---
const ProgressivePartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="200" height="50" viewBox="0 0 200 50" fill="#5A007F" xmlns="http://www.w3.org/2000/svg" {...props}>
        <text x="10" y="35" fontFamily="'Noto Sans KR', sans-serif" fontSize="30" fontWeight="900">진보당</text>
    </svg>
);

// --- 조국혁신당 (Rebuilding Korea Party) ---
const RebuildingKoreaPartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="250" height="50" viewBox="0 0 250 50" fill="#00224F" xmlns="http://www.w3.org/2000/svg" {...props}>
        <text x="10" y="35" fontFamily="'Noto Sans KR', sans-serif" fontSize="30" fontWeight="900">조국혁신당</text>
    </svg>
);

// --- 개혁신당 (Reform Party) ---
const ReformPartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="200" height="50" viewBox="0 0 200 50" fill="#FF7E35" xmlns="http://www.w3.org/2000/svg" {...props}>
        <text x="10" y="35" fontFamily="'Noto Sans KR', sans-serif" fontSize="30" fontWeight="900">개혁신당</text>
    </svg>
);

// --- 새로운미래 (New Future Party) ---
const NewFuturePartyLogoHorizontal: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="200" height="50" viewBox="0 0 200 50" fill="#00A5E3" xmlns="http://www.w3.org/2000/svg" {...props}>
        <text x="10" y="35" fontFamily="'Noto Sans KR', sans-serif" fontSize="30" fontWeight="900">새로운미래</text>
    </svg>
);


interface BrandAsset {
    id: string;
    label: string;
    component: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface PartyBranding {
    officialName: string;
    colors: { [key: string]: string };
    assets: BrandAsset[];
    colorPaletteKey: string;
}

export const PARTY_BRANDING: { [key: string]: PartyBranding } = {
    '더불어민주당': {
        officialName: '더불어민주당',
        colors: {
            'minju-blue': '#004EA2',
            'future-purple': '#5A2A84',
            'hope-green': '#00847B',
        },
        assets: [
            { id: 'minjoo_logo_horizontal', label: '가로형 로고', component: MinjooPartyLogoHorizontal },
            { id: 'minjoo_logo_vertical', label: '세로형 로고', component: MinjooPartyLogoVertical },
        ],
        colorPaletteKey: '더불어민주당 공식 색상',
    },
    '국민의힘': {
        officialName: '국민의힘',
        colors: {
            'ppp-red': '#E60024',
            'ppp-gray': '#231F20',
        },
        assets: [
            { id: 'ppp_logo_horizontal', label: '가로형 로고', component: PeoplePowerPartyLogoHorizontal },
            { id: 'ppp_logo_vertical', label: '세로형 로고', component: PeoplePowerPartyLogoVertical },
        ],
        colorPaletteKey: '국민의힘 공식 색상',
    },
     '새누리당': { // Alias for 국민의힘 for user input convenience
        officialName: '국민의힘',
        colors: { 'ppp-red': '#E60024', 'ppp-gray': '#231F20', },
        assets: [
            { id: 'ppp_logo_horizontal', label: '가로형 로고', component: PeoplePowerPartyLogoHorizontal },
            { id: 'ppp_logo_vertical', label: '세로형 로고', component: PeoplePowerPartyLogoVertical },
        ],
        colorPaletteKey: '국민의힘 공식 색상',
    },
    '정의당': {
        officialName: '정의당',
        colors: { 'justice-yellow': '#FFD600' },
        assets: [
            { id: 'justice_logo_horizontal', label: '가로형 로고', component: JusticePartyLogoHorizontal },
        ],
        colorPaletteKey: '정의당 공식 색상',
    },
    '진보당': {
        officialName: '진보당',
        colors: { 'progressive-purple': '#5A007F' },
        assets: [
            { id: 'progressive_logo_horizontal', label: '가로형 로고', component: ProgressivePartyLogoHorizontal },
        ],
        colorPaletteKey: '진보당 공식 색상',
    },
    '조국혁신당': {
        officialName: '조국혁신당',
        colors: { 'rebuildingkorea-blue': '#00224F' },
        assets: [
            { id: 'rebuildingkorea_logo_horizontal', label: '가로형 로고', component: RebuildingKoreaPartyLogoHorizontal },
        ],
        colorPaletteKey: '조국혁신당 공식 색상',
    },
    '개혁신당': {
        officialName: '개혁신당',
        colors: { 'reform-orange': '#FF7E35' },
        assets: [
            { id: 'reform_logo_horizontal', label: '가로형 로고', component: ReformPartyLogoHorizontal },
        ],
        colorPaletteKey: '개혁신당 공식 색상',
    },
    '새로운미래': {
        officialName: '새로운미래',
        colors: {
            'future-blue': '#00A5E3',
            'life-green': '#00A550',
            'hope-yellow': '#FFD400',
        },
        assets: [
            { id: 'newfuture_logo_horizontal', label: '가로형 로고', component: NewFuturePartyLogoHorizontal },
        ],
        colorPaletteKey: '새로운미래 공식 색상',
    },
};