import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import { DesignBrief, DesignDocument, DesignProject, DesignType, GenerationOption, DesignPage } from '../types';
import { Modal, Button, Textarea, Input, Select, Label } from './ui';
import { SpinnerIcon, SparklesIcon, CheckCircleIcon, UploadIcon } from './icons';
import { expandBriefFromIdea, generateFullDesignPreviews, convertPreviewToEditableDocument } from '../services';
import { DESIGN_KEYWORDS, getAvailableColorPalettes, TONE_AND_MANNERS } from '../constants';
import { getApiErrorMessage, fileToDataURL } from '../vicEdit/utils';
import { KOREAN_FONTS_LIST } from './fonts';

interface GenerationWizardModalProps {
    initialIdea: string;
    initialDesignType?: GenerationOption | null;
    projectData: DesignProject;
    onClose: () => void;
    onDesignCreated: (newDocument: DesignDocument, newBrief: DesignBrief) => void;
    setError: (error: string | null) => void;
}

type WizardStep = 'ideaSubmission' | 'expandingBrief' | 'editingBrief' | 'generatingPreviews' | 'selectingPreview' | 'converting';

const WIZARD_STEPS = [
    { id: 1, name: '아이디어 제출', states: ['ideaSubmission'] },
    { id: 2, name: 'AI 기획', states: ['expandingBrief'] },
    { id: 3, name: '기획서 수정', states: ['editingBrief'] },
    { id: 4, name: '시안 선택', states: ['generatingPreviews', 'selectingPreview', 'converting'] }
];

export const GenerationWizardModal: React.FC<GenerationWizardModalProps> = ({
    initialIdea, initialDesignType, projectData, onClose, onDesignCreated, setError
}) => {
    const [step, setStep] = useState<WizardStep>('ideaSubmission');
    const [brief, setBrief] = useState<DesignBrief | null>(null);
    const [designType, setDesignType] = useState<GenerationOption>(initialDesignType || DesignType.Poster);
    const [previews, setPreviews] = useState<string[]>([]);
    const [idea, setIdea] = useState(initialIdea);
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const availableColorPalettes = useMemo(() => getAvailableColorPalettes(), []);

    useEffect(() => {
        if (referenceImage) {
            const objectUrl = URL.createObjectURL(referenceImage);
            setImagePreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setImagePreview(null);
        }
    }, [referenceImage]);
    
    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            setReferenceImage(files[0]);
        }
    };

    const handleBack = useCallback(() => {
        switch (step) {
            case 'editingBrief':
                setStep('ideaSubmission');
                break;
            case 'selectingPreview':
                setStep('editingBrief');
                setPreviews([]); // Clear previews when going back
                break;
            default:
                break;
        }
    }, [step]);

    const handleStartExpansion = async () => {
        if (!idea.trim()) {
            setError("핵심 아이디어를 입력해주세요.");
            return;
        }
        setStep('expandingBrief');
        setError(null);
        try {
            const baseDesignType = designType === 'BusinessCardSet' ? DesignType.BusinessCardFront : designType as DesignType;
            
            let imageBase64: string | undefined;
            let mimeType: string | undefined;

            if (referenceImage) {
                const dataUrl = await fileToDataURL(referenceImage);
                const parts = dataUrl.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch) {
                    mimeType = mimeMatch[1];
                    imageBase64 = parts[1];
                }
            }
            
            const expandedBrief = await expandBriefFromIdea(idea, baseDesignType, imageBase64, mimeType);
            setBrief(expandedBrief);
            setStep('editingBrief');
        } catch (err) {
            setError(getApiErrorMessage(err, 'AI 브리핑 생성'));
            setStep('ideaSubmission'); // Go back to the idea step on error
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
            onDesignCreated(newDocument, brief);
        } catch (err) {
            setError(getApiErrorMessage(err, '디자인 변환'));
            setStep('selectingPreview');
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
                    {step === 'ideaSubmission' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
                            <div className="space-y-4">
                                <div>
                                    <Label required>1. 만들고 싶은 디자인에 대해 자유롭게 설명해주세요.</Label>
                                    <Textarea 
                                        value={idea} 
                                        onChange={e => setIdea(e.target.value)} 
                                        placeholder="예: 우리 동네 유기농 빵집 오픈 포스터, 신선하고 자연친화적인 느낌으로요. 10월 한 달간 런치 할인 이벤트도 넣고 싶어요."
                                        rows={6}
                                        autoFocus
                                    />
                                </div>
                                {!initialDesignType && (
                                    <div>
                                        <Label required>2. 디자인 종류를 선택하세요.</Label>
                                        <Select value={designType} onChange={e => setDesignType(e.target.value as GenerationOption)}>
                                            {Object.values(DesignType).map(t => <option key={t} value={t}>{t}</option>)}
                                            <option value="BusinessCardSet">명함 (앞/뒷면)</option>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>3. (선택) 원하는 느낌의 참조 이미지를 첨부하세요.</Label>
                                <div 
                                    className="relative w-full h-64 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 transition-colors"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Reference Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
                                    ) : (
                                        <>
                                            <UploadIcon className="w-10 h-10 text-slate-400"/>
                                            <p className="mt-2 text-sm text-slate-500">여기에 이미지를 드래그하거나 클릭하여 업로드</p>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e.target.files)} />
                                </div>
                                {referenceImage && <p className="text-xs text-slate-600 text-center">첨부된 파일: {referenceImage.name}</p>}
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
                        {(step === 'editingBrief' || step === 'selectingPreview') && (
                            <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
                                뒤로
                            </Button>
                        )}
                    </div>
                    <div>
                        {step === 'ideaSubmission' && (
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