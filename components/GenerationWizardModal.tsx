import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { DesignBrief, DesignDocument, DesignProject, DesignType, GenerationOption, DesignPage } from '../types';
import { Modal, Button, Textarea, Input, Select, Label } from './ui';
import { SpinnerIcon, SparklesIcon, CheckCircleIcon } from './icons';
import { expandBriefFromIdea, generateFullDesignPreviews, convertPreviewToEditableDocument } from '../services/geminiService';
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
            const expandedBrief = await expandBriefFromIdea(idea, designType as DesignType, contextInfo);
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
            
            // Add mockup/dieline info to the created document's pages
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
            case DesignType.Poster:
            case DesignType.Flyer:
            case DesignType.Invitation:
            case DesignType.Ticket:
            case DesignType.POP:
                return (<div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>행사/제품명</Label><Input name="event_name" onChange={handleContextChange} placeholder="어반 그라인드 카페 오픈"/></div>
                    <div><Label>날짜/시간</Label><Input name="date_time" onChange={handleContextChange} placeholder="8월 24일 오후 2시" /></div>
                    <div><Label>장소</Label><Input name="location" onChange={handleContextChange} placeholder="서울시 커피구 향기로운 123" /></div>
                </div>);
            case DesignType.Banner:
            case DesignType.Placard:
                return (<div className="space-y-4">
                    <div><Label>핵심 문구</Label><Input name="main_slogan" onChange={handleContextChange} /></div>
                    <div><Label>보조 문구 (선택)</Label><Input name="sub_slogan" onChange={handleContextChange} /></div>
                    <div><Label>후가공/설치방식</Label><Select name="finishing" onChange={handleContextChange}><option>타공 (아일렛)</option><option>봉 미싱</option><option>열재단</option></Select></div>
                </div>);
            case DesignType.CardNews:
            case DesignType.Booklet:
            case DesignType.Leaflet:
                return (<div className="space-y-4">
                    <div><Label>주제</Label><Input name="topic" onChange={handleContextChange} /></div>
                    <div><Label>핵심 내용 (요약)</Label><Textarea name="content_summary" rows={4} onChange={handleContextChange} /></div>
                    {baseDesignType === DesignType.Leaflet && <div><Label>접지 방식</Label><Select name="folding" onChange={handleContextChange}><option>2단 접지</option><option>3단 접지</option><option>대문 접지</option></Select></div>}
                </div>);
            case DesignType.VColoring:
                return (<div><Label>테마/분위기</Label><Input name="theme" onChange={handleContextChange} placeholder="예: 차분하고 전문적인, 밝고 경쾌한" /></div>);
            case DesignType.SeasonalGreeting:
                 return (<div><Label>절기/명절</Label><Input name="holiday" onChange={handleContextChange} placeholder="예: 추석, 설날, 크리스마스" /></div>);
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
            case DesignType.WindowSheeting:
                 return (<div className="space-y-4">
                    <div><Label>부착 방식</Label>
                        <Select name="attachment_direction" onChange={handleContextChange}>
                            <option value="outside">외부 부착 (일반)</option>
                            <option value="inside">내부 부착 (반전 인쇄)</option>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">'내부 부착' 선택 시, 밖에서 보이도록 안쪽에 붙이며 최종 결과물은 좌우 반전되어 생성됩니다.</p>
                    </div>
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