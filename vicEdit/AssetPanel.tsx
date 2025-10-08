import React, { useState, ChangeEvent, DragEvent } from 'react';
import { DesignProject, TextLayer, ImageLayer, ShapeLayer, ImageAsset, AllLayer } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Button, Input } from '../components/ui';
import { SquareIcon, CircleIcon, LineIcon, SpinnerIcon, SearchIcon } from '../components/icons';
import { ptToPx, dataURLtoFile, getApiErrorMessage } from './utils';
import { generateDesignElement, searchImages } from '../services/geminiService';
import { AIPhotoEditorModal } from '../components/AIPhotoEditorModal';

interface AssetPanelProps {
    projectData: DesignProject;
    addLayer: (layer: AllLayer) => void;
    updateProjectData: (updater: (prev: DesignProject) => DesignProject) => void;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({ projectData, addLayer, updateProjectData }) => {
    const [elementPrompt, setElementPrompt] = useState('');
    const [isGeneratingElement, setIsGeneratingElement] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeImageTab, setActiveImageTab] = useState<'my-images' | 'ai-search'>('my-images');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchedImages, setSearchedImages] = useState<string[]>([]);
    const [editingAsset, setEditingAsset] = useState<ImageAsset | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const addShape = (type: 'rectangle' | 'circle' | 'line') => {
        const newShape: ShapeLayer = {
            id: uuidv4(), type, top: 100, left: 100,
            width: type === 'line' ? 200 : 150, height: type === 'line' ? 5 : 150,
            rotation: 0, opacity: 1,
            fill: '#6366f1', strokeColor: '#000000', strokeWidth: type === 'line' ? 5 : 0,
        };
        addLayer(newShape);
    };

    const handleGenerateElement = async () => {
        if (!elementPrompt.trim()) return;
        setIsGeneratingElement(true);
        try {
            const base64Image = await generateDesignElement(elementPrompt);
            const dataUrl = `data:image/png;base64,${base64Image}`;
            const file = dataURLtoFile(dataUrl, `${elementPrompt.slice(0, 20)}.png`);
            
            const image = new Image();
            image.src = dataUrl;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            const newAsset: ImageAsset = {
                id: uuidv4(),
                file,
                previewUrl: URL.createObjectURL(file),
                width: image.naturalWidth,
                height: image.naturalHeight
            };
            updateProjectData(p => ({...p, imageLibrary: [...p.imageLibrary, newAsset]}));

            const newImageLayer: ImageLayer = {
                id: uuidv4(), assetId: newAsset.id, top: 100, left: 100,
                width: 150, height: 150, rotation: 0, opacity: 1,
            };
            addLayer(newImageLayer);
            setElementPrompt('');
        } catch (error) {
            console.error('Failed to generate AI element:', error);
            alert(getApiErrorMessage(error, 'AI 요소 생성'));
        } finally {
            setIsGeneratingElement(false);
        }
    };

    const addText = (preset: 'heading' | 'subheading' | 'body') => {
        const presets = {
            heading: { content: '제목 텍스트', fontSize: ptToPx(48), fontWeight: 700 },
            subheading: { content: '부제목 텍스트', fontSize: ptToPx(24), fontWeight: 700 },
            body: { content: '본문 텍스트입니다.', fontSize: ptToPx(12), fontWeight: 400 },
        };
        const newText: TextLayer = {
            id: uuidv4(), ...presets[preset],
            top: 150, left: 150, width: 300, height: 100,
            color: '#000000', textAlign: 'left', fontFamily: projectData.designBrief.fontFamily,
            rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none',
        };
        addLayer(newText);
    };

    const addImage = (assetId: string) => {
        const newImage: ImageLayer = {
            id: uuidv4(), assetId, top: 200, left: 200, width: 300, height: 200,
            rotation: 0, opacity: 1,
        };
        addLayer(newImage);
    };
    
    const processFiles = async (files: FileList) => {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            const newAssetsPromises: Promise<ImageAsset>[] = imageFiles.map(async file => {
                const previewUrl = URL.createObjectURL(file);
                const image = new Image();
                image.src = previewUrl;
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                });
                return {
                    id: uuidv4(),
                    file,
                    previewUrl,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                };
            });
            const newAssets = await Promise.all(newAssetsPromises);
            updateProjectData(p => ({...p, imageLibrary: [...p.imageLibrary, ...newAssets]}));
        }
    };
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFiles(e.target.files); };
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); };

    const handleSearchImages = async () => {
        if (!searchQuery.trim()) return; setIsSearching(true); setSearchedImages([]);
        try { 
            const results = await searchImages(searchQuery); 
            setSearchedImages(results); 
        } catch (error) { 
            alert(getApiErrorMessage(error, 'AI 이미지 검색')); 
        } finally { 
            setIsSearching(false); 
        }
    };
    
    const addSearchedImageToLibrary = async (base64: string) => {
        const dataUrl = `data:image/png;base64,${base64}`;
        const file = dataURLtoFile(dataUrl, `${searchQuery}.png`);
        const previewUrl = URL.createObjectURL(file);
        const image = new Image();
        image.src = previewUrl;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
        const newAsset: ImageAsset = {
            id: uuidv4(),
            file,
            previewUrl,
            width: image.naturalWidth,
            height: image.naturalHeight,
        };
        updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, newAsset] }));
        setActiveImageTab('my-images');
    };

    return (
        <div className='h-full w-full overflow-y-auto p-4 space-y-4'>
            <div>
                <h3 className="font-bold text-sm">텍스트</h3>
                <div className="grid grid-cols-1 gap-2 mt-2">
                    <Button variant="secondary" onClick={() => addText('heading')}>제목 추가</Button>
                    <Button variant="secondary" onClick={() => addText('subheading')}>부제목 추가</Button>
                    <Button variant="secondary" onClick={() => addText('body')}>본문 추가</Button>
                </div>
            </div>
            <div>
                <h3 className="font-bold text-sm">도형</h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <button onClick={() => addShape('rectangle')} className="p-4 bg-slate-200 rounded hover:bg-slate-300 flex items-center justify-center"><SquareIcon className="w-8 h-8 text-slate-600"/></button>
                    <button onClick={() => addShape('circle')} className="p-4 bg-slate-200 rounded hover:bg-slate-300 flex items-center justify-center"><CircleIcon className="w-8 h-8 text-slate-600"/></button>
                    <button onClick={() => addShape('line')} className="p-4 bg-slate-200 rounded hover:bg-slate-300 flex items-center justify-center"><LineIcon className="w-8 h-8 text-slate-600"/></button>
                </div>
            </div>
            <div className="pt-4 border-t">
                <h3 className="font-bold text-sm mb-2">AI 요소 생성</h3>
                <p className="text-xs text-slate-500 mb-2">아이콘, 일러스트를 요청하여 투명 배경 이미지로 생성합니다.</p>
                <Input placeholder="예: 웃는 커피잔 아이콘" value={elementPrompt} onChange={e => setElementPrompt(e.target.value)} disabled={isGeneratingElement} onKeyDown={(e) => e.key === 'Enter' && handleGenerateElement()} />
                <Button onClick={handleGenerateElement} disabled={isGeneratingElement || !elementPrompt.trim()} className="w-full mt-2" >
                    {isGeneratingElement ? <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 생성 중...</> : '생성하기'}
                </Button>
            </div>
            <div className="pt-4 border-t">
                 <h3 className="font-bold text-sm mb-2">이미지 라이브러리</h3>
                 <div className="border-b mb-2">
                    <div className="flex -mb-px">
                        <button onClick={() => setActiveImageTab('my-images')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeImageTab === 'my-images' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>내 이미지</button>
                        <button onClick={() => setActiveImageTab('ai-search')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeImageTab === 'ai-search' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>AI 검색</button>
                    </div>
                </div>

                {activeImageTab === 'my-images' && (
                    <>
                        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`p-2 border-2 border-dashed border-slate-300 rounded-lg text-center transition-colors ${isDragging ? 'bg-indigo-100 border-indigo-400' : ''}`}>
                            <label htmlFor="file-upload-asset" className="relative cursor-pointer rounded-md text-xs font-medium text-indigo-600 hover:text-indigo-500"><span>업로드</span><input id="file-upload-asset" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg" onChange={handleFileChange} /></label>
                            <p className="text-xs text-slate-500">또는 드래그</p>
                        </div>
                        {projectData.imageLibrary.length > 0 ? (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {projectData.imageLibrary.map((asset) => {
                                    const primaryLogo = projectData.brandKit.logos.find(logo => logo.role === 'Primary Signature');
                                    const isPrimaryLogo = primaryLogo?.assetId === asset.id;
                                    return (
                                    <div key={asset.id} className="relative group aspect-square cursor-pointer" onClick={() => addImage(asset.id)}>
                                        <img src={asset.previewUrl} alt={asset.file.name} className={`w-full h-full object-cover rounded-md border-2 ${isPrimaryLogo ? 'border-indigo-600' : 'border-transparent'}`} />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 space-y-1">
                                            <span className="text-white text-xs text-center">캔버스에 추가</span>
                                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); }}>AI 편집</Button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : <p className="text-sm text-slate-500 mt-4 text-center">업로드된 이미지가 없습니다.</p>}
                    </>
                )}

                {activeImageTab === 'ai-search' && (
                    <div>
                        <div className="flex gap-2">
                            <Input type="text" placeholder="예: 웃고 있는 바리스타" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchImages()} disabled={isSearching} />
                            <Button onClick={handleSearchImages} disabled={isSearching || !searchQuery.trim()} size="sm"> {isSearching ? <SpinnerIcon className="animate-spin h-5 w-5"/> : <SearchIcon className="h-5 w-5"/>} </Button>
                        </div>
                        {isSearching ? (
                            <div className="text-center p-4"><SpinnerIcon className="h-8 w-8 animate-spin mx-auto text-indigo-600" /><p className="mt-2 text-sm font-semibold">AI 이미지 생성 중...</p></div>
                        ) : (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {searchedImages.map((base64, i) => (
                                    <div key={i} onClick={() => addSearchedImageToLibrary(base64)} className="aspect-video bg-slate-200 rounded cursor-pointer overflow-hidden group">
                                        <img src={`data:image/png;base64,${base64}`} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
             {editingAsset && (
                <AIPhotoEditorModal asset={editingAsset} onClose={() => setEditingAsset(null)} onUpdate={(updatedFile) => {
                        updateProjectData(p => {
                            const newLibrary = p.imageLibrary.map(a => {
                                if (a.id === editingAsset.id) { URL.revokeObjectURL(a.previewUrl); return { ...a, file: updatedFile, previewUrl: URL.createObjectURL(updatedFile) }; }
                                return a;
                            });
                            return { ...p, imageLibrary: newLibrary };
                        });
                        setEditingAsset(null);
                    }}
                    setError={setFormError}
                />
            )}
        </div>
    );
};