import React, { useState, ChangeEvent, useEffect } from 'react';
import { DesignProject, DesignType, GenerationOption, DesignBrief, DesignPage } from '../types';
import { Button, Input, Label, Select, Textarea } from '../components/ui';
import { SparklesIcon, SpinnerIcon, CheckCircleIcon, PhotoIcon, SearchIcon, TypeIcon, PaintBrushIcon, TableCellsIcon } from '../components/icons';
import { DESIGN_KEYWORDS, TONE_AND_MANNERS, getAvailableColorPalettes } from '../constants';
import { generateDesignCopy, searchImages } from '../services';
import { dataURLtoFile } from './utils';
import { v4 as uuidv4 } from 'uuid';

interface ProjectBriefPanelProps {
    projectData: DesignProject;
    updateProjectData: (updater: (prev: DesignProject) => DesignProject) => void;
    onStartGeneration: (genOption: GenerationOption, brief: DesignBrief) => void;
    editingDocumentId: string | null;
    onOpenDataDrivenModal: () => void;
    onStartWizard: (initialIdea: string) => void;
}

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; isComplete: boolean }> = ({ title, icon, isComplete }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="text-indigo-600">{icon}</span>
            <h4 className="font-bold text-sm text-slate-800">{title}</h4>
        </div>
        {isComplete && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
    </div>
);

export const ProjectBriefPanel: React.FC<ProjectBriefPanelProps> = ({ projectData, updateProjectData, onStartGeneration, editingDocumentId, onOpenDataDrivenModal, onStartWizard }) => {
    const [initialIdea, setInitialIdea] = useState('');
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    const [isSearchingImages, setIsSearchingImages] = useState(false);
    const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
    const [generationType, setGenerationType] = useState<GenerationOption>(DesignType.Poster);
    
    const { designBrief } = projectData;

    const isInitialBrief = !designBrief.title && !designBrief.bodyText && designBrief.keywords.length === 0;

    useEffect(() => {
        setInitialIdea('');
    }, [editingDocumentId]);

    const handleStartProject = () => {
        if (!initialIdea.trim()) return;
        onStartWizard(initialIdea);
    };
    
    if (isInitialBrief) {
        return (
            <div className="h-full w-full p-4 flex flex-col justify-center">
                <h3 className="text-center font-bold text-slate-700">무엇을 만들고 싶으신가요?</h3>
                <p className="text-center text-xs text-slate-500 mt-1 mb-4">AI가 아이디어를 멋진 디자인 브리핑으로 바꿔드립니다.</p>
                <Textarea 
                    value={initialIdea} 
                    onChange={e => setInitialIdea(e.target.value)}
                    placeholder="예: 우리 동네 유기농 빵집 오픈 포스터"
                    rows={3}
                    onKeyDown={(e) => {if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStartProject()}}
                />
                <Button onClick={handleStartProject} disabled={!initialIdea.trim()} className="w-full mt-2">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    시작하기
                </Button>
            </div>
        );
    }


    const isTextComplete = !!designBrief.title && !!designBrief.bodyText;
    const isStyleComplete = designBrief.keywords.length > 0;
    const isBriefingComplete = isTextComplete && isStyleComplete;

    const handleBriefChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateProjectData(p => ({ ...p, designBrief: { ...p.designBrief, [name]: value } }));
    };

    const handleKeywordsChange = (keyword: string) => {
        updateProjectData(prev => {
            const newKeywords = prev.designBrief.keywords.includes(keyword)
                ? prev.designBrief.keywords.filter(k => k !== keyword)
                : [...prev.designBrief.keywords, keyword];
            if (newKeywords.length > 3) return prev;
            return { ...prev, designBrief: { ...prev.designBrief, keywords: newKeywords } };
        });
    };
    
    const handleGenerateCopy = async () => {
        setIsGeneratingCopy(true);
        try {
            const result = await generateDesignCopy(designBrief);
            updateProjectData(p => ({ ...p, designBrief: { ...p.designBrief, ...result } }));
        } catch (error) { console.error(error); alert('AI 문구 생성 실패'); }
        finally { setIsGeneratingCopy(false); }
    };

    const handleSearchImages = async () => {
        const query = designBrief.keywords.join(', ') || designBrief.title;
        if (!query) { alert('이미지 추천을 위해 키워드나 제목을 입력해주세요.'); return; }
        setIsSearchingImages(true);
        setSuggestedImages([]);
        try {
            const results = await searchImages(query);
            setSuggestedImages(results);
        } catch (error) { console.error(error); alert('AI 이미지 검색 실패'); }
        finally { setIsSearchingImages(false); }
    };
    
    const addImageToLibrary = async (base64: string) => {
        const query = designBrief.keywords.join(', ') || designBrief.title;
        const dataUrl = `data:image/png;base64,${base64}`;
        const file = dataURLtoFile(dataUrl, `${query}.png`);
        const previewUrl = URL.createObjectURL(file);

        const image = new Image();
        image.src = previewUrl;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });

        updateProjectData(p => ({
            ...p,
            imageLibrary: [...p.imageLibrary, {
                id: uuidv4(),
                file,
                previewUrl,
                width: image.naturalWidth,
                height: image.naturalHeight,
            }]
        }));
        setSuggestedImages([]);
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 space-y-4">
            <div className="pb-4 border-b">
                <SectionHeader title="텍스트 (레시피)" icon={<TypeIcon className="w-5 h-5" />} isComplete={isTextComplete} />
                <div className="space-y-2 mt-2">
                    <Input name="title" value={designBrief.title} onChange={handleBriefChange} placeholder="제목 (예: 어반 그라인드)"/>
                    <Input name="subtitle" value={designBrief.subtitle} onChange={handleBriefChange} placeholder="부제목 (예: GRAND OPEN)"/>
                    <Textarea name="bodyText" value={designBrief.bodyText} onChange={handleBriefChange} placeholder="본문 내용" rows={4}/>
                    <Textarea name="contactInfo" value={designBrief.contactInfo} onChange={handleBriefChange} placeholder="연락처 정보" rows={2}/>
                    <Button onClick={handleGenerateCopy} disabled={isGeneratingCopy || !designBrief.title} size="sm" className="w-full">
                        {isGeneratingCopy ? <SpinnerIcon className="animate-spin h-4 w-4 mr-2"/> : <SparklesIcon className="h-4 w-4 mr-2"/>}
                        {designBrief.bodyText ? '다르게 제안해줘' : 'AI로 문구 생성'}
                    </Button>
                </div>
            </div>

            <div className="pb-4 border-b">
                <SectionHeader title="이미지 (핵심 재료)" icon={<PhotoIcon className="w-5 h-5" />} isComplete={projectData.imageLibrary.length > 0} />
                <div className="mt-2">
                    <Button onClick={handleSearchImages} disabled={isSearchingImages} size="sm" className="w-full">
                         {isSearchingImages ? <SpinnerIcon className="animate-spin h-4 w-4 mr-2"/> : <SearchIcon className="h-4 w-4 mr-2"/>} AI 이미지 추천
                    </Button>
                    {isSearchingImages && <div className="flex justify-center p-4"><SpinnerIcon className="w-6 h-6 animate-spin text-indigo-600"/></div>}
                    {suggestedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {suggestedImages.map((base64, i) => (
                                <img key={i} src={`data:image/png;base64,${base64}`} onClick={() => addImageToLibrary(base64)} alt="AI generated" className="w-full rounded border cursor-pointer hover:opacity-80"/>
                            ))}
                        </div>
                    )}
                    {projectData.imageLibrary.length === 0 && <p className="text-xs text-center text-slate-500 mt-2">디자인에 사용할 이미지를 추천받거나 '요소' 탭에서 직접 업로드하세요.</p>}
                </div>
            </div>

            <div className="pb-4 border-b">
                 <SectionHeader title="스타일 (시즈닝)" icon={<PaintBrushIcon className="w-5 h-5" />} isComplete={isStyleComplete} />
                 <div className="space-y-2 mt-2">
                     <Label className="text-xs">키워드 (최대 3개)</Label>
                     <div className="flex flex-wrap gap-1">
                         {DESIGN_KEYWORDS.map(k => <button key={k} onClick={() => handleKeywordsChange(k)} className={`px-2 py-0.5 text-xs rounded-full border ${designBrief.keywords.includes(k) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{k}</button>)}
                     </div>
                     <Select name="colorPalette" value={designBrief.colorPalette} onChange={handleBriefChange}>
                         {Object.keys(getAvailableColorPalettes()).map(c => <option key={c} value={c}>{c}</option>)}
                     </Select>
                     <Select name="toneAndManner" value={designBrief.toneAndManner} onChange={handleBriefChange}>
                          {Object.keys(TONE_AND_MANNERS).map(t => <option key={t} value={t}>{t}</option>)}
                     </Select>
                     <div className="p-2 bg-slate-100 rounded-md">
                        <p className="text-xs font-bold mb-1">무드보드 미리보기</p>
                        <div className="flex items-center gap-2">
                            <div style={{backgroundColor: projectData.brandKit.colors[0]?.value || '#6366f1'}} className="w-6 h-6 rounded-full flex-shrink-0 border"/>
                            <div>
                                <p className="text-xs font-bold leading-tight">{designBrief.keywords.join(', ')}</p>
                                <p className="text-xs text-slate-600 leading-tight">{designBrief.toneAndManner}</p>
                            </div>
                        </div>
                     </div>
                 </div>
            </div>

            <div className="pb-4 border-b">
                <Label className="text-sm font-bold">디자인 종류 선택</Label>
                <Select value={generationType} onChange={e => setGenerationType(e.target.value as GenerationOption)} className="mt-1">
                    <option value={DesignType.Poster}>포스터</option>
                    <option value={DesignType.CardNews}>SNS 카드뉴스</option>
                    <option value={'BusinessCardSet'}>명함 (앞/뒷면)</option>
                    <option value={DesignType.Banner}>현수막</option>
                    <option value={DesignType.Booklet}>안내 책자</option>
                </Select>
                <Button onClick={() => onStartGeneration(generationType, designBrief)} disabled={!isBriefingComplete} className="w-full mt-2">
                    <SparklesIcon className="h-5 w-5 mr-2"/>
                    디자인 시안 생성하기
                </Button>
            </div>

            <div className="pt-4 border-t">
                <SectionHeader title="데이터로 대량 제작" icon={<TableCellsIcon className="w-5 h-5" />} isComplete={false} />
                <p className="text-xs text-slate-500 mt-2 mb-2">현재 디자인을 템플릿으로 사용하여 CSV 데이터로 여러 페이지를 한 번에 생성합니다.</p>
                <Button
                    onClick={onOpenDataDrivenModal}
                    disabled={!editingDocumentId}
                    size="sm"
                    className="w-full"
                    variant="secondary"
                >
                    <TableCellsIcon className="h-4 w-4 mr-2" />
                    대량 제작 시작
                </Button>
            </div>
        </div>
    );
};