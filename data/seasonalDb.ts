export interface SeasonalEvent {
  Event_Name_KR: string;
  Date_Type: 'Lunar' | 'Fixed' | 'Equinox';
  Date_Value: string; // MM/DD for Fixed/Equinox, YYYY/MM/DD array for Lunar
  Image_Keywords: string;
  Sample_Greeting: string;
}

// 음력 날짜는 향후 몇 년간의 데이터를 미리 입력 (기획안 명세)
const EVENT_CALENDAR_DB: SeasonalEvent[] = [
  { Event_Name_KR: '추석', Date_Type: 'Lunar', Date_Value: '2024/09/17,2025/10/06,2026/09/25', Image_Keywords: 'full harvest moon, persimmons, songpyeon, hanok, autumn landscape', Sample_Greeting: '풍요롭고 넉넉한 한가위, 가족과 함께 행복한 시간 보내세요.' },
  { Event_Name_KR: '설날', Date_Type: 'Lunar', Date_Value: '2025/01/29,2026/02/17,2027/02/06', Image_Keywords: 'sebaetdon lucky bag, magpie, sunrise, hanbok, kite', Sample_Greeting: '새해 복 많이 받으시고, 희망 가득한 한 해 되시길 바랍니다.' },
  { Event_Name_KR: '한글날', Date_Type: 'Fixed', Date_Value: '10/09', Image_Keywords: 'Hangul patterns, Sejong the Great, traditional books, autumn sky', Sample_Greeting: '위대한 우리 글, 한글날의 의미를 되새기는 하루 되세요.' },
  { Event_Name_KR: '크리스마스', Date_Type: 'Fixed', Date_Value: '12/25', Image_Keywords: 'christmas tree, snowflakes, gift boxes, fireplace, warm lights', Sample_Greeting: '사랑과 행복이 가득한 크리스마스, 따뜻한 연말 보내세요.' },
  { Event_Name_KR: '삼일절', Date_Type: 'Fixed', Date_Value: '03/01', Image_Keywords: 'Taegeukgi, Mugunghwa, independence movement, dove of peace', Sample_Greeting: '순국선열들의 숭고한 희생을 기리며, 감사의 마음을 전합니다.' },
  { Event_Name_KR: '밸런타인데이', Date_Type: 'Fixed', Date_Value: '02/14', Image_Keywords: 'chocolate, hearts, roses, couple, sweet mood', Sample_Greeting: '달콤한 사랑이 가득한 밸런타인데이 되세요.' },
  { Event_Name_KR: '화이트데이', Date_Type: 'Fixed', Date_Value: '03/14', Image_Keywords: 'candy, lollipop, gift box, lovely pastel tone', Sample_Greeting: '당신의 사랑에 달콤함을 더하는 화이트데이 되세요.' },
  { Event_Name_KR: '삼겹살 데이', Date_Type: 'Fixed', Date_Value: '03/03', Image_Keywords: 'grilled pork belly, sizzle, lettuce wraps, humor, delicious food', Sample_Greeting: '오늘은 삼겹살 먹는 날! 지글지글 맛있는 하루 보내세요.' },
  { Event_Name_KR: '추분', Date_Type: 'Equinox', Date_Value: '09/23', Image_Keywords: 'autumn fields, cosmos flowers, scarecrow, sunset, ripening rice', Sample_Greeting: '낮과 밤의 길이가 같아지는 추분, 풍요로운 가을 맞이하세요.' },
];

export const getAllEvents = (): SeasonalEvent[] => EVENT_CALENDAR_DB;

export const getUpcomingEvents = (days: number): SeasonalEvent | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);

    let foundEvent: { event: SeasonalEvent, date: Date } | null = null;

    for (const event of EVENT_CALENDAR_DB) {
        let eventDates: Date[] = [];
        const currentYear = today.getFullYear();

        if (event.Date_Type === 'Lunar') {
            const dates = event.Date_Value.split(',');
            dates.forEach(d => {
                const [year, month, day] = d.split('/').map(Number);
                eventDates.push(new Date(year, month - 1, day));
            });
        } else { // Fixed or Equinox
            const [month, day] = event.Date_Value.split('/').map(Number);
            eventDates.push(new Date(currentYear, month - 1, day));
            // Check for next year too, in case event for this year has passed
            eventDates.push(new Date(currentYear + 1, month - 1, day));
        }

        for (const date of eventDates) {
            if (date >= today && date <= targetDate) {
                if (!foundEvent || date < foundEvent.date) {
                    foundEvent = { event, date };
                }
            }
        }
    }

    return foundEvent ? foundEvent.event : null;
};