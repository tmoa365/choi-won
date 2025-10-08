import React, { MouseEvent } from 'react';
import { TextLayer, ImageLayer, ShapeLayer } from '../types';
import { KOREAN_FONTS_MAP } from '../components/fonts';
import { getEffectStyles, getFillStyle } from './utils';
import { SpinnerIcon, ArrowsPointingOutIcon } from '../components/icons';

type Layer = TextLayer | ImageLayer | ShapeLayer;
type InteractionType = 'move' | 'resize' | 'rotate';
type Handle = 'tl' | 'tr' | 'bl' | 'br';

interface LayerComponentProps {
    layer: Layer;
    isSelected: boolean;
    isMultiSelecting: boolean;
    editingLayerId: string | null;
    interaction: { type: InteractionType } | null;
    assetUrlMap: Map<string, string>;
    processingAiActionLayerId: string | null;
    onLayerMouseDown: (e: MouseEvent) => void;
    onControlMouseDown: (e: MouseEvent, type: 'resize' | 'rotate', handle?: Handle) => void;
    onDoubleClick: () => void;
    onTextChange: (newContent: string) => void;
    onTextBlur: () => void;
    onContextMenu: (e: MouseEvent) => void;
    onAiExpand?: (layerId: string, event: MouseEvent) => void;
}

export const LayerComponent: React.FC<LayerComponentProps> = ({
    layer, isSelected, isMultiSelecting, editingLayerId, interaction, assetUrlMap, processingAiActionLayerId,
    onLayerMouseDown, onControlMouseDown, onDoubleClick, onTextChange, onTextBlur, onContextMenu, onAiExpand
}) => {
    
    const handleMouseDown = (e: MouseEvent) => {
        if (layer.isLocked) return;
        onLayerMouseDown(e);
    }
    
    const handleControlMouseDown = (e: MouseEvent, type: 'resize' | 'rotate', handle?: Handle) => {
        if (layer.isLocked) return;
        onControlMouseDown(e, type, handle);
    }

    const layerStyle: React.CSSProperties = {
        position: 'absolute', top: `${layer.top}px`, left: `${layer.left}px`,
        width: `${layer.width}px`, height: `${layer.height}px`,
        transform: `rotate(${layer.rotation}deg)`, opacity: layer.opacity,
        cursor: layer.isLocked ? 'not-allowed' : (interaction?.type === 'move' ? 'grabbing' : 'grab'),
    };

    let content;
    if ('content' in layer) { // TextLayer
        const textStyle: React.CSSProperties = {
            fontSize: `${layer.fontSize}px`, 
            lineHeight: layer.lineHeight || 1.2,
            letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : 'normal',
            fontWeight: layer.fontWeight, 
            fontStyle: layer.fontStyle, 
            textDecoration: layer.textDecoration,
            color: layer.color, textAlign: layer.textAlign, 
            fontFamily: KOREAN_FONTS_MAP[layer.fontFamily] || 'sans-serif',
            cursor: editingLayerId === layer.id ? 'text' : 'inherit',
            ...getEffectStyles(layer.effect)
        };
        
        if (editingLayerId === layer.id) {
            content = <textarea 
                value={layer.content} 
                onChange={(e) => onTextChange(e.target.value)} 
                onBlur={onTextBlur}
                className="p-0 resize-none m-0 bg-transparent w-full h-full border-2 border-blue-500 focus:outline-none"
                style={{...textStyle, caretColor: 'black'}}
                autoFocus
            />;
        } else {
            content = <div className="p-0 w-full h-full" style={textStyle}>{layer.content}</div>;
        }
    } else if ('assetId' in layer) { // ImageLayer
        const imageUrl = assetUrlMap.get(layer.assetId);
        content = imageUrl 
            ? <img src={imageUrl} alt={layer.alt || "asset"} className="w-full h-full object-contain" draggable="false" /> 
            : <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500 text-sm">이미지 없음</div>;
    } else { // ShapeLayer
        const isLine = layer.type === 'line';
        const fillStyle = getFillStyle(layer.fill);
        content = <div className="w-full h-full" style={{
            ...fillStyle,
            borderTop: isLine && layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.strokeColor}` : 'none',
            border: !isLine && layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.strokeColor}` : 'none',
            borderRadius: layer.borderRadius ? `${layer.borderRadius}px` : (layer.type === 'circle' ? '50%' : '0px'),
        }} />;
    }

    const resizeHandles: Handle[] = ['tl', 'tr', 'bl', 'br'];

    return (
        <div 
            id={`layer-${layer.id}`} 
            className={`absolute ${isSelected && !isMultiSelecting ? 'outline outline-2 outline-blue-500' : ''}`} 
            style={layerStyle}
            onMouseDown={handleMouseDown} 
            onClick={(e) => e.stopPropagation()} 
            onDoubleClick={() => !layer.isLocked && onDoubleClick()}
            onContextMenu={onContextMenu}
        >
            <div className="w-full h-full relative">{content}</div>
             {processingAiActionLayerId?.endsWith(layer.id) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                    <SpinnerIcon className="w-8 h-8 text-white animate-spin" />
                </div>
            )}
            {isSelected && !isMultiSelecting && !layer.isLocked && (
                <>
                    {resizeHandles.map(handle => (
                        <div key={handle} className="absolute w-3 h-3 bg-white border border-blue-500 rounded-full z-10" style={{
                            top: handle.includes('t') ? '-6px' : 'auto', bottom: handle.includes('b') ? '-6px' : 'auto',
                            left: handle.includes('l') ? '-6px' : 'auto', right: handle.includes('r') ? '-6px' : 'auto',
                            cursor: `${handle.includes('t') ? 'n' : 's'}${handle.includes('l') ? 'w' : 'e'}-resize`
                        }} onMouseDown={(e) => handleControlMouseDown(e, 'resize', handle)} />
                    ))}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-alias" 
                         onMouseDown={(e) => handleControlMouseDown(e, 'rotate')} />
                    
                    {'assetId' in layer && onAiExpand && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAiExpand(layer.id, e); }}
                            className="absolute -bottom-2 -right-2 translate-x-1/2 translate-y-1/2 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg hover:bg-indigo-700 z-20"
                            title="AI로 확장"
                        >
                            <ArrowsPointingOutIcon className="w-4 h-4" />
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
