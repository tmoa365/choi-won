import React, { useState, useMemo } from 'react';
import { DesignPage, TextEffect, TextEffectType, Gradient, AllLayer } from '../types';
import { Input, Button, Label, Select, Textarea } from '../components/ui';
import {
    SpinnerIcon, BringForwardIcon, SendBackwardIcon,
    AlignLeftIcon, AlignCenterIcon, AlignRightIcon, OpacityIcon, BoldIcon, ItalicIcon, UnderlineIcon,
    ObjectAlignLeftIcon, ObjectAlignCenterIcon, ObjectAlignRightIcon,
    ObjectAlignTopIcon, ObjectAlignMiddleIcon, ObjectAlignBottomIcon, SparklesIcon,
    TypeIcon, RotateIcon, GroupIcon, XCircleIcon, PlusIcon, EffectsIcon, ChevronDownIcon, MagicWandIcon,
    TrashIcon
} from '../components/icons';
import { KOREAN_FONTS_LIST } from '../components/fonts';
import { getEffectStyles, colorTo1x1PngDataURL, getFillStyle } from './utils';
import { ColorPicker } from '../components/ColorPicker';
import { AiAction } from '../components/AiAssistantModal';

type SelectedLayer = AllLayer;

interface InspectorPanelProps {
    page: DesignPage;
    onPageUpdate: (pageId: string, updates: Partial<DesignPage>) => void;
    selectedLayers: AllLayer[];
    handleLayerUpdate: (id: string, updates: Partial<SelectedLayer>) => void;
    handleMultipleLayerUpdate: (updates: { id: string, changes: Partial<AllLayer> }[]) => void;
    deleteSelectedLayers: () => void;
    handleLayerOrderChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
    onGroup: () => void;
    onUngroup: () => void;
    onActivateEyedropper: (callback: (color: string) => void) => void;
    onExecuteAiAction: (action: AiAction) => void;
    isProcessingAiAction: string | null;
}

type InspectorTab = 'properties' | 'layout';

const effectPresets: { type: TextEffectType, label: string }[] = [
    { type: 'none', label: '없음' }, { type: 'shadow', label: '그림자' }, { type: 'lift', label: '들어올리기' },
    { type: 'stroke', label: '테두리' }, { type: 'neon', label: '네온' },
];

const defaultEffects: { [K in TextEffectType]: Extract<TextEffect, {type: K}> } = {
    shadow: { type: 'shadow', color: '#000000', offset: 5, direction: 135, blur: 5, transparency: 60 },
    lift: { type: 'lift', intensity: 50 }, stroke: { type: 'stroke', color: '#FFFFFF', width: 2 },
    neon: { type: 'neon', color: '#FF00FF', intensity: 50 }, none: { type: 'none' },
};

const InspectorAccordion: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b border-slate-200">
        <button onClick={onToggle} className="flex justify-between items-center w-full py-2 text-left">
            <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider">{title}</span>
            <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>
        {isOpen && <div className="py-3 px-1 space-y-4">{children}</div>}
    </div>
);


export const InspectorPanel: React.FC<InspectorPanelProps> = (props) => {
    const { 
        page, onPageUpdate, selectedLayers, handleLayerUpdate, handleMultipleLayerUpdate, 
        deleteSelectedLayers, handleLayerOrderChange, onGroup, onUngroup, 
        onActivateEyedropper, onExecuteAiAction, isProcessingAiAction
    } = props;
    
    const [openAccordions, setOpenAccordions] = useState(new Set(['transform']));
    const [aiPagePrompt, setAiPagePrompt] = useState('');
    const [aiTextPrompt, setAiTextPrompt] = useState('');

    const toggleAccordion = (name: string) => {
        setOpenAccordions(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };
    
    const selectedLayer = useMemo(() => selectedLayers.length === 1 ? selectedLayers[0] : null, [selectedLayers]);
    const selectionType = useMemo(() => {
        if (selectedLayers.length === 0) return 'page';
        if (selectedLayers.length > 1) return 'multiple';
        if (selectedLayer.id === 'background') return 'background';
        if ('content' in selectedLayer) return 'text';
        if ('assetId' in selectedLayer) return 'image';
        if ('type' in selectedLayer) return 'shape';
        return 'unknown';
    }, [selectedLayers, selectedLayer]);

    const canGroup = selectedLayers.length > 1 && selectedLayers.every(l => !l.groupId);
    const canUngroup = selectedLayers.length > 0 && !!selectedLayers[0].groupId && selectedLayers.every(l => l.groupId === selectedLayers[0].groupId);
    
    const updateEffectProperty = (updates: Partial<TextEffect>) => {
        if (!selectedLayer || !('content' in selectedLayer)) return;
        const currentEffect = selectedLayer.effect || defaultEffects.none;
        handleLayerUpdate(selectedLayer.id, { effect: { ...currentEffect, ...updates } as TextEffect });
    };

    const handleAlignment = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        if (selectedLayers.length < 2) return;
        
        const bounds = {
            left: Math.min(...selectedLayers.map(l => l.left)),
            right: Math.max(...selectedLayers.map(l => l.left + l.width)),
            top: Math.min(...selectedLayers.map(l => l.top)),
            bottom: Math.max(...selectedLayers.map(l => l.top + l.height)),
        };
        const hCenter = bounds.left + (bounds.right - bounds.left) / 2;
        const vCenter = bounds.top + (bounds.bottom - bounds.top) / 2;

        const updates = selectedLayers.map(l => {
            let changes: Partial<AllLayer> = {};
            switch(type) {
                case 'left': changes.left = bounds.left; break;
                case 'center': changes.left = hCenter - l.width / 2; break;
                case 'right': changes.left = bounds.right - l.width; break;
                case 'top': changes.top = bounds.top; break;
                case 'middle': changes.top = vCenter - l.height / 2; break;
                case 'bottom': changes.top = bounds.bottom - l.height; break;
            }
            return { id: l.id, changes };
        });
        handleMultipleLayerUpdate(updates);
    };
    
    const handleBackgroundColorChange = (color: string) => {
        const dataUrl = colorTo1x1PngDataURL(color);
        const base64 = dataUrl.split(',')[1];
        onPageUpdate(page.id, { base64 });
    };

    const renderEffectControls = () => {
        if (selectionType !== 'text' || !selectedLayer || !('content' in selectedLayer)) return null;

        const effect = selectedLayer.effect || defaultEffects.none;
        
        if (effect.type === 'shadow' && 'offset' in effect) {
             return (<>
                <div><Label className="text-xs">오프셋</Label><Input type="range" min="0" max="50" value={effect.offset} onChange={e => updateEffectProperty({ offset: +e.target.value })}/></div>
                <div><Label className="text-xs">방향</Label><Input type="range" min="0" max="360" value={effect.direction} onChange={e => updateEffectProperty({ direction: +e.target.value })}/></div>
                <div><Label className="text-xs">흐림</Label><Input type="range" min="0" max="50" value={effect.blur} onChange={e => updateEffectProperty({ blur: +e.target.value })}/></div>
                <div>
                    <Label className="text-xs">색상</Label>
                    <ColorPicker 
                        value={effect.color} 
                        onChange={color => updateEffectProperty({ color })} 
                        onActivateEyedropper={() => onActivateEyedropper(color => updateEffectProperty({ color }))}
                    />
                </div>
            </>);
        }
        if (effect.type === 'lift' && 'intensity' in effect) {
             return <div><Label className="text-xs">강도</Label><Input type="range" min="0" max="100" value={effect.intensity} onChange={e => updateEffectProperty({ intensity: +e.target.value })}/></div>
        }
        if (effect.type === 'stroke' && 'width' in effect) {
             return (<>
                <div><Label className="text-xs">두께</Label><Input type="range" min="1" max="20" value={effect.width} onChange={e => updateEffectProperty({ width: +e.target.value })}/></div>
                 <div>
                    <Label className="text-xs">색상</Label>
                    <ColorPicker 
                        value={effect.color} 
                        onChange={color => updateEffectProperty({ color })} 
                        onActivateEyedropper={() => onActivateEyedropper(color => updateEffectProperty({ color }))}
                    />
                </div>
            </>);
        }
        if (effect.type === 'neon' && 'intensity' in effect) {
             return (<>
                <div><Label className="text-xs">강도</Label><Input type="range" min="0" max="100" value={effect.intensity} onChange={e => updateEffectProperty({ intensity: +e.target.value })}/></div>
                <div>
                    <Label className="text-xs">색상</Label>
                    <ColorPicker 
                        value={effect.color} 
                        onChange={color => updateEffectProperty({ color })} 
                        onActivateEyedropper={() => onActivateEyedropper(color => updateEffectProperty({ color }))}
                    />
                </div>
            </>);
        }
        return null;
    };
    
    const getHeaderTitle = () => {
        switch(selectionType) {
            case 'page': return '페이지 속성';
            case 'background': return '배경 속성';
            case 'multiple': return `${selectedLayers.length}개 레이어`;
            case 'text':
            case 'image':
            case 'shape':
                return selectedLayer?.name || (selectionType === 'text' ? '텍스트' : selectionType === 'image' ? '이미지' : '도형');
            default: return '속성';
        }
    }
    
    return (
        <div className="w-80 bg-slate-50 overflow-y-auto flex-shrink-0 flex flex-col border-l border-slate-200">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-base font-bold truncate" title={getHeaderTitle()}>{getHeaderTitle()}</h2>
                <div>
                    {canGroup && <Button size="sm" variant="secondary" onClick={onGroup}><GroupIcon className="w-4 h-4 mr-1"/> 그룹</Button>}
                    {canUngroup && <Button size="sm" variant="secondary" onClick={onUngroup}><GroupIcon className="w-4 h-4 mr-1"/> 그룹 해제</Button>}
                </div>
            </div>
            
            <div className="p-3 flex-grow">
                {selectionType === 'page' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label htmlFor="page-w" className="text-xs">너비(mm)</Label><Input type="number" id="page-w" value={Math.round(page.width_mm || 0)} onChange={e => onPageUpdate(page.id, { width_mm: +e.target.value })} /></div>
                            <div><Label htmlFor="page-h" className="text-xs">높이(mm)</Label><Input type="number" id="page-h" value={Math.round(page.height_mm || 0)} onChange={e => onPageUpdate(page.id, { height_mm: +e.target.value })} /></div>
                        </div>
                        <Button variant="secondary" size="sm" className="w-full" onClick={() => onPageUpdate(page.id, { width_mm: page.height_mm, height_mm: page.width_mm })}>
                            <RotateIcon className="h-4 w-4 mr-2"/> 페이지 회전
                        </Button>
                    </div>
                )}
                
                {(selectionType !== 'page') && (
                    <>
                        <InspectorAccordion title="레이아웃" isOpen={openAccordions.has('transform')} onToggle={() => toggleAccordion('transform')}>
                            <div className="grid grid-cols-2 gap-2">
                                <div><Label htmlFor="inp-x" className="text-xs">X</Label><Input type="number" id="inp-x" value={Math.round(selectedLayer?.left ?? 0)} onChange={e => handleLayerUpdate(selectedLayer.id, { left: +e.target.value })} disabled={selectionType === 'background' || !selectedLayer}/></div>
                                <div><Label htmlFor="inp-y" className="text-xs">Y</Label><Input type="number" id="inp-y" value={Math.round(selectedLayer?.top ?? 0)} onChange={e => handleLayerUpdate(selectedLayer.id, { top: +e.target.value })} disabled={selectionType === 'background' || !selectedLayer}/></div>
                                <div><Label htmlFor="inp-w" className="text-xs">W</Label><Input type="number" id="inp-w" value={Math.round(selectedLayer?.width ?? 0)} onChange={e => handleLayerUpdate(selectedLayer.id, { width: +e.target.value })} disabled={selectionType === 'background' || !selectedLayer}/></div>
                                <div><Label htmlFor="inp-h" className="text-xs">H</Label><Input type="number" id="inp-h" value={Math.round(selectedLayer?.height ?? 0)} onChange={e => handleLayerUpdate(selectedLayer.id, { height: +e.target.value })} disabled={selectionType === 'background' || !selectedLayer}/></div>
                            </div>
                            <div className="grid grid-cols-6 gap-1 mt-2">
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('left')} title="왼쪽 정렬" disabled={selectedLayers.length < 2}><ObjectAlignLeftIcon className="w-5 h-5"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('center')} title="가운데 정렬" disabled={selectedLayers.length < 2}><ObjectAlignCenterIcon className="w-5 h-5"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('right')} title="오른쪽 정렬" disabled={selectedLayers.length < 2}><ObjectAlignRightIcon className="w-5 h-5"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('top')} title="위쪽 정렬" disabled={selectedLayers.length < 2}><ObjectAlignTopIcon className="w-5 h-5"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('middle')} title="중간 정렬" disabled={selectedLayers.length < 2}><ObjectAlignMiddleIcon className="w-5 h-5"/></Button>
                                <Button variant="secondary" size="sm" onClick={() => handleAlignment('bottom')} title="아래쪽 정렬" disabled={selectedLayers.length < 2}><ObjectAlignBottomIcon className="w-5 h-5"/></Button>
                            </div>
                        </InspectorAccordion>
                        
                        <InspectorAccordion title="모양" isOpen={openAccordions.has('appearance')} onToggle={() => toggleAccordion('appearance')}>
                            <div className="flex items-center gap-2"><OpacityIcon className="h-4 w-4"/><Input type="range" min="0" max="1" step="0.01" value={selectedLayer?.opacity ?? 1} onChange={e => handleLayerUpdate(selectedLayer.id, { opacity: +e.target.value })} /><Input type="number" min="0" max="1" step="0.1" value={selectedLayer?.opacity ?? 1} onChange={e => handleLayerUpdate(selectedLayer.id, { opacity: +e.target.value })} className="w-16 text-sm" /></div>
                            {selectionType === 'background' && (
                                <div>
                                    <Label className="text-xs">배경 색상</Label>
                                    <ColorPicker value={'#ffffff'} onChange={handleBackgroundColorChange} onActivateEyedropper={() => onActivateEyedropper(handleBackgroundColorChange)} />
                                </div>
                            )}
                            {selectionType === 'shape' && selectedLayer && 'type' in selectedLayer && (
                                <div className="space-y-4">
                                     <div>
                                        <Label className="text-xs">채우기</Label>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Button size="sm" variant={typeof selectedLayer.fill === 'string' ? 'primary' : 'secondary'} className="flex-1" onClick={() => handleLayerUpdate(selectedLayer.id, { fill: typeof selectedLayer.fill === 'object' ? selectedLayer.fill.stops[0].color : '#6366f1' })}>단색</Button>
                                            <Button size="sm" variant={typeof selectedLayer.fill === 'object' ? 'primary' : 'secondary'} className="flex-1" onClick={() => handleLayerUpdate(selectedLayer.id, { fill: { type: 'linear', angle: 90, stops: [{ color: typeof selectedLayer.fill === 'string' ? selectedLayer.fill : '#6366f1', offset: 0 }, { color: '#ffffff', offset: 100 }] } })}>그라데이션</Button>
                                        </div>
                                        {typeof selectedLayer.fill === 'string' ? (
                                            <ColorPicker value={selectedLayer.fill} onChange={color => handleLayerUpdate(selectedLayer.id, { fill: color })} onActivateEyedropper={() => onActivateEyedropper(color => handleLayerUpdate(selectedLayer.id, { fill: color }))} />
                                        ) : (
                                            <div className="space-y-3 p-3 bg-slate-100 rounded-md">
                                                <div>
                                                    <Label className="text-xs">각도</Label>
                                                    <div className="flex items-center gap-2"><Input type="range" min="0" max="360" value={(selectedLayer.fill as Gradient).angle} onChange={e => handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), angle: +e.target.value } })} /><Input type="number" value={(selectedLayer.fill as Gradient).angle} onChange={e => handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), angle: +e.target.value } })} className="w-16"/></div>
                                                </div>
                                                <div className="relative h-8 w-full rounded-md border" style={getFillStyle(selectedLayer.fill)} />
                                                <div>
                                                    <Label className="text-xs">색상 지점</Label>
                                                    {(selectedLayer.fill as Gradient).stops.map((stop, index) => (
                                                        <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-white rounded">
                                                            <ColorPicker value={stop.color} onChange={color => { const newStops = [...(selectedLayer.fill as Gradient).stops]; newStops[index] = { ...stop, color }; handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), stops: newStops } }); }} onActivateEyedropper={() => onActivateEyedropper(color => { const newStops = [...(selectedLayer.fill as Gradient).stops]; newStops[index] = { ...stop, color }; handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), stops: newStops } }); })}/>
                                                            <Input className="w-16" type="number" min="0" max="100" value={stop.offset} onChange={e => { const newStops = [...(selectedLayer.fill as Gradient).stops]; newStops[index] = { ...stop, offset: +e.target.value }; handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), stops: newStops } }); }}/>
                                                            <button onClick={() => { const newStops = (selectedLayer.fill as Gradient).stops.filter((_, i) => i !== index); handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), stops: newStops } }); }} disabled={(selectedLayer.fill as Gradient).stops.length <= 2} className="disabled:text-slate-300"><XCircleIcon className="w-5 h-5"/></button>
                                                        </div>
                                                    ))}
                                                     <Button size="sm" variant="secondary" className="w-full" onClick={() => { const newStops = [...(selectedLayer.fill as Gradient).stops, { color: '#000000', offset: 100 }]; handleLayerUpdate(selectedLayer.id, { fill: { ...(selectedLayer.fill as Gradient), stops: newStops } }); }}><PlusIcon className="w-4 h-4 mr-1"/> 색상 추가</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div><Label className="text-xs">테두리</Label><ColorPicker value={selectedLayer.strokeColor} onChange={color => handleLayerUpdate(selectedLayer.id, { strokeColor: color })} onActivateEyedropper={() => onActivateEyedropper(color => handleLayerUpdate(selectedLayer.id, { strokeColor: color }))} /></div>
                                    <div><Label className="text-xs">테두리 두께</Label><div className="flex items-center gap-2"><Input type="range" min="0" max="50" value={selectedLayer.strokeWidth} onChange={e => handleLayerUpdate(selectedLayer.id, { strokeWidth: +e.target.value })} /><Input type="number" min="0" value={selectedLayer.strokeWidth} onChange={e => handleLayerUpdate(selectedLayer.id, { strokeWidth: +e.target.value })} className="w-16" /></div></div>
                                    {selectedLayer.type === 'rectangle' && <div><Label className="text-xs">모서리 둥글게</Label><div className="flex items-center gap-2"><Input type="range" min="0" max={Math.min(selectedLayer.width, selectedLayer.height) / 2} value={selectedLayer.borderRadius || 0} onChange={e => handleLayerUpdate(selectedLayer.id, { borderRadius: +e.target.value })} /><Input type="number" min="0" value={selectedLayer.borderRadius || 0} onChange={e => handleLayerUpdate(selectedLayer.id, { borderRadius: +e.target.value })} className="w-16" /></div></div>}
                                </div>
                            )}
                        </InspectorAccordion>

                        {selectionType === 'text' && selectedLayer && 'content' in selectedLayer && (
                            <>
                                <InspectorAccordion title="텍스트" isOpen={openAccordions.has('text')} onToggle={() => toggleAccordion('text')}>
                                    <Select value={selectedLayer.fontFamily} onChange={e => handleLayerUpdate(selectedLayer.id, { fontFamily: e.target.value })} className="flex-grow">
                                        {KOREAN_FONTS_LIST.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">크기</Label><Input type="number" value={Math.round(selectedLayer.fontSize)} onChange={e => handleLayerUpdate(selectedLayer.id, { fontSize: +e.target.value })} /></div>
                                        <div><Label className="text-xs">색상</Label><ColorPicker value={selectedLayer.color} onChange={color => handleLayerUpdate(selectedLayer.id, { color })} onActivateEyedropper={() => onActivateEyedropper(color => handleLayerUpdate(selectedLayer.id, { color }))} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">굵기</Label><Input type="number" step="100" min="100" max="900" value={selectedLayer.fontWeight} onChange={e => handleLayerUpdate(selectedLayer.id, { fontWeight: parseInt(e.target.value, 10) || 400 })} /></div>
                                        <div className="flex items-end gap-1">
                                            <Button size="sm" variant={selectedLayer.fontWeight >= 700 ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { fontWeight: selectedLayer.fontWeight >= 700 ? 400: 700 })}><BoldIcon className="h-4 w-4"/></Button>
                                            <Button size="sm" variant={selectedLayer.fontStyle === 'italic' ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal': 'italic' })}><ItalicIcon className="h-4 w-4"/></Button>
                                            <Button size="sm" variant={selectedLayer.textDecoration === 'underline' ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { textDecoration: selectedLayer.textDecoration === 'underline' ? 'none': 'underline' })}><UnderlineIcon className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">자간</Label><Input type="number" value={selectedLayer.letterSpacing || 0} onChange={e => handleLayerUpdate(selectedLayer.id, { letterSpacing: +e.target.value })} /></div>
                                        <div><Label className="text-xs">행간</Label><Input type="number" step="0.1" value={selectedLayer.lineHeight || 1.2} onChange={e => handleLayerUpdate(selectedLayer.id, { lineHeight: +e.target.value })} /></div>
                                    </div>
                                    <div><Label className="text-xs">정렬</Label><div className="grid grid-cols-3 gap-1">
                                        <Button size="sm" variant={selectedLayer.textAlign === 'left' ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { textAlign: 'left' })}><AlignLeftIcon className="h-4 w-4" /></Button>
                                        <Button size="sm" variant={selectedLayer.textAlign === 'center' ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { textAlign: 'center' })}><AlignCenterIcon className="h-4 w-4" /></Button>
                                        <Button size="sm" variant={selectedLayer.textAlign === 'right' ? 'primary' : 'secondary'} onClick={() => handleLayerUpdate(selectedLayer.id, { textAlign: 'right' })}><AlignRightIcon className="h-4 w-4" /></Button>
                                    </div></div>
                                </InspectorAccordion>

                                <InspectorAccordion title="텍스트 효과" isOpen={openAccordions.has('effects')} onToggle={() => toggleAccordion('effects')}>
                                    <div className="grid grid-cols-3 gap-2">{effectPresets.map(preset => (<button key={preset.type} onClick={() => handleLayerUpdate(selectedLayer.id, { effect: defaultEffects[preset.type] })} className={`p-2 text-xs text-center border-2 rounded-md ${selectedLayer.effect?.type === preset.type ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}><div className="h-10 w-full bg-slate-200 flex items-center justify-center rounded mb-1 font-bold text-lg" style={getEffectStyles(defaultEffects[preset.type])}>Ag</div>{preset.label}</button>))}</div>
                                    <div className="mt-4 space-y-3 pt-3 border-t">
                                        {renderEffectControls()}
                                    </div>
                                </InspectorAccordion>
                            </>
                        )}
                    </>
                )}
                
                <InspectorAccordion title="AI 어시스턴트" isOpen={openAccordions.has('ai')} onToggle={() => toggleAccordion('ai')}>
                   {selectionType === 'text' && selectedLayer && (
                        <div className='space-y-3'>
                            <Button onClick={() => onExecuteAiAction({type: 'suggestFont', layerId: selectedLayer.id})} disabled={!!isProcessingAiAction} className="w-full justify-start" variant='secondary'>
                                {isProcessingAiAction === `suggestFont-${selectedLayer.id}` ? <SpinnerIcon className="animate-spin h-4 w-4 mr-2"/> : <SparklesIcon className="h-4 w-4 mr-2"/>} AI 글꼴 추천
                            </Button>
                            <div>
                                <Textarea placeholder='예: 더 친근하게 바꿔줘' rows={2} value={aiTextPrompt} onChange={e => setAiTextPrompt(e.target.value)} />
                                <Button onClick={() => onExecuteAiAction({type: 'refineText', layerId: selectedLayer.id, prompt: aiTextPrompt})} disabled={!!isProcessingAiAction || !aiTextPrompt} size='sm' className="w-full mt-1">
                                    {isProcessingAiAction === `refineText-${selectedLayer.id}` ? <SpinnerIcon className="animate-spin h-4 w-4 mr-2"/> : <MagicWandIcon className="h-4 w-4 mr-2"/>} 텍스트 수정
                                </Button>
                            </div>
                        </div>
                   )}
                   {selectionType === 'image' && selectedLayer && (
                        <div className='grid grid-cols-2 gap-2'>
                            <Button onClick={() => onExecuteAiAction({type: 'removeBackground', layerId: selectedLayer.id})} disabled={!!isProcessingAiAction} variant='secondary' size='sm'>배경 제거</Button>
                            <Button onClick={() => onExecuteAiAction({type: 'smartCrop', layerId: selectedLayer.id})} disabled={!!isProcessingAiAction} variant='secondary' size='sm'>스마트 자르기</Button>
                            <Button onClick={() => onExecuteAiAction({type: 'generateAltText', layerId: selectedLayer.id})} disabled={!!isProcessingAiAction} variant='secondary' size='sm'>대체 텍스트 생성</Button>
                            <Button onClick={() => onExecuteAiAction({type: 'extractColors', layerId: selectedLayer.id})} disabled={!!isProcessingAiAction} variant='secondary' size='sm'>색상 추출</Button>
                        </div>
                   )}
                   {(selectionType === 'page' || selectionType === 'background') && (
                        <div>
                            <Textarea placeholder='예: 전체적으로 더 따뜻하게' rows={3} value={aiPagePrompt} onChange={e => setAiPagePrompt(e.target.value)} />
                            <Button onClick={() => onExecuteAiAction({type: 'refinePage', prompt: aiPagePrompt})} disabled={!!isProcessingAiAction || !aiPagePrompt} className="w-full mt-1">
                                {isProcessingAiAction === `refinePage-page` ? <SpinnerIcon className="animate-spin h-5 w-5 mr-2"/> : <SparklesIcon className="h-5 w-5 mr-2"/>} 페이지 전체 수정
                            </Button>
                        </div>
                   )}
                </InspectorAccordion>
            </div>

            <div className="p-3 border-t mt-auto bg-slate-100">
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleLayerOrderChange('front')} title="맨 앞으로" disabled={selectedLayers.length === 0}><BringForwardIcon className="w-5 h-5"/></Button>
                    <Button variant="secondary" size="sm" onClick={() => handleLayerOrderChange('backward')} title="뒤로" disabled={selectedLayers.length === 0}><SendBackwardIcon className="w-5 h-5"/></Button>
                    <Button variant="secondary" size="sm" onClick={deleteSelectedLayers} title="삭제" disabled={selectedLayers.length === 0} className="!text-red-600 hover:!bg-red-50"><TrashIcon className="w-5 h-5"/></Button>
                </div>
            </div>
        </div>
    );
};