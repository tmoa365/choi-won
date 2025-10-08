import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { DesignBrief, DesignDocument, DesignProject, DesignType, GenerationOption, DesignPage } from '../types';
import { Modal, Button, Textarea, Input, Select, Label } from './ui';
import { SpinnerIcon, SparklesIcon, CheckCircleIcon } from './icons';
import { expandBriefFromIdea, generateFullDesignPreviews, convertPreviewToEditableDocument } from '../services';
import { DESIGN_KEYWORDS, getAvailableColorPalettes, TONE_AND_MANNERS } from '../constants';
import { getApiErrorMessage } from '../vicEdit/utils';
import { KOREAN_FONTS_LIST } from './fonts';

interface GenerationWizardModalProps {
    initialIdea: string;
    initialDesignType?: GenerationOption | null;
    projectData: DesignProject;
    onClose: () => void;
    onDesignCreated: (newDocument: DesignDocument, newBrief: DesignBrief) => void;
    setError: (error: string | null) => void;
}

type WizardStep = 'selectingType' | 'gatheringInfo' | 'expandingBrief' | 'editingBrief' | 'generatingPreviews' | 'selectingPreview' | 'converting';

const designOptions: { type: GenerationOption, label: string }[] = Object.values(DesignType).map(t => ({type: t, label: t}));
designOptions.push({type: 'BusinessCardSet', label: '명함 (앞/뒷면)'});


const WIZARD_STEPS = [
    { id: 1, name: '종류 선택', states: ['selectingType'] },
    { id: 2, name: '정보 입력', states: ['gatheringInfo', 'expandingBrief'] },
    { id: 3, name: '기획서 수정', states: ['editingBrief'] },
    { id: 4, name: '시안 선택', states: ['generatingPreviews', 'selectingPreview', 'converting'] }
];

export const GenerationWizardModal: React.FC<GenerationWizardModalProps> = ({
    initialIdea, initialDesignType, projectData, onClose, onDesignCreated, setError
}) => {
    const [step, setStep] = useState<WizardStep>(initialDesignType ? 'gatheringInfo' : 'selectingType');
    const [brief, setBrief] = useState<DesignBrief | null>(null);
    const [designType, setDesignType] = useState<GenerationOption>(initialDesignType || DesignType.Poster);
    const [contextInfo, setContextInfo] = useState<Record<string, string>>({});
    const [previews, setPreviews] = useState<string[]>([]);
    const [idea, setIdea] = useState(initialIdea);
    
    const availableColorPalettes = useMemo(() => getAvailableColorPalettes(), []);

    const handleBack = useCallback(() => {
        switch (step) {
            case 'gatheringInfo':
                if (!initialDesignType) setStep('selectingType');
                else onClose();
                break;
            case 'editingBrief':
                setStep('gatheringInfo');
                break;
            case 'selectingPreview':
                setStep('editingBrief');
                setPreviews([]); // Clear previews when going back
                break;
            default:
                break;
        }
    }, [step, initialDesignType, onClose]);

    const handleStartExpansion = async () => {
        if (!idea.trim()) {
            setError("핵심 아이디어를 입력해주세요.");
            return;
        }
        setStep('expandingBrief');
        setError(null);
        try {
            let descriptiveIdea = idea;
            const baseDesignType = designType === 'BusinessCardSet' ? DesignType.BusinessCardFront : designType as DesignType;

            switch (baseDesignType) {
                case DesignType.Poster:
                    descriptiveIdea = `${idea} (${contextInfo.purpose || '이벤트'})`;
                    break;
                case DesignType.Banner:
                case DesignType.Placard:
                    descriptiveIdea = `${idea} (${contextInfo.finishing || '타공'} 방식 현수막)`;
                    break;
                 case DesignType.Flyer:
                    descriptiveIdea = `${idea} (${contextInfo.distribution_method || '매장 비치'}용 전단지)`;
                    break;
                case DesignType.Invitation:
                    descriptiveIdea = `${contextInfo.event_type || '행사'} 초대장: ${idea}`;
                    break;
            }

            const expandedBrief = await expandBriefFromIdea(descriptiveIdea, baseDesignType, contextInfo);
            setBrief(expandedBrief);
            setStep('editingBrief');
        } catch (err) {
            setError(getApiErrorMessage(err, 'AI 브리핑 생성'));
            onClose();
        }
    };
    
    const handleBriefChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!brief) return;
        const { name, value } = e.target;
        setBrief(prev => prev ? { ...prev, [name]: value } : null);
    };
    
    const handleKeywordsChange = (keyword: string) => {
        if (!brief) return;
        const newKeywords = brief.keywords.includes(keyword)
            ? brief.keywords.filter(k => k !== keyword)
            : [...brief.keywords, keyword];
        if (newKeywords.length > 3) return;
        setBrief(prev => prev ? { ...prev, keywords: newKeywords } : null);
    };
    
    const handleGeneratePreviews = async () => {
        if (!brief) return;
        setStep('generatingPreviews');
        setError(null);
        try {
            const tempProjectData = { ...projectData, designBrief: brief };
            const typeForPreview = designType === 'BusinessCardSet' ? DesignType.BusinessCardFront : designType as DesignType;
            const results = await generateFullDesignPreviews(typeForPreview, tempProjectData, 3);
            setPreviews(results);
            setStep('selectingPreview');
        } catch (err) {
            setError(getApiErrorMessage(err, '디자인 시안 생성'));
            setStep('editingBrief');
        }
    };
    
    const handleSelectPreview = async (selectedBase64: string) => {
        if (!brief) return;
        setStep('converting');
        setError(null);
        try {
            const tempProjectData = { ...projectData, designBrief: brief };
            const newDocument = await convertPreviewToEditableDocument(selectedBase64, designType, tempProjectData);
            
            const finalPages = newDocument.pages.map(p => {
                let pageUpdates: Partial<DesignPage> = {};
                if ([DesignType.TShirt, DesignType.EcoBag, DesignType.Cap, DesignType.Pouch].includes(p.type as DesignType)) {
                    pageUpdates.mockup = { color: contextInfo.product_color || '흰색' };
                }
                 if (p.type === DesignType.WindowSheeting) {
                    pageUpdates.attachmentDirection = (contextInfo.attachment_direction as 'inside' | 'outside') || 'outside';
                }
                return {...p, ...pageUpdates};
            });

            onDesignCreated({...newDocument, pages: finalPages}, brief);
        } catch (err) {
            setError(getApiErrorMessage(err, '디자인 변환'));
            setStep('selectingPreview');
        }
    };
    
    const handleContextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setContextInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const renderContextForm = () => {
        const baseDesignType = designType === 'BusinessCardSet' ? DesignType.BusinessCardFront : designType as DesignType;

        switch (baseDesignType) {
            case DesignType.Poster:
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>1. 포스터의 목적을 알려주세요.</Label>
                            <Select name="purpose" onChange={handleContextChange}>
                                <option>매장 할인 / 이벤트 홍보</option>
                                <option>신제품 / 신메뉴 출시 안내</option>
                                <option>공연 / 행사 / 전시회 알림</option>
                                <option>매장 오픈 / 이전 안내</option>
                                <option>모집 / 채용 공고</option>
                            </Select>
                        </div>
                        <div>
                            <Label>2. 가장 중요한 핵심 정보를 입력해 주세요.</Label>
                            <div className="space-y-2 p-3 bg-slate-100 rounded">
                                <Input name="headline" onChange={handleContextChange} placeholder="가장 큰 제목 (예: TMOA 스튜디오 50% SALE)" />
                                <Input name="date_time" onChange={handleContextChange} placeholder="날짜 및 시간 (예: 2025.10.15 ~ 10.31)" />
                                <Input name="location" onChange={handleContextChange} placeholder="장소 / 위치 (예: 라페스타 B동 1층)" />
                                <Input name="host_contact" onChange={handleContextChange} placeholder="주최 / 문의 (예: 주최: 티모아 / 문의: 010-1234-5678)" />
                            </div>
                        </div>
                        <div>
                            <Label>3. 어디에, 어떻게 부착하실 건가요?</Label>
                            <Select name="attachment_location" onChange={handleContextChange}>
                                <option value="indoor">실내 (벽, 문 등)</option>
                                <option value="outdoor">실외 (비/햇빛 노출)</option>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1">
                                {contextInfo.attachment_location === 'outdoor' 
                                    ? "실외용은 방수 및 내구성이 강한 PET 재질로 제작됩니다." 
                                    : "실내용은 경제적인 고품질 스노우지로 제작됩니다."}
                            </p>
                        </div>
                    </div>
                );
            case DesignType.Banner:
            case DesignType.Placard:
                return (<div className="space-y-4">
                    <div>
                        <Label>1. 어떻게 설치하실 건가요? (후가공 선택)</Label>
                        <Select name="finishing" onChange={handleContextChange}>
                            <option>끈으로 묶어서 (타공/아일렛)</option>
                            <option>막대/봉에 끼워서 (봉 미싱)</option>
                            <option>벽에 붙이거나 덮개로 (열재단)</option>
                            <option>실내 거치대(X배너)에 세워서 (네 귀퉁이 타공)</option>
                        </Select>
                    </div>
                    <div>
                        <Label>2. 현수막의 핵심 문구를 알려주세요.</Label>
                         <div className="space-y-2 p-3 bg-slate-100 rounded">
                            <Input name="main_slogan" onChange={handleContextChange} placeholder="메인 문구 (가장 크게)" />
                            <Input name="sub_slogan" onChange={handleContextChange} placeholder="보조 문구 (선택 사항)" />
                        </div>
                    </div>
                     <div>
                        <Label>3. 원하시는 사이즈를 선택 또는 입력해 주세요.</Label>
                         <div className="grid grid-cols-2 gap-2">
                             <Input name="width_cm" type="number" onChange={handleContextChange} placeholder="가로 (cm)" />
                             <Input name="height_cm" type="number" onChange={handleContextChange} placeholder="세로 (cm)" />
                         </div>
                         <p className="text-xs text-slate-500 mt-1">일반 가로 현수막: 500x90cm / X배너: 60x180cm</p>
                    </div>
                </div>);
            case DesignType.Flyer:
                 return (<div className="space-y-4">
                    <div>
                        <Label>1. 배포 방식을 선택해 주세요.</Label>
                        <Select name="distribution_method" onChange={handleContextChange}>
                            <option>매장 비치 / 직접 전달</option>
                            <option>아파트/주택 우편함</option>
                            <option>길거리 배포</option>
                        </Select>
                    </div>
                    <div>
                        <Label>2. 전단지의 핵심 내용을 입력해 주세요.</Label>
                         <div className="space-y-2 p-3 bg-slate-100 rounded">
                             <Input name="headline" onChange={handleContextChange} placeholder="시선을 끄는 제목"/>
                             <Textarea name="details" rows={3} onChange={handleContextChange} placeholder="상세 내용 (이벤트 기간, 가격 등)"/>
                             <Input name="cta" onChange={handleContextChange} placeholder="고객 행동 유도 문구 (예: 하단 쿠폰을 오려오세요!)"/>
                             <Input name="info" onChange={handleContextChange} placeholder="필수 정보 (주소, 연락처, 약도 등)"/>
                        </div>
                    </div>
                    <div>
                        <Label>3. (선택) 접지 옵션을 추가할까요?</Label>
                        <Select name="folding_option" onChange={handleContextChange}>
                            <option>아니오 (일반 전단지)</option>
                            <option>네, 2단 접지 (반으로 접기)</option>
                            <option>네, 3단 접지</option>
                        </Select>
                    </div>
                </div>);
             case DesignType.Leaflet:
                return (<div className="space-y-4">
                    <div>
                        <Label>1. 접는 방식을 먼저 선택해 주세요.</Label>
                        <Select name="folding_type" onChange={handleContextChange}>
                            <option>2단 접지 (총 4면)</option>
                            <option>3단 접지 (총 6면)</option>
                            <option>대문 접지 (총 8면)</option>
                        </Select>
                    </div>
                    <div>
                        <Label>2. 각 페이지에 들어갈 내용을 알려주세요.</Label>
                         <div className="space-y-2 p-3 bg-slate-100 rounded">
                             <Textarea name="page_content_cover" rows={2} onChange={handleContextChange} placeholder="표지 내용 (로고, 제목 등)"/>
                             <Textarea name="page_content_inner" rows={4} onChange={handleContextChange} placeholder="내지 내용 (펼쳤을 때 보일 상세 정보)"/>
                             <Textarea name="page_content_back" rows={2} onChange={handleContextChange} placeholder="뒷면 내용 (연락처, 약도, 주소 등)"/>
                        </div>
                    </div>
                </div>);
            case DesignType.Booklet:
                 return (<div className="space-y-4">
                    <div>
                        <Label>1. 전체 페이지 수를 알려주세요.</Label>
                        <Input name="page_count" type="number" step="4" min="8" onChange={handleContextChange} placeholder="표지 포함, 4의 배수 (예: 8, 12, 16...)" />
                        <p className="text-xs text-slate-500 mt-1">40p 이하: 중철 제본, 40p 이상: 무선 제본 추천</p>
                    </div>
                    <div>
                        <Label>2. 책자의 기본 정보를 입력해 주세요.</Label>
                        <div className="space-y-2 p-3 bg-slate-100 rounded">
                           <Input name="book_title" onChange={handleContextChange} placeholder="책자 제목" />
                           <Input name="publisher" onChange={handleContextChange} placeholder="발행처 / 저자" />
                           <Input name="publish_date" onChange={handleContextChange} placeholder="발행일" />
                        </div>
                    </div>
                     <div>
                        <Label>3. 목차를 입력해 주세요. (AI가 내지 디자인 시 참고합니다)</Label>
                        <Textarea name="toc" rows={4} onChange={handleContextChange} placeholder="예: 1. 회사 소개&#10;2. 제품 라인업&#10;3. 기술 사양..."/>
                    </div>
                </div>);
            case DesignType.Invitation:
                return (<div className="space-y-4">
                     <div>
                        <Label>1. 어떤 행사에 초대하시나요?</Label>
                        <Select name="event_type" onChange={handleContextChange}>
                            <option>개업식 / 오픈식</option>
                            <option>VIP 고객 초청회</option>
                            <option>기념식 / 창립행사</option>
                            <option>개인 파티 / 행사</option>
                        </Select>
                    </div>
                    <div>
                        <Label>2. 행사 정보를 6하 원칙에 따라 입력해 주세요.</Label>
                        <div className="space-y-2 p-3 bg-slate-100 rounded">
                           <Input name="who" onChange={handleContextChange} placeholder="누가 (주최)" />
                           <Input name="to_whom" onChange={handleContextChange} placeholder="누구에게 (초대 대상)" />
                           <Input name="when" onChange={handleContextChange} placeholder="언제 (일시)" />
                           <Input name="where" onChange={handleContextChange} placeholder="어디서 (장소)" />
                           <Input name="what" onChange={handleContextChange} placeholder="무엇을 (행사명)" />
                           <Input name="how" onChange={handleContextChange} placeholder="어떻게 (행사 내용, 드레스코드 등)" />
                        </div>
                    </div>
                </div>);
            case DesignType.Ticket:
                 return (<div className="space-y-4">
                     <div>
                        <Label>1. 행사 정보를 입력해 주세요.</Label>
                        <div className="space-y-2 p-3 bg-slate-100 rounded">
                           <Input name="event_name" onChange={handleContextChange} placeholder="행사명" />
                           <Input name="date_place" onChange={handleContextChange} placeholder="일시 및 장소" />
                           <Input name="seat_info" onChange={handleContextChange} placeholder="좌석 정보 (예: R석, A구역, 자유석)" />
                        </div>
                    </div>
                    <div>
                        <Label>2. 필수 가공 옵션을 선택해 주세요.</Label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2"><Input type="checkbox" name="use_numbering" id="use_numbering" onChange={e => handleContextChange(e)} /><Label htmlFor="use_numbering" className="mb-0">넘버링 (일련번호) 추가</Label></div>
                            <div className="flex items-center gap-2"><Input type="checkbox" name="use_perforation" id="use_perforation" onChange={e => handleContextChange(e)} /><Label htmlFor="use_perforation" className="mb-0">절취선 (뜯는 선) 추가</Label></div>
                        </div>
                    </div>
                </div>);
            case DesignType.WindowSheeting:
                 return (<div className="space-y-4">
                    <div>
                        <Label>1. 부착할 유리의 가로, 세로 사이즈를 알려주세요. (cm)</Label>
                        <div className="grid grid-cols-2 gap-2">
                           <Input name="width_cm" type="number" onChange={handleContextChange} placeholder="가로 (cm)" />
                           <Input name="height_cm" type="number" onChange={handleContextChange} placeholder="세로 (cm)" />
                        </div>
                    </div>
                    <div>
                        <Label>2. 어떤 목적으로 사용하시나요?</Label>
                        <Select name="purpose" onChange={handleContextChange}>
                            <option>영업시간, 로고 등 정보 전달 (글자 커팅)</option>
                            <option>신제품, 이벤트 등 이미지 홍보 (실사 출력)</option>
                            <option>외부 시선 차단 / 인테리어 (안개 시트)</option>
                        </Select>
                    </div>
                    <div>
                        <Label>3. 부착 위치를 선택해 주세요. (중요)</Label>
                        <Select name="attachment_direction" onChange={handleContextChange}>
                            <option value="outside">유리 바깥쪽에 부착</option>
                            <option value="inside">유리 안쪽에 부착 (밖에서 보이도록)</option>
                        </Select>
                         <p className="text-xs text-slate-500 mt-1">'내부 부착' 선택 시, 최종 결과물은 좌우 반전되어 생성됩니다.</p>
                    </div>
                </div>);
            case DesignType.BusinessCardFront:
            case DesignType.MobileBusinessCard:
                return (<div className="grid grid-cols-2 gap-4">
                    <div><Label>이름</Label><Input name="name" onChange={handleContextChange} placeholder="김민준" /></div>
                    <div><Label>직책</Label><Input name="title" onChange={handleContextChange} placeholder="그래픽 디자이너" /></div>
                    <div className="col-span-2"><Label>회사명 (선택)</Label><Input name="company" onChange={handleContextChange} /></div>
                    <div><Label>전화번호</Label><Input name="phone" type="tel" onChange={handleContextChange} placeholder="010-1234-5678"/></div>
                    <div><Label>이메일</Label><Input name="email" type="email" onChange={handleContextChange} placeholder="minjun@example.com"/></div>
                    <div className="col-span-2"><Label>주소/웹사이트 (선택)</Label><Input name="address_website" onChange={handleContextChange} /></div>
                </div>);
            case DesignType.Menu:
                return (<div className="space-y-4">
                    <div><Label>음식점/카페 종류</Label><Input name="restaurant_type" onChange={handleContextChange} placeholder="예: 이탈리안 레스토랑, 베이커리 카페"/></div>
                    <div><Label>대표 메뉴 (3-4개)</Label><Textarea name="menu_items" rows={3} onChange={handleContextChange} placeholder="파스타, 피자, 스테이크, 와인"/></div>
                </div>);
            case DesignType.Coupon:
                return (<div className="grid grid-cols-2 gap-4">
                    <div><Label>스탬프 개수</Label><Input name="stamp_count" type="number" defaultValue="10" onChange={handleContextChange}/></div>
                    <div><Label>보상 내용</Label><Input name="reward" defaultValue="아메리카노 1잔 무료" onChange={handleContextChange}/></div>
                </div>);
            case DesignType.ProductTag:
                return (<div className="grid grid-cols-2 gap-4">
                    <div><Label>제품명</Label><Input name="product_name" onChange={handleContextChange}/></div>
                    <div><Label>가격</Label><Input name="price" onChange={handleContextChange}/></div>
                </div>);
            case DesignType.ProductBox:
                return (<div className="space-y-4">
                    <div><Label>제품명</Label><Input name="product_name" onChange={handleContextChange} placeholder="예: 글로우 세럼"/></div>
                    <div><Label>핵심 특징</Label><Input name="product_feature" onChange={handleContextChange} placeholder="예: 비타민 C 함유, 수분 광채"/></div>
                </div>);
            case DesignType.TShirt:
            case DesignType.EcoBag:
            case DesignType.Cap:
            case DesignType.Pouch:
                 return (<div className="space-y-4">
                    <div><Label>그래픽 컨셉</Label><Input name="graphic_concept" onChange={handleContextChange} placeholder="예: 파도타는 고양이 일러스트"/></div>
                    <div><Label>제품 색상</Label><Select name="product_color" onChange={handleContextChange}><option>흰색</option><option>검정색</option><option>회색</option><option>네이비</option></Select></div>
                    {baseDesignType === DesignType.TShirt && <div><Label>인쇄 위치</Label><Select name="print_location" onChange={handleContextChange}><option>앞면 중앙</option><option>왼쪽 가슴</option><option>등판 중앙</option></Select></div>}
                </div>);
            default:
                return <p>이 디자인 유형에는 추가 정보가 필요하지 않습니다.</p>;
        }
    };

    const currentStepInfo = WIZARD_STEPS.find(s => s.states.includes(step));
    const isLoading = step === 'expandingBrief' || step === 'generatingPreviews' || step === 'converting';

    return (
        <Modal title="AI 디자인 생성 마법사" onClose={isLoading ? () => {} : onClose} size="4xl">
            <div className="min-h-[60vh] flex flex-col">
                <div className="flex items-center justify-center mb-8">
                    {WIZARD_STEPS.map((s, index) => (
                        <React.Fragment key={s.id}>
                            <div className="flex items-center">
                                {currentStepInfo && s.id < currentStepInfo.id ? (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${currentStepInfo && s.id === currentStepInfo.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {s.id}
                                    </div>
                                )}
                                <span className={`ml-2 text-sm font-semibold ${currentStepInfo && s.id <= currentStepInfo.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.name}</span>
                            </div>
                            {index < WIZARD_STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-4" />}
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="flex-grow">
                     {step === 'selectingType' && (
                        <div>
                            <p className="text-center text-slate-500 mb-4">선택에 따라 AI가 맞춤형 질문을 합니다.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto p-1">
                                {designOptions.map(opt => (
                                    <button key={opt.type} onClick={() => { setDesignType(opt.type); setStep('gatheringInfo'); }}
                                        className="p-6 border rounded-lg hover:bg-indigo-50 hover:border-indigo-500 text-left transition-colors">
                                        <span className="font-bold text-slate-800">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                     )}

                     {step === 'gatheringInfo' && (
                         <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                            <div>
                               <Label required>핵심 아이디어 또는 제목</Label>
                               <Input 
                                   value={idea} 
                                   onChange={e => setIdea(e.target.value)} 
                                   placeholder="예: 우리 동네 유기농 빵집 오픈 포스터"
                                   autoFocus
                                />
                            </div>
                            <div className="pt-4 border-t">
                                <Label className="font-semibold">{designType === 'BusinessCardSet' ? '명함' : designType}에 필요한 추가 정보</Label>
                                <p className="text-xs text-slate-500 mb-2">AI가 더 정확한 기획서를 만들 수 있도록 상세 정보를 입력해주세요.</p>
                                {renderContextForm()}
                            </div>
                        </div>
                     )}

                    {(step === 'expandingBrief' || step === 'generatingPreviews' || step === 'converting') && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[40vh]">
                            <SpinnerIcon className="w-12 h-12 text-indigo-600 animate-spin" />
                            <p className="mt-4 font-semibold">
                                {step === 'expandingBrief' && 'AI가 아이디어를 분석하여 디자인 기획서를 만들고 있습니다...'}
                                {step === 'generatingPreviews' && 'AI가 디자인 시안을 생성 중입니다...'}
                                {step === 'converting' && '선택한 시안을 분석하여 편집 가능한 디자인으로 변환 중...'}
                            </p>
                            {step === 'generatingPreviews' && <p className="text-slate-500">잠시만 기다려주세요. 이 과정은 최대 1분 정도 소요될 수 있습니다.</p>}
                        </div>
                    )}
                    
                    {step === 'editingBrief' && brief && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg max-h-[55vh] overflow-y-auto">
                            <div><Label required>제목</Label><Input name="title" value={brief.title} onChange={handleBriefChange}/></div>
                            <div><Label>부제목</Label><Input name="subtitle" value={brief.subtitle} onChange={handleBriefChange}/></div>
                            <div className="md:col-span-2"><Label>본문 내용</Label><Textarea name="bodyText" value={brief.bodyText} onChange={handleBriefChange} rows={3}/></div>
                            <div><Label>키워드 (최대 3개)</Label><div className="flex flex-wrap gap-2 mt-2">{DESIGN_KEYWORDS.map(k => (<button key={k} type="button" onClick={() => handleKeywordsChange(k)} className={`px-3 py-1 text-sm rounded-full border ${brief.keywords.includes(k) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{k}</button>))}</div></div>
                            <div><Label>대표 글꼴</Label><Select name="fontFamily" value={brief.fontFamily} onChange={handleBriefChange}>{KOREAN_FONTS_LIST.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</Select></div>
                             <div><Label>메인 색상 팔레트</Label><Select name="colorPalette" value={brief.colorPalette} onChange={handleBriefChange}>{Object.keys(availableColorPalettes).map(c => <option key={c} value={c}>{c}</option>)}</Select></div>
                             <div><Label>이미지 톤앤매너</Label><Select name="toneAndManner" value={brief.toneAndManner} onChange={handleBriefChange}>{Object.keys(TONE_AND_MANNERS).map(t => <option key={t} value={t}>{t}</option>)}</Select></div>
                        </div>
                    )}
                    
                    {step === 'selectingPreview' && (
                         <div className="relative">
                            {previews.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {previews.map((base64, index) => (
                                    <div key={index} className="aspect-video bg-slate-200 rounded-xl overflow-hidden cursor-pointer group relative shadow-lg hover:shadow-2xl transition-shadow" onClick={() => handleSelectPreview(base64)}>
                                        <img src={`data:image/png;base64,${base64}`} alt={`디자인 시안 ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-xl">이 디자인 선택</span>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
                
                <div className="mt-8 pt-4 border-t flex justify-between items-center">
                    <div>
                        {(step === 'gatheringInfo' || step === 'editingBrief' || step === 'selectingPreview') && (
                            <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
                                뒤로
                            </Button>
                        )}
                    </div>
                    <div>
                        {step === 'gatheringInfo' && (
                             <Button onClick={handleStartExpansion} size="md" disabled={!idea.trim()}>
                                <SparklesIcon className="h-5 w-5 mr-2"/>
                                AI 기획서 생성하기
                            </Button>
                        )}
                        {step === 'editingBrief' && brief && (
                            <Button onClick={handleGeneratePreviews} size="md">
                                <SparklesIcon className="h-5 w-5 mr-2"/>
                                디자인 시안 생성하기
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </Modal>
    );
};