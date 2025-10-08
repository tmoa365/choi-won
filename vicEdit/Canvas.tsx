import React, { useRef, useLayoutEffect, useState, MouseEvent, useEffect, useMemo, useCallback } from 'react';
import { DesignPage, TextLayer, ImageLayer, ShapeLayer, DesignProject, DesignType } from '../types';
import { LayerComponent } from './LayerComponent';
import { mmToPx, ptToPx, rgbToHex } from './utils';
import { AllLayer, MagicWandState, Interaction } from '../types';
import { CanvasFooter } from './CanvasFooter';
import { Ruler } from './Ruler';
import { ContextMenu, ContextMenuTarget } from './ContextMenu';
import { v4 as uuidv4 } from 'uuid';
import { SparklesIcon } from '../components/icons';
import { Tool } from './Toolbar';
import { AiMagicWandInput } from '../components/AiMagicWandInput';

interface CanvasProps {
    page: DesignPage;
    allLayers: AllLayer[];
    addLayer: (layer: AllLayer, file?: File) => void;
    selectedLayerIds: string[];
    setSelectedLayerIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    editingLayerId: string | null;
    setEditingLayerId: (id: string | null) => void;
    interaction: Interaction | null;
    setInteraction: (interaction: Interaction | null) => void;
    handleLayerUpdate: (id: string, updates: Partial<AllLayer>) => void;
    handleMultipleLayerUpdate: (updates: { id: string, changes: Partial<AllLayer> }[]) => void;
    assetUrlMap: Map<string, string>;
    handleCopy: () => void;
    handlePaste: () => void;
    deleteSelectedLayers: () => void;
    handleLayerOrderChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
    isInitialBrief: boolean;
    activeTool: Tool;
    onAiAreaSelected: (rect: { x: number, y: number, width: number, height: number }) => void;
    projectData: DesignProject;
    onGroup: () => void;
    onUngroup: () => void;
    onPageUpdate: (pageId: string, updates: Partial<DesignPage>) => void;
    onAiAction: (actionType: 'removeBackground' | 'suggestFont') => void;
    isEyedropperActive: boolean;
    onColorPick: (color: string) => void;
    magicWandState: MagicWandState | null;
    setMagicWandState: (state: MagicWandState | null) => void;
    onExecuteMagicWand: (prompt: string) => void;
    isProcessingMagicWand: boolean;
    processingAiActionLayerId: string | null;
    onAiExpand: (layerId: string, event: MouseEvent) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    page, allLayers, addLayer, selectedLayerIds, setSelectedLayerIds,
    editingLayerId, setEditingLayerId, interaction, setInteraction,
    handleLayerUpdate, handleMultipleLayerUpdate, assetUrlMap,
    handleCopy, handlePaste, deleteSelectedLayers, handleLayerOrderChange,
    isInitialBrief, activeTool, onAiAreaSelected, projectData, onGroup, onUngroup, onPageUpdate, onAiAction,
    isEyedropperActive, onColorPick, magicWandState, setMagicWandState, onExecuteMagicWand, isProcessingMagicWand,
    processingAiActionLayerId, onAiExpand
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const isMultiSelecting = useRef(false);
    const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [showRulers, setShowRulers] = useState(true);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, target: ContextMenuTarget } | null>(null);
    const [isDraggingGuide, setIsDraggingGuide] = useState<{ type: 'h' | 'v', index: number } | null>(null);
    const guideDragStart = useRef(0);
    const [ephemeralLayers, setEphemeralLayers] = useState<AllLayer[] | null>(null);

    const canvasWidth = useMemo(() => page.width_mm ? mmToPx(page.width_mm) : mmToPx(420), [page.width_mm]);
    const canvasHeight = useMemo(() => page.height_mm ? mmToPx(page.height_mm) : mmToPx(594), [page.height_mm]);
    
    const fitToScreen = useCallback(() => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const scaleX = (width - 60) / canvasWidth;
        const scaleY = (height - 60) / canvasHeight;
        const newZoom = Math.min(scaleX, scaleY);
        setZoom(newZoom);
        setPan({ x: (width - canvasWidth * newZoom) / 2, y: (height - canvasHeight * newZoom) / 2 });
    }, [canvasWidth, canvasHeight]);

    useLayoutEffect(() => {
        fitToScreen();
    }, [page.id, fitToScreen]);

    const getMousePos = (e: MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleLayerMouseDown = (e: MouseEvent, layer: AllLayer) => {
        e.stopPropagation();
        setEditingLayerId(null);
        isMultiSelecting.current = e.shiftKey;
        if (!isMultiSelecting.current && !selectedLayerIds.includes(layer.id)) {
            setSelectedLayerIds([layer.id]);
        } else if (isMultiSelecting.current) {
            setSelectedLayerIds(prev => prev.includes(layer.id) ? prev.filter(id => id !== layer.id) : [...prev, layer.id]);
        }

        const { x, y } = getMousePos(e);
        const initialLayers = allLayers.filter(l => selectedLayerIds.includes(l.id) || l.id === layer.id);

        setInteraction({ type: 'move', startX: x, startY: y, initialLayers });
    };

    const handleControlMouseDown = (e: MouseEvent, layer: AllLayer, type: 'resize' | 'rotate', handle?: 'tl' | 'tr' | 'bl' | 'br') => {
        e.stopPropagation();
        const { x, y } = getMousePos(e);
        const layerCenter = { x: layer.left + layer.width / 2, y: layer.top + layer.height / 2 };
        setInteraction({ type, handle, startX: x, startY: y, initialLayers: [layer], layerCenter, initialAngle: layer.rotation });
    };

    const handleCanvasMouseDown = async (e: MouseEvent) => {
        setEditingLayerId(null);
        if (e.button !== 0) return; // Only left click

        if (isEyedropperActive) {
            if (!canvasRef.current) return;
            try {
                // Temporarily remove outlines to avoid picking their color
                const selectedElements = canvasRef.current.querySelectorAll('.outline');
                selectedElements.forEach(el => el.classList.remove('outline', 'outline-2', 'outline-blue-500'));

                const capturedCanvas = await window.html2canvas(canvasRef.current, {
                    useCORS: true,
                    backgroundColor: null,
                    scale: 1, // Capture at native resolution, ignoring CSS transform
                });
                
                // Restore outlines
                selectedElements.forEach(el => el.classList.add('outline', 'outline-2', 'outline-blue-500'));

                const { x: scaledX, y: scaledY } = getMousePos(e);
                const realX = scaledX / zoom;
                const realY = scaledY / zoom;

                const ctx = capturedCanvas.getContext('2d');
                if (!ctx) return;
                
                const p = ctx.getImageData(realX, realY, 1, 1).data;
                const hex = rgbToHex(p[0], p[1], p[2]);
                onColorPick(hex);

            } catch (error) {
                console.error("Eyedropper failed:", error);
            }
            return; // Prevent other mousedown logic after picking color
        }
        
        const target = e.target as HTMLElement;
        const isGuide = target.dataset.guideType;
        if(isGuide) return;
        
        if (activeTool === 'select' || activeTool === 'magic-wand') {
            if (!isMultiSelecting.current) {
                setSelectedLayerIds([]);
            }
            const { x, y } = getMousePos(e);
            setSelectionBox({ x, y, width: 0, height: 0 });
        }
        
        if (e.buttons === 4 || e.buttons === 2 || (e.buttons === 1 && e.altKey)) { // Middle mouse or right click or alt+left
            setIsPanning(true);
        }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
        e.stopPropagation();
        
        if (interaction && ephemeralLayers) {
            const updates = ephemeralLayers.map(l => ({
                id: l.id,
                changes: {
                    left: l.left,
                    top: l.top,
                    width: l.width,
                    height: l.height,
                    rotation: l.rotation,
                }
            }));
            handleMultipleLayerUpdate(updates);
        }

        setInteraction(null);
        setEphemeralLayers(null);
        setIsPanning(false);
        isMultiSelecting.current = false;
        if(selectionBox) {
            if (activeTool === 'magic-wand') {
                const pos = getMousePos(e);
                setMagicWandState({ position: pos, targetLayerIds: selectedLayerIds });
            }
        }
        setSelectionBox(null);

        if (aiArea.current) {
            onAiAreaSelected(aiArea.current);
            aiArea.current = null;
        }

        if (isDraggingGuide) {
            setIsDraggingGuide(null);
        }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = getMousePos(e);

        if(isDraggingGuide && canvasRef.current) {
            const { type, index } = isDraggingGuide;
            const pos = type === 'h' ? y : x;
            const newGuides = type === 'h' ? [...page.hGuides || []] : [...page.vGuides || []];
            newGuides[index] = Math.round(pos);
            onPageUpdate(page.id, type === 'h' ? { hGuides: newGuides } : { vGuides: newGuides });
            return;
        }

        if (isPanning) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
            return;
        }
        
        if (selectionBox) {
            const newSelectionBox = { ...selectionBox, width: x - selectionBox.x, height: y - selectionBox.y };
            setSelectionBox(newSelectionBox);

            if (activeTool === 'select') {
                const selected = allLayers.filter(layer => {
                    const layerRect = { x1: layer.left, y1: layer.top, x2: layer.left + layer.width, y2: layer.top + layer.height };
                    const selectionRect = {
                        x1: Math.min(newSelectionBox.x, newSelectionBox.x + newSelectionBox.width),
                        y1: Math.min(newSelectionBox.y, newSelectionBox.y + newSelectionBox.height),
                        x2: Math.max(newSelectionBox.x, newSelectionBox.x + newSelectionBox.width),
                        y2: Math.max(newSelectionBox.y, newSelectionBox.y + newSelectionBox.height),
                    };
                    return layerRect.x1 < selectionRect.x2 && layerRect.x2 > selectionRect.x1 &&
                           layerRect.y1 < selectionRect.y2 && layerRect.y2 > selectionRect.y1;
                }).map(l => l.id);
                setSelectedLayerIds(selected);
            }
        }
        
        if (!interaction) return;
        const { type, startX, startY, initialLayers } = interaction;
        const dx = (x - startX);
        const dy = (y - startY);

        const updatedEphemeralLayers = initialLayers.map(layer => {
            let newLayer = { ...layer };
            if (type === 'move') {
                newLayer.left = layer.left + dx;
                newLayer.top = layer.top + dy;
            } else if (type === 'resize' && interaction.handle) {
                let newWidth = layer.width;
                let newHeight = layer.height;
                let newLeft = layer.left;
                let newTop = layer.top;
                
                const aspectRatio = layer.width / layer.height;

                if (interaction.handle.includes('r')) newWidth = layer.width + dx;
                if (interaction.handle.includes('l')) { newWidth = layer.width - dx; newLeft = layer.left + dx; }
                if (interaction.handle.includes('b')) newHeight = layer.height + dy;
                if (interaction.handle.includes('t')) { newHeight = layer.height - dy; newTop = layer.top + dy; }
                
                if (e.shiftKey && ('assetId' in layer || 'type' in layer)) { // aspect ratio for images and shapes
                    if (interaction.handle.includes('r') || interaction.handle.includes('l')) {
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newWidth = newHeight * aspectRatio;
                    }
                    if (interaction.handle.includes('t')) newTop = layer.top + layer.height - newHeight;
                    if (interaction.handle.includes('l')) newLeft = layer.left + layer.width - newWidth;
                }
                
                newLayer.width = Math.max(20, newWidth);
                newLayer.height = Math.max(20, newHeight);
                newLayer.left = newLeft;
                newLayer.top = newTop;
            } else if (type === 'rotate' && interaction.layerCenter) {
                const angle = Math.atan2(y - interaction.layerCenter.y, x - interaction.layerCenter.x) * (180 / Math.PI);
                const startAngle = Math.atan2(startY - interaction.layerCenter.y, startX - interaction.layerCenter.x) * (180 / Math.PI);
                let newRotation = (interaction.initialAngle || 0) + (angle - startAngle);
                if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
                newLayer.rotation = newRotation;
            }
            return newLayer;
        });
        setEphemeralLayers(updatedEphemeralLayers);
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
             const target = e.target as HTMLElement;
             if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            switch(e.key) {
                case 'Delete': case 'Backspace': deleteSelectedLayers(); break;
                case 'c': if(e.metaKey || e.ctrlKey) handleCopy(); break;
                case 'v': if(e.metaKey || e.ctrlKey) handlePaste(); break;
                case 'g': if(e.metaKey || e.ctrlKey) { e.preventDefault(); onGroup(); } break;
                case 'G': if(e.metaKey || e.ctrlKey || e.shiftKey) { e.preventDefault(); onUngroup(); } break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedLayers, handleCopy, handlePaste, onGroup, onUngroup]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const newZoom = zoom - e.deltaY * 0.001;
            setZoom(Math.max(0.1, Math.min(newZoom, 5)));
        } else {
            setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const aiArea = useRef<{ x: number, y: number, width: number, height: number } | null>(null);
    const handleCanvasClick = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);
        switch (activeTool) {
            case 'text':
                addLayer({
                    id: uuidv4(), content: '텍스트', top: y, left: x, width: 200, height: 50,
                    fontSize: ptToPx(16), fontWeight: 400, color: '#000000', textAlign: 'left',
                    fontFamily: projectData.designBrief.fontFamily || 'Noto Sans KR',
                    rotation: 0, opacity: 1, fontStyle: 'normal', textDecoration: 'none'
                });
                break;
            case 'rectangle':
                addLayer({
                    id: uuidv4(), type: 'rectangle', top: y, left: x, width: 150, height: 100,
                    rotation: 0, fill: '#6366f1', strokeColor: '#000000', strokeWidth: 0, opacity: 1
                });
                break;
            case 'ai-generate':
                 aiArea.current = { x, y, width: 200, height: 200 }; // temporary
                 break;
        }
    };
    
    const handleContextMenu = (e: MouseEvent, target: ContextMenuTarget) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, target });
    }

    const isBannerType = useMemo(() => [DesignType.Banner, DesignType.Placard, DesignType.WideBanner, DesignType.XBanner].includes(page.type), [page.type]);
    const safeAreaInset = useMemo(() => {
        if (!isBannerType) return 0;
        if (page.type === DesignType.XBanner || page.type === DesignType.WideBanner) {
            return mmToPx(30); // 3cm for smaller banners
        }
        return mmToPx(70); // 7cm for large banners
    }, [isBannerType, page.type]);

    const displayedLayers = useMemo(() => {
        if (!ephemeralLayers) {
            return allLayers;
        }
        const ephemeralLayerIds = new Set(ephemeralLayers.map(l => l.id));
        const staticLayers = allLayers.filter(l => !ephemeralLayerIds.has(l.id));
        return [...staticLayers, ...ephemeralLayers];
    }, [allLayers, ephemeralLayers]);

    return (
        <div className="flex-grow flex flex-col bg-slate-300 relative overflow-hidden" ref={containerRef} onWheel={handleWheel}>
            <div className="flex-grow w-full h-full" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseDown={handleCanvasMouseDown}>
                <div ref={canvasRef}
                    className="absolute bg-white shadow-xl"
                    style={{
                        width: `${canvasWidth}px`, height: `${canvasHeight}px`,
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'top left',
                        cursor: isPanning ? 'grabbing' : activeTool === 'text' ? 'text' : activeTool === 'rectangle' ? 'crosshair' : activeTool === 'ai-generate' ? 'crosshair' : isEyedropperActive ? 'crosshair' : 'default',
                    }}
                    onClick={handleCanvasClick}
                    onContextMenu={(e) => handleContextMenu(e, 'canvas')}
                >
                    <img src={assetUrlMap.get('background_asset')} className="absolute w-full h-full object-cover" />
                     {page.dieline && (
                        <svg className="absolute w-full h-full pointer-events-none" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} style={{ zIndex: 100}}>
                            <path d={page.dieline.cutPath} stroke="magenta" strokeWidth="2" fill="none" />
                            <path d={page.dieline.creasePath} stroke="cyan" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                        </svg>
                    )}
                    {displayedLayers.map(layer => (
                        <LayerComponent
                            key={layer.id}
                            layer={layer}
                            isSelected={selectedLayerIds.includes(layer.id)}
                            isMultiSelecting={isMultiSelecting.current}
                            editingLayerId={editingLayerId}
                            interaction={interaction}
                            assetUrlMap={assetUrlMap}
                            processingAiActionLayerId={processingAiActionLayerId}
                            onLayerMouseDown={(e) => handleLayerMouseDown(e, layer)}
                            onControlMouseDown={(e, type, handle) => handleControlMouseDown(e, layer, type, handle)}
                            onDoubleClick={() => 'content' in layer && setEditingLayerId(layer.id)}
                            onTextChange={(newContent) => handleLayerUpdate(layer.id, { content: newContent })}
                            onTextBlur={() => setEditingLayerId(null)}
                            onContextMenu={(e) => {
                                if (!selectedLayerIds.includes(layer.id)) {
                                    setSelectedLayerIds([layer.id]);
                                }
                                handleContextMenu(e, 'layer');
                            }}
                            onAiExpand={onAiExpand}
                        />
                    ))}
                    {selectionBox && (
                         <div className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                            style={{
                                left: selectionBox.width > 0 ? selectionBox.x : selectionBox.x + selectionBox.width,
                                top: selectionBox.height > 0 ? selectionBox.y : selectionBox.y + selectionBox.height,
                                width: Math.abs(selectionBox.width),
                                height: Math.abs(selectionBox.height)
                            }}
                         />
                    )}
                    {(page.hGuides || []).map((guide, i) => (
                        <div key={`h-guide-${i}`} data-guide-type="h" onMouseDown={(e) => { e.stopPropagation(); setIsDraggingGuide({ type: 'h', index: i }); guideDragStart.current = getMousePos(e).y; }} className="absolute h-px w-full bg-cyan-400 cursor-row-resize" style={{ top: guide, zIndex: 99 }} />
                    ))}
                    {(page.vGuides || []).map((guide, i) => (
                        <div key={`v-guide-${i}`} data-guide-type="v" onMouseDown={(e) => { e.stopPropagation(); setIsDraggingGuide({ type: 'v', index: i }); guideDragStart.current = getMousePos(e).x; }} className="absolute w-px h-full bg-cyan-400 cursor-col-resize" style={{ left: guide, zIndex: 99 }} />
                    ))}
                    {isBannerType && (
                        <div 
                            className="absolute inset-0 pointer-events-none border-dashed border-2 border-magenta-500"
                            style={{
                                left: safeAreaInset,
                                top: safeAreaInset,
                                right: safeAreaInset,
                                bottom: safeAreaInset,
                                boxSizing: 'border-box'
                            }}
                        >
                            <div className="absolute -top-5 left-0 text-magenta-500 text-xs bg-white/70 px-1 rounded" style={{transform: `scale(${1/zoom})`, transformOrigin: 'top left'}}>안전 영역</div>
                        </div>
                    )}
                </div>
                {showRulers && (
                     <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'top left' }}>
                        <div className="absolute -top-5 -left-5 w-[calc(100%+20px)] h-[calc(100%+20px)] overflow-hidden">
                             <div className="absolute top-5 left-5" style={{ width: `${canvasWidth * zoom}px`, height: `${canvasHeight * zoom}px`}}>
                                <Ruler orientation="horizontal" zoom={zoom} scrollPos={0} size={canvasWidth * zoom} onMouseDown={(e, o) => {}}/>
                                <Ruler orientation="vertical" zoom={zoom} scrollPos={0} size={canvasHeight * zoom} onMouseDown={(e, o) => {}}/>
                             </div>
                        </div>
                     </div>
                )}
                 {isInitialBrief && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-16 rounded-3xl text-center max-w-2xl shadow-2xl border border-slate-700">
                            <SparklesIcon className="w-16 h-16 mx-auto text-yellow-400"/>
                            <h3 className="text-2xl font-bold mt-6 text-white">AI 디자인을 시작해 보세요!</h3>
                            <p className="mt-4 text-slate-300">왼쪽의 '프로젝트 브리핑' 패널에서 디자인 정보를 입력하여 AI 시안 생성을 시작하거나, 툴바의 도구를 사용하여 직접 디자인을 시작할 수 있습니다.</p>
                        </div>
                    </div>
                )}
                {contextMenu && (
                    <ContextMenu {...contextMenu} selectedLayers={allLayers.filter(l => selectedLayerIds.includes(l.id))}
                        onClose={() => setContextMenu(null)}
                        onCopy={handleCopy}
                        onPaste={handlePaste}
                        onDelete={deleteSelectedLayers}
                        onOrderChange={handleLayerOrderChange}
                        onAiAction={onAiAction}
                        onFitToScreen={fitToScreen}
                        onZoomTo100={() => setZoom(1)}
                        onGroup={onGroup}
                        onUngroup={onUngroup}
                    />
                )}
            </div>
            <CanvasFooter zoom={zoom} setZoom={setZoom} fitToScreen={fitToScreen} showRulers={showRulers} setShowRulers={setShowRulers} />
            {magicWandState && (
                <AiMagicWandInput
                    x={magicWandState.position.x + pan.x}
                    y={magicWandState.position.y + pan.y}
                    onSubmit={onExecuteMagicWand}
                    onClose={() => setMagicWandState(null)}
                    isProcessing={isProcessingMagicWand}
                />
            )}
        </div>
    );
};