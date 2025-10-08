import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DesignProject, DesignPage, TextLayer, ImageLayer, ShapeLayer, ImageAsset, DesignBrief, DesignDocument, Group, DataMapping, Fill, GenerationOption, AllLayer, MagicWandState, Interaction, BrandColor, DesignType } from '../types';
import { Canvas } from './Canvas';
import { InspectorPanel } from './InspectorPanel';
import { LeftPanel } from './LeftPanel';
// FIX: Import fileToDataURL to resolve undefined errors.
import { buildAssetUrlMap, dataURLtoFile, mmToPx, getApiErrorMessage, getBase64FromDataUrl, fileToDataURL } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { suggestFont, generateInArea, refinePageLayout, refineTextContent, removeBackgroundImage, cropImageWithAI, generateAltText, extractColorsFromImage, executeMagicWandAction, expandImageWithAI, adaptPageLayout, remixPageLayout } from '../services';
import { PageNavigator } from '../components/PageNavigator';
import { Toolbar, Tool } from './Toolbar';
import { AiGenerateModal } from '../components/AiGenerateModal';
import { AiAction } from '../components/AiAssistantModal';
import { DataDrivenModal } from '../components/DataDrivenModal';
import { AiMagicWandInput } from '../components/AiMagicWandInput';
import { RemixSuggestionsModal } from '../components/RemixSuggestionsModal';

interface EditorProps {
    editingDocument: DesignDocument;
    activePageIndex: number;
    onPageUpdate: (pageId: string, updates: Partial<DesignPage>) => void;
    onSelectPage: (index: number) => void;
    onAddPage: () => void;
    onDeletePage: (index: number) => void;
    projectData: DesignProject;
    updateProjectData: (updater: (prev: DesignProject) => DesignProject) => void;
    onDeleteAsset: (assetId: string) => void;
    forceAiAssistant: boolean;
    onAiAssistantClose: () => void;
    onStartGeneration: (genOption: GenerationOption, brief: DesignBrief) => void;
    setError: (error: string | null) => void;
    onDocumentCreationCloseEditor: () => void;
    onStartWizard: (initialIdea: string) => void;
}

export const Editor: React.FC<EditorProps> = (props) => {
    const { 
        editingDocument, activePageIndex, onPageUpdate, onSelectPage, onAddPage, onDeletePage,
        projectData, updateProjectData, onDeleteAsset, forceAiAssistant, onAiAssistantClose, onStartGeneration,
        setError, onDocumentCreationCloseEditor, onStartWizard
    } = props;
    
    const page = useMemo(() => editingDocument.pages[activePageIndex], [editingDocument, activePageIndex]);

    const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [clipboard, setClipboard] = useState<AllLayer[]>([]);
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [aiGenerationState, setAiGenerationState] = useState<{ rect: { x: number, y: number, width: number, height: number } | null, visible: boolean }>({ rect: null, visible: false });

    const [isProcessingAiAction, setIsProcessingAiAction] = useState<string | null>(null);
    const [isDataDrivenModalOpen, setIsDataDrivenModalOpen] = useState(false);
    const [eyedropperState, setEyedropperState] = useState<{ callback: (color: string) => void } | null>(null);
    const [magicWandState, setMagicWandState] = useState<MagicWandState | null>(null);
    const [isProcessingMagicWand, setIsProcessingMagicWand] = useState(false);
    const [expandState, setExpandState] = useState<{ layerId: string; x: number; y: number } | null>(null);
    const [remixSuggestions, setRemixSuggestions] = useState<Partial<DesignPage>[] | null>(null);


    // State for synthetic background layer properties
    const [isBgVisible, setIsBgVisible] = useState(true);
    const [isBgLocked, setIsBgLocked] = useState(false);
    const [bgOpacity, setBgOpacity] = useState(1);
    
    const isInitialBrief = useMemo(() => {
        const { designBrief } = projectData;
        return editingDocument.pages.length === 1 &&
               editingDocument.pages[0].textLayers.length === 0 &&
               editingDocument.pages[0].imageLayers.length === 0 &&
               !designBrief.title &&
               !designBrief.bodyText &&
               designBrief.keywords.length === 0;
    }, [projectData.designBrief, editingDocument]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            switch(e.key.toLowerCase()) {
                case 'v': setActiveTool('select'); break;
                case 't': setActiveTool('text'); break;
                case 'r': setActiveTool('rectangle'); break;
                case 'g': setActiveTool('ai-generate'); break;
                case 'i': setActiveTool('eyedropper'); break;
                case 'm': setActiveTool('magic-wand'); break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    const handleAiAreaSelected = (rect: { x: number, y: number, width: number, height: number }) => {
        setAiGenerationState({ rect, visible: true });
    };

    const handleAiGenerate = async (prompt: string) => {
        if (!aiGenerationState.rect) return;
        const { rect } = aiGenerationState;
        
        setAiGenerationState({ rect: null, visible: false });
        setError(null);

        try {
            const base64Image = await generateInArea(prompt, rect.width, rect.height);
            const dataUrl = `data:image/png;base64,${base64Image}`;
            const file = dataURLtoFile(dataUrl, `${prompt.slice(0, 20)}.png`);
            
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
                height: image.naturalHeight,
            };
            
            const newImageLayer: ImageLayer = {
                id: uuidv4(),
                name: prompt,
                assetId: newAsset.id,
                top: rect.y,
                left: rect.x,
                width: rect.width,
                height: rect.height,
                rotation: 0,
                opacity: 1,
            };

            updateProjectData(p => {
                const newImageLibrary = [...p.imageLibrary, newAsset];
                const docIndex = p.documents.findIndex(d => d.id === editingDocument.id);
                if (docIndex === -1) return {...p, imageLibrary: newImageLibrary};

                const docToUpdate = p.documents[docIndex];
                const pageIndex = docToUpdate.pages.findIndex(pg => pg.id === page.id);
                if (pageIndex === -1) return {...p, imageLibrary: newImageLibrary};
                
                const pageToUpdate = docToUpdate.pages[pageIndex];
                const updatedPage = {
                    ...pageToUpdate,
                    imageLayers: [...pageToUpdate.imageLayers, newImageLayer]
                };

                const updatedPages = [...docToUpdate.pages];
                updatedPages[pageIndex] = updatedPage;

                const updatedDoc = {...docToUpdate, pages: updatedPages};
                const newDocs = [...p.documents];
                newDocs[docIndex] = updatedDoc;

                return { ...p, imageLibrary: newImageLibrary, documents: newDocs };
            });

        } catch (error) {
            console.error('Failed to generate AI image in area:', error);
            setError(getApiErrorMessage(error, 'AI 이미지 생성'));
        }
    };

    const handleDataDrivenGenerate = (data: Record<string, string>[], mapping: DataMapping) => {
        setIsDataDrivenModalOpen(false);
        const templatePage = page;

        const newPages: DesignPage[] = data.map((row, index) => {
            const newPage: DesignPage = JSON.parse(JSON.stringify(templatePage));
            newPage.id = uuidv4();
            newPage.pageNumber = index + 1;
            newPage.textLayers = newPage.textLayers.map(layer => {
                const mappedHeader = mapping[layer.id];
                if (mappedHeader && row[mappedHeader] !== undefined) {
                    return { ...layer, content: row[mappedHeader] };
                }
                return layer;
            });
            return newPage;
        });

        if (newPages.length === 0) {
            setError("데이터로부터 생성할 페이지가 없습니다.");
            return;
        }

        const newDocument: DesignDocument = {
            id: uuidv4(),
            name: `${editingDocument.name} - 데이터 생성 결과`,
            pages: newPages,
        };

        updateProjectData(p => ({
            ...p,
            documents: [newDocument, ...p.documents],
        }));

        onDocumentCreationCloseEditor();
        alert(`'${newDocument.name}' 문서가 생성되어 '내 디자인' 목록에 추가되었습니다. 총 ${newPages.length}개의 페이지가 생성되었습니다.`);
    };

    // When page changes, clear selection and reset background state
    useEffect(() => {
        setSelectedLayerIds([]);
        setIsBgVisible(true);
        setIsBgLocked(false);
        setBgOpacity(1);
    }, [page.id]);
    
    const canvasWidthPx = useMemo(() => page.width_mm ? mmToPx(page.width_mm) : mmToPx(420), [page.width_mm]);
    const canvasHeightPx = useMemo(() => page.height_mm ? mmToPx(page.height_mm) : mmToPx(594), [page.height_mm]);

    const assetUrlMap = useMemo(() => {
        const map = buildAssetUrlMap(projectData);
        map.set('background_asset', `data:image/png;base64,${page.base64}`);
        return map;
    }, [projectData, page.base64]);
    
    const backgroundLayer: ImageLayer = useMemo(() => ({
        id: 'background',
        assetId: 'background_asset',
        top: 0,
        left: 0,
        width: canvasWidthPx,
        height: canvasHeightPx,
        rotation: 0,
        opacity: bgOpacity,
        isVisible: isBgVisible,
        isLocked: isBgLocked,
    }), [canvasWidthPx, canvasHeightPx, isBgVisible, isBgLocked, bgOpacity]);

    const allLayers = useMemo(() => [
        ...page.shapeLayers, ...page.imageLayers, ...page.textLayers
    ], [page.shapeLayers, page.imageLayers, page.textLayers]);
    
    const allVisibleLayers = useMemo(() => [
         backgroundLayer, ...allLayers
    ], [backgroundLayer, allLayers]);


    const handleLayerUpdate = useCallback((id: string, updates: Partial<AllLayer>) => {
        if (id === 'background') {
            if (updates.isVisible !== undefined) setIsBgVisible(updates.isVisible);
            if (updates.isLocked !== undefined) setIsBgLocked(updates.isLocked);
            if (updates.opacity !== undefined) setBgOpacity(updates.opacity);
            return;
        }

        onPageUpdate(page.id, {
            textLayers: page.textLayers.map(l => l.id === id ? { ...l, ...updates } : l),
            imageLayers: page.imageLayers.map(l => l.id === id ? { ...l, ...updates } : l),
            shapeLayers: page.shapeLayers.map(l => l.id === id ? { ...l, ...updates } : l),
        });
    }, [page, onPageUpdate]);
    
     const handleMultipleLayerUpdate = useCallback((updates: { id: string, changes: Partial<AllLayer> }[]) => {
        let newTextLayers = [...page.textLayers];
        let newImageLayers = [...page.imageLayers];
        let newShapeLayers = [...page.shapeLayers];

        updates.forEach(({ id, changes }) => {
            newTextLayers = newTextLayers.map(l => l.id === id ? { ...l, ...changes } : l);
            newImageLayers = newImageLayers.map(l => l.id === id ? { ...l, ...changes } : l);
            newShapeLayers = newShapeLayers.map(l => l.id === id ? { ...l, ...changes } : l);
        });

        onPageUpdate(page.id, { textLayers: newTextLayers, imageLayers: newImageLayers, shapeLayers: newShapeLayers });
    }, [page, onPageUpdate]);

    const addLayer = useCallback((layer: AllLayer, file?: File) => {
        const defaults = { isVisible: true, isLocked: false };
        let newLayer: AllLayer = { ...layer, ...defaults };

        if ('content' in newLayer) {
            newLayer = { ...newLayer, fontStyle: newLayer.fontStyle || 'normal', textDecoration: newLayer.textDecoration || 'none' }
        }

        let type: 'text'|'image'|'shape' = 'shape';
        if ('content' in newLayer) type = 'text';
        if ('assetId' in newLayer) type = 'image';
        
        const newLayers = {
            textLayers: type === 'text' ? [...page.textLayers, newLayer as TextLayer] : page.textLayers,
            imageLayers: type === 'image' ? [...page.imageLayers, newLayer as ImageLayer] : page.imageLayers,
            shapeLayers: type === 'shape' ? [...page.shapeLayers, newLayer as ShapeLayer] : page.shapeLayers,
        };
        onPageUpdate(page.id, newLayers);
        setSelectedLayerIds([layer.id]);
    }, [page, onPageUpdate]);

    const deleteSelectedLayers = useCallback(() => {
        const idsToDelete = selectedLayerIds.filter(id => id !== 'background');
        if (idsToDelete.length === 0) return;
        
        onPageUpdate(page.id, {
            textLayers: page.textLayers.filter(l => !idsToDelete.includes(l.id)),
            imageLayers: page.imageLayers.filter(l => !idsToDelete.includes(l.id)),
            shapeLayers: page.shapeLayers.filter(l => !idsToDelete.includes(l.id)),
        });

        setSelectedLayerIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    }, [selectedLayerIds, page, onPageUpdate]);
    
    const handleCopy = useCallback(() => {
        if (selectedLayerIds.length > 0) {
            const layersToCopy = allLayers.filter(l => selectedLayerIds.includes(l.id) && l.id !== 'background');
            setClipboard(layersToCopy);
        }
    }, [selectedLayerIds, allLayers]);

    const handlePaste = useCallback(() => {
        if (clipboard.length === 0) return;

        const newLayers = clipboard.map(layer => ({
            ...layer,
            id: uuidv4(),
            top: layer.top + 20,
            left: layer.left + 20
        }));

        let newTextLayers = [...page.textLayers];
        let newImageLayers = [...page.imageLayers];
        let newShapeLayers = [...page.shapeLayers];
        
        newLayers.forEach(layer => {
            if ('content' in layer) newTextLayers.push(layer as TextLayer);
            else if ('assetId' in layer) newImageLayers.push(layer as ImageLayer);
            else newShapeLayers.push(layer as ShapeLayer);
        });
        
        onPageUpdate(page.id, { textLayers: newTextLayers, imageLayers: newImageLayers, shapeLayers: newShapeLayers });
        setSelectedLayerIds(newLayers.map(l => l.id));
    }, [clipboard, page, onPageUpdate]);


    const selectedLayers = useMemo(() => {
        return allLayers.filter(l => selectedLayerIds.includes(l.id)) || [];
    }, [selectedLayerIds, allLayers]);

    const handleLayerOrderChange = useCallback((direction: 'forward' | 'backward' | 'front' | 'back') => {
        if (selectedLayers.length === 0 || selectedLayers.some(l => l.id === 'background')) return;

        const moveItems = <T extends { id: string }>(array: T[], itemsToMoveIds: string[], direction: 'forward' | 'backward' | 'front' | 'back'): T[] => {
            const itemsToMove = array.filter(item => itemsToMoveIds.includes(item.id));
            const otherItems = array.filter(item => !itemsToMoveIds.includes(item.id));
    
            switch (direction) {
                case 'front': return [...otherItems, ...itemsToMove];
                case 'back': return [...itemsToMove, ...otherItems];
                case 'forward': {
                    let lastMovedIndex = -1;
                    itemsToMove.forEach(item => {
                        const currentIndex = array.findIndex(i => i.id === item.id);
                        if (currentIndex > lastMovedIndex) lastMovedIndex = currentIndex;
                    });
                    if (lastMovedIndex === array.length - 1) return array;
                    
                    const itemToSwapWith = array[lastMovedIndex + 1];
                    const newArray = [...array];
                    newArray[lastMovedIndex + 1] = itemsToMove[itemsToMove.length-1];
                    newArray[lastMovedIndex] = itemToSwapWith;
                    return newArray; // Simplified for single selection
                }
                case 'backward': {
                     let firstMovedIndex = array.length;
                     itemsToMove.forEach(item => {
                        const currentIndex = array.findIndex(i => i.id === item.id);
                        if (currentIndex < firstMovedIndex) firstMovedIndex = currentIndex;
                     });
                     if (firstMovedIndex === 0) return array;
                     
                     const itemToSwapWith = array[firstMovedIndex - 1];
                     const newArray = [...array];
                     newArray[firstMovedIndex - 1] = itemsToMove[0];
                     newArray[firstMovedIndex] = itemToSwapWith;
                     return newArray; // Simplified for single selection
                }
            }
            return array;
        };

        const { textLayers, imageLayers, shapeLayers } = page;
        
        onPageUpdate(page.id, {
            textLayers: moveItems(textLayers, selectedLayerIds, direction),
            imageLayers: moveItems(imageLayers, selectedLayerIds, direction),
            shapeLayers: moveItems(shapeLayers, selectedLayerIds, direction)
        });
    }, [selectedLayers.length, selectedLayerIds, page, onPageUpdate]);

    const handleGroup = useCallback(() => {
        if (selectedLayerIds.length <= 1) return;
        const newGroup: Group = { id: uuidv4(), name: `그룹 ${ (page.groups?.length || 0) + 1}`};
        const newGroups = [...(page.groups || []), newGroup];
        const updater = <T extends AllLayer>(l: T): T => selectedLayerIds.includes(l.id) ? { ...l, groupId: newGroup.id } : l;

        onPageUpdate(page.id, {
            groups: newGroups,
            textLayers: page.textLayers.map(updater),
            imageLayers: page.imageLayers.map(updater),
            shapeLayers: page.shapeLayers.map(updater),
        });
    }, [onPageUpdate, page, selectedLayerIds]);

    const handleUngroup = useCallback(() => {
        const groupId = selectedLayers[0]?.groupId;
        if (!groupId) return;

        const newGroups = page.groups?.filter(g => g.id !== groupId);
        const updater = <T extends AllLayer>(l: T): T => l.groupId === groupId ? { ...l, groupId: undefined } : l;
        
        onPageUpdate(page.id, {
            groups: newGroups,
            textLayers: page.textLayers.map(updater),
            imageLayers: page.imageLayers.map(updater),
            shapeLayers: page.shapeLayers.map(updater),
        });
        setSelectedLayerIds(selectedLayerIds.filter(id => allLayers.find(l => l.id === id)?.groupId === groupId));
    }, [page, onPageUpdate, selectedLayers, setSelectedLayerIds, selectedLayerIds, allLayers]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
             const target = e.target as HTMLElement;
             if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            switch(e.key) {
                case 'Delete': case 'Backspace': deleteSelectedLayers(); break;
                case 'c': if(e.metaKey || e.ctrlKey) handleCopy(); break;
                case 'v': if(e.metaKey || e.ctrlKey) handlePaste(); break;
                // FIX: Use handleGroup for the keyboard shortcut.
                case 'g': if(e.metaKey || e.ctrlKey) { e.preventDefault(); handleGroup(); } break;
                // FIX: Use handleUngroup for the keyboard shortcut.
                case 'G': if(e.metaKey || e.ctrlKey || e.shiftKey) { e.preventDefault(); handleUngroup(); } break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // FIX: Update dependency array for useEffect.
    }, [deleteSelectedLayers, handleCopy, handlePaste, handleGroup, handleUngroup]);

    const activateEyedropper = (callback: (color: string) => void) => {
        setEyedropperState({ callback });
    };

    const handleColorPick = (color: string) => {
        if (eyedropperState) {
            eyedropperState.callback(color);
            setEyedropperState(null);
        } else if (activeTool === 'eyedropper') {
            if (selectedLayers.length > 0) {
                const updates = selectedLayers.map(layer => {
                    if ('content' in layer) { // Text layers have 'color'
                        return { id: layer.id, changes: { color } };
                    } else if ('fill' in layer) { // Shape layers have 'fill'
                        return { id: layer.id, changes: { fill: color } };
                    }
                    return null; // Image layers are not affected
                }).filter(u => u !== null);

                if (updates.length > 0) {
                    handleMultipleLayerUpdate(updates as { id: string, changes: Partial<AllLayer> }[]);
                }
            }
            setActiveTool('select');
        }
    };

    const handleAiExpand = (layerId: string, event: React.MouseEvent) => {
        setExpandState({ layerId, x: event.clientX, y: event.clientY });
    };

    const handleExecuteExpand = async (prompt: string) => {
        if (!expandState) return;
        const { layerId } = expandState;
        const actionId = `expand-${layerId}`;
        setIsProcessingAiAction(actionId);
        setError(null);

        const layer = page.imageLayers.find(l => l.id === layerId);
        const asset = layer ? projectData.imageLibrary.find(a => a.id === layer.assetId) : null;
        
        if (layer && asset) {
            try {
                // Expand by 50% for a significant change
                const newWidth = Math.round(layer.width * 1.5);
                const newHeight = Math.round(layer.height * 1.5);

                const base64 = await fileToDataURL(asset.file).then(getBase64FromDataUrl);
                
                const newBase64 = await expandImageWithAI(base64, asset.file.type, newWidth, newHeight, prompt);
                
                const dataUrl = `data:image/png;base64,${newBase64}`;
                const newFile = dataURLtoFile(dataUrl, `expanded_${asset.file.name}`);
                const image = new Image();
                image.src = dataUrl;
                await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });

                const newAsset: ImageAsset = {
                    id: uuidv4(),
                    file: newFile,
                    previewUrl: URL.createObjectURL(newFile),
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                };

                updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, newAsset] }));

                // Update the layer, centering the new larger image over the old position
                handleLayerUpdate(layerId, {
                    assetId: newAsset.id,
                    left: layer.left - (newWidth - layer.width) / 2,
                    top: layer.top - (newHeight - layer.height) / 2,
                    width: newWidth,
                    height: newHeight,
                });
            } catch (err) {
                setError(getApiErrorMessage(err, 'AI 이미지 확장'));
            } finally {
                setIsProcessingAiAction(null);
                setExpandState(null);
            }
        } else {
            setIsProcessingAiAction(null);
            setExpandState(null);
        }
    };

    const handleExecuteAiAction = useCallback(async (action: AiAction) => {
        const actionId = `${action.type}-${'layerId' in action ? action.layerId : 'page'}`;
        setIsProcessingAiAction(actionId);
        setError(null);
        try {
            switch (action.type) {
                case 'remixPage':
                    const suggestions = await remixPageLayout(page, projectData);
                    setRemixSuggestions(suggestions);
                    break;
                case 'adaptPage':
                    const newDocument = await adaptPageLayout(page, projectData, action.targetType);
                    updateProjectData(p => ({ ...p, documents: [newDocument, ...p.documents] }));
                    onDocumentCreationCloseEditor();
                    alert(`'${newDocument.name}' 디자인이 '내 디자인' 목록에 추가되었습니다.`);
                    break;
                case 'refinePage':
                    const newLayout = await refinePageLayout(page, projectData, action.prompt);
                    onPageUpdate(page.id, newLayout);
                    break;
                case 'refineText':
                    const textLayer = page.textLayers.find(l => l.id === action.layerId);
                    if (textLayer) {
                        const newContent = await refineTextContent(textLayer.content, action.prompt);
                        handleLayerUpdate(action.layerId, { content: newContent });
                    }
                    break;
                case 'suggestFont':
                    const fontLayer = page.textLayers.find(l => l.id === action.layerId);
                    if (fontLayer) {
                        const suggestion = await suggestFont(fontLayer, page.textLayers, projectData.designBrief);
                        handleLayerUpdate(action.layerId, { fontFamily: suggestion.fontFamily, fontWeight: suggestion.fontWeight });
                    }
                    break;
                case 'removeBackground':
                    const imageLayer = page.imageLayers.find(l => l.id === action.layerId);
                    const asset = imageLayer ? projectData.imageLibrary.find(a => a.id === imageLayer.assetId) : null;
                    if (asset) {
                        const base64 = await fileToDataURL(asset.file).then(getBase64FromDataUrl);
                        const newBase64 = await removeBackgroundImage(base64, asset.file.type);
                        const dataUrl = `data:image/png;base64,${newBase64}`;
                        const newFile = dataURLtoFile(dataUrl, `bg_removed_${asset.file.name}`);
                        const image = new Image();
                        image.src = dataUrl;
                        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
                        const newAsset: ImageAsset = {
                            id: uuidv4(),
                            file: newFile,
                            previewUrl: URL.createObjectURL(newFile),
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                        };
                        updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, newAsset]}));
                        handleLayerUpdate(action.layerId, { assetId: newAsset.id });
                    }
                    break;
                case 'smartCrop':
                     const cropLayer = page.imageLayers.find(l => l.id === action.layerId);
                     const cropAsset = cropLayer ? projectData.imageLibrary.find(a => a.id === cropLayer.assetId) : null;
                     if (cropAsset && cropLayer) {
                        const base64 = await fileToDataURL(cropAsset.file).then(getBase64FromDataUrl);
                        const newBase64 = await cropImageWithAI(base64, cropAsset.file.type);
                        const dataUrl = `data:image/png;base64,${newBase64}`;
                        const newFile = dataURLtoFile(dataUrl, `cropped_${cropAsset.file.name}`);
                        const image = new Image();
                        image.src = dataUrl;
                        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
                        const newAsset: ImageAsset = {
                            id: uuidv4(),
                            file: newFile,
                            previewUrl: URL.createObjectURL(newFile),
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                        };
                        updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, newAsset] }));
                        handleLayerUpdate(action.layerId, {
                            assetId: newAsset.id,
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                            left: cropLayer.left + (cropLayer.width - image.naturalWidth) / 2,
                            top: cropLayer.top + (cropLayer.height - image.naturalHeight) / 2,
                        });
                    }
                    break;
                case 'generateAltText':
                    const altLayer = page.imageLayers.find(l => l.id === action.layerId);
                    const altAsset = altLayer ? projectData.imageLibrary.find(a => a.id === altLayer.assetId) : null;
                    if (altAsset) {
                        const base64 = await fileToDataURL(altAsset.file).then(getBase64FromDataUrl);
                        const newAltText = await generateAltText(base64);
                        handleLayerUpdate(action.layerId, { alt: newAltText });
                        alert(`AI가 생성한 대체 텍스트가 적용되었습니다: "${newAltText}"`);
                    }
                    break;
                case 'extractColors':
                    const colorLayer = page.imageLayers.find(l => l.id === action.layerId);
                    const colorAsset = colorLayer ? projectData.imageLibrary.find(a => a.id === colorLayer.assetId) : null;
                    if (colorAsset) {
                        const base64 = await fileToDataURL(colorAsset.file).then(getBase64FromDataUrl);
                        const colors = await extractColorsFromImage(base64);
                        
                        updateProjectData(p => {
                            const newColors: BrandColor[] = colors.map(c => ({ id: uuidv4(), role: 'Accent', value: c }));
                            const existingColors = p.brandKit.colors.map(c => c.value);
                            const uniqueNewColors = newColors.filter(c => !existingColors.includes(c.value));
                            const combined = [...p.brandKit.colors, ...uniqueNewColors];
                            const finalColors = combined.slice(0, 5); // Limit to 5 colors
                            return { ...p, brandKit: { ...p.brandKit, colors: finalColors } };
                        });
                        alert(`이미지에서 색상을 추출하여 브랜드 키트에 추가했습니다: ${colors.join(', ')}`);
                    }
                    break;
            }
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setIsProcessingAiAction(null);
        }
    }, [page, projectData, updateProjectData, onPageUpdate, handleLayerUpdate, onDocumentCreationCloseEditor, setRemixSuggestions, setError]);

    return (
        <div className="h-full w-full flex bg-slate-50">
            <Toolbar activeTool={activeTool} setActiveTool={tool => {
                if (tool === 'eyedropper') activateEyedropper(() => {}); // Activate generic eyedropper
                else setActiveTool(tool);
            }}/>
            <LeftPanel 
                projectData={projectData}
                addLayer={addLayer}
                updateProjectData={updateProjectData}
                onDeleteAsset={onDeleteAsset}
                allLayers={allVisibleLayers}
                selectedLayerIds={selectedLayerIds}
                setSelectedLayerIds={setSelectedLayerIds}
                handleLayerUpdate={handleLayerUpdate}
                forceAiAssistant={forceAiAssistant}
                onAiAssistantClose={onAiAssistantClose}
                editingDocumentId={editingDocument.id}
                onStartGeneration={onStartGeneration}
                onOpenDataDrivenModal={() => setIsDataDrivenModalOpen(true)}
                onStartWizard={onStartWizard}
            />
            <div className="flex-grow flex flex-col relative">
                <Canvas
                    page={page}
                    allLayers={allLayers}
                    addLayer={addLayer}
                    selectedLayerIds={selectedLayerIds}
                    setSelectedLayerIds={setSelectedLayerIds}
                    editingLayerId={editingLayerId}
                    setEditingLayerId={setEditingLayerId}
                    interaction={interaction}
                    setInteraction={setInteraction}
                    handleLayerUpdate={handleLayerUpdate}
                    handleMultipleLayerUpdate={handleMultipleLayerUpdate}
                    assetUrlMap={assetUrlMap}
                    handleCopy={handleCopy}
                    handlePaste={handlePaste}
                    deleteSelectedLayers={deleteSelectedLayers}
                    handleLayerOrderChange={handleLayerOrderChange}
                    isInitialBrief={isInitialBrief}
                    activeTool={activeTool}
                    onAiAreaSelected={handleAiAreaSelected}
                    projectData={projectData}
                    onGroup={handleGroup}
                    onUngroup={handleUngroup}
                    onPageUpdate={onPageUpdate}
                    onAiAction={(type) => handleExecuteAiAction({type, layerId: selectedLayerIds[0]})}
                    isEyedropperActive={activeTool === 'eyedropper' || !!eyedropperState}
                    onColorPick={handleColorPick}
                    magicWandState={magicWandState}
                    setMagicWandState={setMagicWandState}
                    onExecuteMagicWand={async (prompt: string) => {
                        setIsProcessingMagicWand(true);
                        try {
                            const targetLayers = allLayers.filter(l => magicWandState?.targetLayerIds.includes(l.id));
                            const newLayout = await executeMagicWandAction(page, projectData, targetLayers, magicWandState!.position, prompt);
                            onPageUpdate(page.id, newLayout);
                        } catch (err) {
                            setError(getApiErrorMessage(err));
                        } finally {
                            setIsProcessingMagicWand(false);
                            setMagicWandState(null);
                        }
                    }}
                    isProcessingMagicWand={isProcessingMagicWand}
                    processingAiActionLayerId={isProcessingAiAction}
                    onAiExpand={handleAiExpand}
                />
                <PageNavigator
                    pages={editingDocument.pages}
                    activePageIndex={activePageIndex}
                    onSelectPage={onSelectPage}
                    onAddPage={onAddPage}
                    onDeletePage={onDeletePage}
                />
            </div>
            <InspectorPanel
                page={page}
                onPageUpdate={onPageUpdate}
                selectedLayers={allVisibleLayers.filter(l => selectedLayerIds.includes(l.id))}
                handleLayerUpdate={handleLayerUpdate}
                handleMultipleLayerUpdate={handleMultipleLayerUpdate}
                deleteSelectedLayers={deleteSelectedLayers}
                handleLayerOrderChange={handleLayerOrderChange}
                onGroup={handleGroup}
                onUngroup={handleUngroup}
                onActivateEyedropper={activateEyedropper}
                onExecuteAiAction={handleExecuteAiAction}
                isProcessingAiAction={isProcessingAiAction}
            />
            {aiGenerationState.visible && <AiGenerateModal onClose={() => setAiGenerationState({ rect: null, visible: false })} onGenerate={handleAiGenerate} />}
            {isDataDrivenModalOpen && 
                <DataDrivenModal 
                    isOpen={isDataDrivenModalOpen} 
                    onClose={() => setIsDataDrivenModalOpen(false)} 
                    templatePage={page} 
                    onGenerate={handleDataDrivenGenerate}
                />
            }
            {expandState && (
                <AiMagicWandInput
                    x={expandState.x}
                    y={expandState.y}
                    onSubmit={handleExecuteExpand}
                    onClose={() => setExpandState(null)}
                    isProcessing={!!isProcessingAiAction && isProcessingAiAction.startsWith('expand-')}
                    placeholder="어떻게 확장할까요? 예: 푸른 하늘과 구름"
                />
            )}
            {remixSuggestions && (
                <RemixSuggestionsModal
                    isOpen={!!remixSuggestions}
                    onClose={() => setRemixSuggestions(null)}
                    suggestions={remixSuggestions}
                    originalPage={page}
                    assetUrlMap={assetUrlMap}
                    onSelect={(suggestion) => {
                        onPageUpdate(page.id, suggestion);
                        setRemixSuggestions(null);
                    }}
                />
            )}
        </div>
    );
};
