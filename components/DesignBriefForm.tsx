import React, { ChangeEvent, useCallback, useState, useMemo } from 'react';
import { DesignConcept, DesignProject, DesignType, BrandColor, BrandLogo } from '../types';
import { getAvailableColorPalettes, TONE_AND_MANNERS, DESIGN_KEYWORDS } from '../constants';
import { Card, CardHeader, Label, Input, Select, Textarea, Button, Modal } from './ui';
import { IdIcon, MegaphoneIcon, PaintBrushIcon, XCircleIcon, SparklesIcon, SpinnerIcon, LightbulbIcon, BookIcon, CameraIcon, CheckCircleIcon } from './icons';
import { KOREAN_FONTS_LIST } from './fonts';
import { generateDesignCopy, generateDesignConcepts, scanDesignFromImage } from '../services/geminiService';
import { PARTY_BRANDING } from './brandAssets';
import { getApiErrorMessage } from '../vicEdit/utils';
import { v4 as uuidv4 } from 'uuid';

interface DesignBriefFormProps {
    isOpen: boolean;
    onClose: () => void;
    projectData: DesignProject;
    updateProjectData: (updater: (prev: DesignProject) => DesignProject) => void;
    setError: (error: string | null) => void;
}

export const DesignBriefForm: React.FC<DesignBriefFormProps> = ({
    isOpen,
    onClose,
    projectData,
    updateProjectData,
    setError,
}) => {
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    
    const [coreIdea, setCoreIdea] = useState('');
    const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
    const [suggestedConcepts, setSuggestedConcepts] = useState<DesignConcept[] | null>(null);
    const [conceptError, setConceptError] = useState<string | null>(null);

    const [scannedImage, setScannedImage] = useState<File | null>(null);
    const [scanTargetType, setScanTargetType] = useState<DesignType>(DesignType.Poster);
    const [isScanning, setIsScanning] = useState(false);

    const availableColorPalettes = useMemo(() => getAvailableColorPalettes(), []);

    const handleGenerateConcepts = async () => {
        if (!coreIdea.trim()) {
            alert('디자인 아이디어를 입력해주세요.');
            return;
        }
        setIsGeneratingConcepts(true);
        setSuggestedConcepts(null);
        setConceptError(null);
        try {
            const concepts = await generateDesignConcepts(coreIdea);
            setSuggestedConcepts(concepts);
        } catch (error) {
            console.error(error);
            setConceptError(getApiErrorMessage(error, '컨셉 제안 생성'));
        } finally {
            setIsGeneratingConcepts(false);
        }
    };
    
    const handleImageScanFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setScannedImage(file);
            setError(null);
        } else {
            setScannedImage(null);
            setError('이미지 파일(PNG, JPG 등)을 선택해주세요.');
        }
    };

    const handleStartScan = async () => {
        if (!scannedImage) {
            setError('스캔할 이미지 파일을 선택해주세요.');
            return;
        }
        setIsScanning(true);
        setError(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(scannedImage);
            reader.onload = async () => {
                try {
                    const base64data = (reader.result as string).split(',')[1];
                    const newDocument = await scanDesignFromImage(base64data, scanTargetType, projectData);
                    updateProjectData(p => ({ ...p, documents: [newDocument, ...p.documents] }));
                    alert('디자인 스캔이 완료되어 \'내 디자인\' 목록에 추가되었습니다.');
                    onClose();
                    setScannedImage(null);
                } catch (e) { 
                    setError(getApiErrorMessage(e, '디자인 스캔'));
                } 
                finally { setIsScanning(false); }
            };
            reader.onerror = () => { throw new Error("이미지 파일을 읽는 데 실패했습니다."); }
        } catch (error) {
            console.error(error);
            setError(getApiErrorMessage(error, '디자인 스캔'));
            setIsScanning(false);
        }
    };

    const applyConcept = (concept: DesignConcept) => {
        updateProjectData(prev => ({
            ...prev,
            designBrief: { ...prev.designBrief, title: concept.title, subtitle: concept.subtitle, keywords: concept.keywords, toneAndManner: concept.toneAndManner }
        }));
    };

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateProjectData(prev => ({ ...prev, designBrief: { ...prev.designBrief, [name]: value } }));
    }, [updateProjectData]);

    const handleGenerateCopy = async () => {
        if (!projectData.designBrief.title) {
            alert('AI가 내용을 생성하려면 "제목"을 먼저 입력해주세요.');
            return;
        }
        setIsGeneratingCopy(true);
        try {
            const result = await generateDesignCopy(projectData.designBrief);
            updateProjectData(p => ({ ...p, designBrief: { ...p.designBrief, bodyText: result.bodyText, contactInfo: result.contactInfo } }));
        } catch (error) {
            console.error(error);
            alert(getApiErrorMessage(error, 'AI 문구 생성'));
        } finally {
            setIsGeneratingCopy(false);
        }
    };

    const handleKeywordsChange = useCallback((keyword: string) => {
        updateProjectData(prev => {
            const newKeywords = prev.designBrief.keywords.includes(keyword)
                ? prev.designBrief.keywords.filter(k => k !== keyword)
                : [...prev.designBrief.keywords, keyword];
            if (newKeywords.length > 3) return prev;
            return { ...prev, designBrief: { ...prev.designBrief, keywords: newKeywords }};
        });
    }, [updateProjectData]);

    const updateBrandKit = (updates: Partial<DesignProject['brandKit']>) => {
        updateProjectData(p => ({ ...p, brandKit: { ...p.brandKit, ...updates } }));
    };

    const handleBrandColorChange = (index: number, color: string) => {
        const newColors = [...projectData.brandKit.colors];
        // FIX: Update the 'value' property of the BrandColor object.
        newColors[index] = { ...newColors[index], value: color };
        updateBrandKit({ colors: newColors });
    };

    const addBrandColor = () => {
        if (projectData.brandKit.colors.length < 5) {
            // FIX: Add a BrandColor object instead of a string.
            updateBrandKit({ colors: [...projectData.brandKit.colors, { id: uuidv4(), role: 'Accent', value: '#000000' }] });
        }
    };

    const removeBrandColor = (index: number) => {
        updateBrandKit({ colors: projectData.brandKit.colors.filter((_, i) => i !== index) });
    };

    const handlePartyChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const partyName = e.target.value;
        const partyBrand = PARTY_BRANDING[partyName];
        if (partyBrand) {
            // FIX: Convert color strings to BrandColor[] and use logos array.
            const newBrandColors: BrandColor[] = Object.values(partyBrand.colors).map((colorValue, index) => ({
                id: uuidv4(),
                role: index === 0 ? 'Main' : 'Accent',
                value: colorValue
            }));
            const newLogos: BrandLogo[] = partyBrand.assets.length > 0 ? [{
                id: uuidv4(),
                role: 'Primary Signature',
                assetId: `svg:${partyBrand.assets[0].id}`
            }] : [];
            updateProjectData(p => ({
                ...p,
                designBrief: { ...p.designBrief, colorPalette: partyBrand.colorPaletteKey },
                brandKit: { ...p.brandKit, colors: newBrandColors, logos: newLogos }
            }));
        } else {
             updateProjectData(p => {
                // FIX: Use logos array and preserve user-uploaded logos.
                const userUploadedLogos = p.brandKit.logos.filter(logo => p.imageLibrary.some(img => img.id === logo.assetId));
                return { ...p, brandKit: { ...p.brandKit, colors: [], logos: userUploadedLogos } };
             });
        }
    };

    const selectedPartyName = useMemo(() => {
        // FIX: Use logos array to find the primary logo and determine the party.
        const primaryLogo = projectData.brandKit.logos.find(l => l.role === 'Primary Signature');
        const logoAssetId = primaryLogo?.assetId;
        if (!logoAssetId || !logoAssetId.startsWith('svg:')) return '';
        const assetId = logoAssetId.substring(4);
        return Object.entries(PARTY_BRANDING).find(([_, brand]) => brand.assets.some(asset => asset.id === assetId))?.[0] || '';
    }, [projectData.brandKit.logos]);
    
    const BrandLogoPreview: React.FC = () => {
        // FIX: Use logos array to find and display the primary logo.
        const primaryLogo = projectData.brandKit.logos.find(l => l.role === 'Primary Signature');
        const logoAssetId = primaryLogo?.assetId;
        if (!logoAssetId) return <p className="text-xs text-slate-500">로고를 사용하려면 아래에서 로고를 선택하거나, 에디터의 '요소' 탭에서 이미지를 업로드하세요.</p>;
        if (logoAssetId.startsWith('svg:')) {
            const assetId = logoAssetId.substring(4);
            const party = Object.values(PARTY_BRANDING).find(p => p.assets.some(a => a.id === assetId));
            const asset = party?.assets.find(a => a.id === assetId);
            if (asset) return <div className="p-2 border rounded-md bg-white flex items-center justify-center"><asset.component className="h-16 object-contain" /></div>;
        } else {
            const imageAsset = projectData.imageLibrary.find(i => i.id === logoAssetId);
            if (imageAsset) return <div className="p-2 border rounded-md bg-white flex items-center justify-center"><img src={imageAsset.previewUrl} alt="logo preview" className="h-16 object-contain" /></div>;
        }
        return <p className="text-xs text-red-500">선택된 로고를 찾을 수 없습니다.</p>;
    };

    if (!isOpen) return null;

    return (
      <Modal title="디자인 정보" onClose={onClose} size="4xl">
        <div className="space-y-8">
             <Card>
                <CardHeader title="이미지로 디자인 스캔" subtitle="가지고 있는 디자인 이미지(포스터, 명함 등)를 업로드하면 AI가 분석하여 편집 가능한 템플릿으로 만들어 드립니다." icon={<CameraIcon />} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div><Label>1. 스캔할 이미지 업로드</Label><Input type="file" accept="image/*" onChange={handleImageScanFileChange} />{scannedImage && (<div className="mt-2 flex items-center gap-2"><img src={URL.createObjectURL(scannedImage)} alt="Preview" className="h-12 w-12 object-cover rounded" /><p className="text-xs text-slate-600">{scannedImage.name}</p></div>)}</div>
                    <div><Label>2. 결과물 종류 선택</Label><Select value={scanTargetType} onChange={(e) => setScanTargetType(e.target.value as DesignType)}>{Object.values(DesignType).map(type => (<option key={type} value={type}>{type}</option>))}</Select></div>
                </div>
                <div className="mt-4"><Button onClick={handleStartScan} disabled={isScanning || !scannedImage} className="w-full">{isScanning ? <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 스캔 중...</> : '디자인 스캔 시작'}</Button></div>
            </Card>
            <Card>
                <CardHeader title="AI 컨셉 제안" subtitle="간단한 아이디어를 입력하면 AI가 3가지 디자인 컨셉을 제안해 드립니다." icon={<LightbulbIcon />} />
                <div className="flex items-start gap-4"><Input type="text" name="coreIdea" id="coreIdea" placeholder="예: 우리 동네 유기농 빵집 오픈 포스터" value={coreIdea} onChange={(e) => setCoreIdea(e.target.value)} className="flex-grow" disabled={isGeneratingConcepts} onKeyDown={(e) => e.key === 'Enter' && handleGenerateConcepts()} /><Button onClick={handleGenerateConcepts} disabled={isGeneratingConcepts || !coreIdea.trim()}>{isGeneratingConcepts ? <SpinnerIcon className="animate-spin h-5 w-5" /> : '컨셉 제안받기'}</Button></div>
                {isGeneratingConcepts && (<div className="text-center p-8"><SpinnerIcon className="h-10 w-10 animate-spin mx-auto text-indigo-600" /><p className="mt-2 font-semibold">AI가 창의적인 컨셉을 구상 중입니다...</p></div>)}
                {conceptError && <p className="text-red-600 mt-2">{conceptError}</p>}
                {suggestedConcepts && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestedConcepts.map((concept, index) => (
                            <div key={index} className="border bg-slate-50 rounded-lg p-4 flex flex-col hover:shadow-lg transition-shadow">
                                <h3 className="font-bold text-lg text-slate-800">{concept.title}</h3><p className="text-sm text-slate-600">{concept.subtitle}</p><p className="text-xs text-slate-500 my-3 flex-grow">{concept.description}</p>
                                <div className="my-2">{concept.keywords.map(kw => <span key={kw} className="inline-block bg-slate-200 rounded-full px-2 py-0.5 text-xs font-semibold text-slate-700 mr-1 mb-1">{kw}</span>)}</div>
                                <p className="text-xs font-semibold mb-3">톤앤매너: {concept.toneAndManner}</p><Button onClick={() => applyConcept(concept)} size="sm" className="mt-auto w-full"><SparklesIcon className="w-4 h-4 mr-2" /> 이 컨셉 적용하기</Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <Card>
                        <CardHeader title="프로젝트 기본 정보" subtitle="디자인에 필요한 기본 정보를 입력하세요." icon={<IdIcon />} />
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div><Label htmlFor="title" required>제목</Label><Input type="text" name="title" id="title" placeholder="예: 김민준의 베이커리" value={projectData.designBrief.title} onChange={handleInputChange} required /></div><div><Label htmlFor="subtitle">부제목</Label><Input type="text" name="subtitle" id="subtitle" placeholder="예: 오픈 기념 이벤트" value={projectData.designBrief.subtitle} onChange={handleInputChange} /></div></div>
                            <div><Label htmlFor="bodyText">본문 내용</Label><Textarea name="bodyText" id="bodyText" rows={3} placeholder="주요 설명, 슬로건, 메시지 등" value={projectData.designBrief.bodyText} onChange={handleInputChange} /></div>
                            <div><Label htmlFor="contactInfo">연락처 정보</Label><Textarea name="contactInfo" id="contactInfo" rows={2} placeholder="전화번호, 주소, 웹사이트, SNS 등" value={projectData.designBrief.contactInfo} onChange={handleInputChange} /></div>
                            <div className="border-t pt-4"><Button onClick={handleGenerateCopy} disabled={isGeneratingCopy || !projectData.designBrief.title} className="w-full">{isGeneratingCopy ? <><SpinnerIcon className="animate-spin mr-2 h-5 w-5" /> 생성 중...</> : <><SparklesIcon className="mr-2 h-5 w-5" /> AI로 문구/정보 생성</>}</Button><p className="text-xs text-slate-500 mt-2 text-center">제목, 부제목, 키워드, 톤앤매너를 기반으로 본문과 연락처 정보를 생성합니다.</p></div>
                        </div>
                    </Card>
                    <Card>
                        <CardHeader title="디자인 키워드 및 스타일" subtitle="원하는 디자인의 분위기를 선택하세요." icon={<PaintBrushIcon />} />
                        <div className="space-y-6">
                            <div><Label>디자인 핵심 키워드 (최대 3개 선택)</Label><div className="flex flex-wrap gap-2 mt-2">{DESIGN_KEYWORDS.map(keyword => (<button key={keyword} type="button" onClick={() => handleKeywordsChange(keyword)} className={`px-3 py-1 text-sm rounded-full border ${projectData.designBrief.keywords.includes(keyword) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{keyword}</button>))}</div></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div><Label htmlFor="colorPalette">메인 색상 팔레트</Label><Select name="colorPalette" id="colorPalette" value={projectData.designBrief.colorPalette} onChange={handleInputChange}>{Object.keys(availableColorPalettes).map(c => <option key={c} value={c}>{c}</option>)}</Select></div><div><Label htmlFor="toneAndManner">이미지 톤앤매너</Label><Select name="toneAndManner" id="toneAndManner" value={projectData.designBrief.toneAndManner} onChange={handleInputChange}>{Object.keys(TONE_AND_MANNERS).map(t => <option key={t} value={t}>{t}</option>)}</Select></div></div>
                            <div className="sm:col-span-2"><Label htmlFor="fontFamily">대표 글꼴 (브랜드 키트 글꼴 우선)</Label><Select name="fontFamily" id="fontFamily" value={projectData.designBrief.fontFamily} onChange={handleInputChange}>{KOREAN_FONTS_LIST.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</Select></div>
                        </div>
                    </Card>
                </div>
                <div className="space-y-8">
                     <Card>
                        <CardHeader title="브랜드 키트" subtitle="내 로고, 색상, 글꼴을 등록하여 일관된 디자인을 만드세요." icon={<BookIcon />}/>
                        <div className="space-y-4">
                           <div><Label htmlFor="partySelect">정당 선택 (선택 사항)</Label><Select id="partySelect" onChange={handlePartyChange} value={selectedPartyName}><option value="">선택 안함</option>{Object.keys(PARTY_BRANDING).filter(key => key !== '새누리당').map(name => (<option key={name} value={name}>{name}</option>))}</Select><p className="text-xs text-slate-500 mt-1">선택 시 해당 정당의 공식 로고와 색상이 자동 적용됩니다.</p></div>
                           <div><Label>브랜드 색상 (최대 5개)</Label><div className="flex flex-wrap gap-2 items-center">{projectData.brandKit.colors.map((color, index) => (<div key={index} className="relative flex items-center"><Input type="color" value={color.value} onChange={(e) => handleBrandColorChange(index, e.target.value)} className="w-10 h-10 p-1" /><button onClick={() => removeBrandColor(index)} className="absolute -top-1 -right-1 bg-slate-600 text-white rounded-full p-0.5"><XCircleIcon className="w-4 h-4"/></button></div>))}{projectData.brandKit.colors.length < 5 && !selectedPartyName && (<button onClick={addBrandColor} className="w-10 h-10 border-2 border-dashed rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600">+</button>)}</div></div>
                           <div><Label htmlFor="brandFontFamily">대표 글꼴</Label><Select name="brandFontFamily" id="brandFontFamily" value={projectData.brandKit.fonts.find(f => f.role === 'Headline')?.fontFamily || ''} onChange={e => {
                                const newFontFamily = e.target.value;
                                const newFonts = [...projectData.brandKit.fonts];
                                const headlineFontIndex = newFonts.findIndex(f => f.role === 'Headline');
                                if (newFontFamily) {
                                    if (headlineFontIndex > -1) {
                                        newFonts[headlineFontIndex] = { ...newFonts[headlineFontIndex], fontFamily: newFontFamily };
                                    } else {
                                        newFonts.push({ id: uuidv4(), role: 'Headline', fontFamily: newFontFamily, fontWeight: 700 });
                                    }
                                } else if (headlineFontIndex > -1) {
                                    newFonts.splice(headlineFontIndex, 1);
                                }
                                updateBrandKit({ fonts: newFonts });
                           }}><option value="">선택 안함 (AI가 추천)</option>{KOREAN_FONTS_LIST.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}</Select></div>
                           
                           <div className="border-t pt-4">
                               <Label>브랜드 로고</Label>
                               <div className="mt-2 p-2 border rounded-md bg-slate-100 min-h-[80px] flex items-center justify-center">
                                  <BrandLogoPreview />
                               </div>
                               <div className="mt-4">
                                  <p className="text-sm font-medium text-slate-700 mb-2">업로드된 이미지에서 로고 선택</p>
                                   {projectData.imageLibrary.length > 0 ? (
                                     <div className="grid grid-cols-4 gap-2">
                                       {projectData.imageLibrary.map(asset => {
                                         // FIX: Use logos array
                                         const primaryLogo = projectData.brandKit.logos.find(l => l.role === 'Primary Signature');
                                         return (
                                         <div 
                                           key={asset.id} 
                                           onClick={() => {
                                               const newLogos = [...projectData.brandKit.logos];
                                               const primaryLogoIndex = newLogos.findIndex(l => l.role === 'Primary Signature');
                                               if (primaryLogoIndex > -1) {
                                                   newLogos[primaryLogoIndex] = { ...newLogos[primaryLogoIndex], assetId: asset.id };
                                               } else {
                                                   newLogos.push({ id: uuidv4(), role: 'Primary Signature', assetId: asset.id });
                                               }
                                               updateBrandKit({ logos: newLogos });
                                           }}
                                           className={`relative aspect-square cursor-pointer rounded-md border-2 ${primaryLogo?.assetId === asset.id ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'}`}
                                         >
                                           <img src={asset.previewUrl} className="w-full h-full object-contain rounded-sm" />
                                           {primaryLogo?.assetId === asset.id && (
                                             <div className="absolute top-0 right-0 p-0.5 bg-indigo-600 rounded-bl-md">
                                               <CheckCircleIcon className="w-4 h-4 text-white" />
                                             </div>
                                           )}
                                         </div>
                                       )})}
                                     </div>
                                   ) : (
                                     <p className="text-xs text-slate-500">로고로 사용할 이미지를 먼저 에디터의 '요소' 탭에서 업로드해주세요.</p>
                                   )}
                                   {(() => {
                                        const primaryLogo = projectData.brandKit.logos.find(l => l.role === 'Primary Signature');
                                        return primaryLogo?.assetId && !primaryLogo.assetId.startsWith('svg:') && (
                                        <Button size="sm" variant="secondary" className="mt-2" onClick={() => updateBrandKit({ logos: projectData.brandKit.logos.filter(l => l.role !== 'Primary Signature') })}>로고 선택 해제</Button>
                                    );
                                   })()}
                               </div>
                           </div>
                        </div>
                    </Card>
                     <Card>
                        <CardHeader title="개인 노트" subtitle="프로젝트 관련 아이디어나 메모를 자유롭게 기록하세요." icon={<MegaphoneIcon />}/>
                        <Textarea name="personalNotes" id="personalNotes" rows={6} placeholder="디자인 아이디어, 수정 요청사항 등을 자유롭게 기록하세요." value={projectData.personalNotes} onChange={(e) => updateProjectData(p => ({...p, personalNotes: e.target.value}))}/>
                    </Card>
                </div>
            </div>
        </div>
      </Modal>
    );
};
