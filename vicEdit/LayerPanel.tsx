import React, { useState } from 'react';
import { AllLayer } from '../types';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, LockOpenIcon, SquareIcon, CircleIcon, LineIcon, TypeIcon, PhotoIcon, LayersIcon } from '../components/icons';

interface LayerPanelProps {
    layers: AllLayer[];
    selectedLayerIds: string[];
    onSelectLayer: (ids: string[] | ((prev: string[]) => string[])) => void;
    onLayerUpdate: (id: string, updates: Partial<AllLayer>) => void;
}

const LayerIcon: React.FC<{ layer: AllLayer }> = ({ layer }) => {
    if ('content' in layer) return <TypeIcon className="w-4 h-4 text-slate-500" />;
    if ('assetId' in layer) return <PhotoIcon className="w-4 h-4 text-slate-500" />;
    if ('type' in layer) {
        switch (layer.type) {
            case 'rectangle': return <SquareIcon className="w-4 h-4 text-slate-500" />;
            case 'circle': return <CircleIcon className="w-4 h-4 text-slate-500" />;
            case 'line': return <LineIcon className="w-4 h-4 text-slate-500" />;
        }
    }
    return <SquareIcon className="w-4 h-4 text-slate-500" />;
};

const getLayerName = (layer: AllLayer): string => {
    if (layer.name) return layer.name;
    if (layer.id === 'background') return '배경';
    if ('content' in layer) return layer.content.substring(0, 20) || '빈 텍스트';
    if ('assetId' in layer) return layer.assetId.includes('logo') ? '로고' : '이미지';
    if ('type' in layer) {
         switch (layer.type) {
            case 'rectangle': return '사각형';
            case 'circle': return '원';
            case 'line': return '선';
        }
    }
    return '요소';
}


export const LayerPanel: React.FC<LayerPanelProps> = ({ layers, selectedLayerIds, onSelectLayer, onLayerUpdate }) => {
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    
    // Render layers in reverse order so the top-most layer is at the top of the list
    const reversedLayers = [...layers].reverse();
    
    const handleLayerClick = (e: React.MouseEvent, id: string) => {
        // Per user request, only allow single selection in the layer panel.
        // Multi-select via Shift+Click on canvas is still available for grouping.
        onSelectLayer([id]);
    };
    
    const handleNameDoubleClick = (layer: AllLayer) => {
        if (layer.id === 'background') return;
        setEditingLayerId(layer.id);
        setEditingName(getLayerName(layer));
    };

    const handleNameChangeCommit = () => {
        if (editingLayerId) {
            onLayerUpdate(editingLayerId, { name: editingName });
        }
        setEditingLayerId(null);
        setEditingName('');
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-white">
            <div className="p-2 sticky top-0 bg-white border-b border-slate-200 z-10">
                <h3 className="font-bold text-sm text-slate-800">레이어</h3>
            </div>
            <div className="flex flex-col">
                {reversedLayers.map(layer => (
                    <div
                        key={layer.id}
                        onClick={(e) => handleLayerClick(e, layer.id)}
                        className={`relative flex items-center gap-2 p-2 cursor-pointer border-r-4 ${
                            selectedLayerIds.includes(layer.id) ? 'bg-indigo-100 border-indigo-600' : 'hover:bg-slate-100 border-transparent'
                        }`}
                        style={{ paddingLeft: layer.groupId ? '1.75rem' : '0.5rem' }}
                    >
                        {layer.groupId && <LayersIcon className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2"/>}
                        <LayerIcon layer={layer} />
                        {editingLayerId === layer.id ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleNameChangeCommit}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameChangeCommit()}
                                className="text-sm p-0 m-0 border border-indigo-400 rounded flex-grow"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span 
                                onDoubleClick={() => handleNameDoubleClick(layer)} 
                                className="text-sm truncate flex-grow" 
                                title={getLayerName(layer)}
                            >
                                {getLayerName(layer)}
                            </span>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onLayerUpdate(layer.id, { isLocked: !layer.isLocked });
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title={layer.isLocked ? "레이어 잠금 해제" : "레이어 잠금"}
                        >
                            {layer.isLocked ? <LockClosedIcon className="w-4 h-4" /> : <LockOpenIcon className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onLayerUpdate(layer.id, { isVisible: !(layer.isVisible ?? true) });
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                             title={(layer.isVisible ?? true) ? "레이어 숨기기" : "레이어 보이기"}
                        >
                            {(layer.isVisible ?? true) ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};