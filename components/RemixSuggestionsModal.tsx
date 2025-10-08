import React from 'react';
import { DesignPage, AllLayer } from '../types';
import { Modal, Button } from './ui';
import { getFillStyle, getEffectStyles } from '../vicEdit/utils';
import { KOREAN_FONTS_MAP } from './fonts';

interface RemixSuggestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: Partial<DesignPage>[];
    originalPage: DesignPage;
    assetUrlMap: Map<string, string>;
    onSelect: (suggestion: Partial<DesignPage>) => void;
}

const SuggestionPreview: React.FC<{
    suggestion: Partial<DesignPage>;
    originalPage: DesignPage;
    assetUrlMap: Map<string, string>;
    onSelect: () => void;
}> = ({ suggestion, originalPage, assetUrlMap, onSelect }) => {
    const width = originalPage.width_mm ? originalPage.width_mm : 420;
    const height = originalPage.height_mm ? originalPage.height_mm : 594;

    const allLayers = [
        ...(suggestion.shapeLayers || []),
        ...(suggestion.imageLayers || []),
        ...(suggestion.textLayers || []),
    ];

    return (
        <div className="border bg-slate-50 rounded-lg flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
            <div className="aspect-video bg-white overflow-hidden rounded-t-lg border-b relative">
                <div 
                    className="relative w-full h-full transform origin-top-left" 
                    style={{ transform: `scale(${200 / width})` }} // Simple scaling for preview
                >
                    <img src={`data:image/png;base64,${originalPage.base64}`} className="absolute w-full h-full object-cover" style={{ width, height }} />
                    {allLayers.map(layer => {
                        const style: React.CSSProperties = {
                            position: 'absolute',
                            top: `${layer.top}px`, left: `${layer.left}px`,
                            width: `${layer.width}px`, height: `${layer.height}px`,
                            transform: `rotate(${layer.rotation}deg)`,
                            opacity: layer.opacity,
                            boxSizing: 'border-box'
                        };

                        if ('content' in layer) {
                             Object.assign(style, {
                                fontSize: `${layer.fontSize}px`,
                                color: layer.color,
                                fontFamily: KOREAN_FONTS_MAP[layer.fontFamily],
                                fontWeight: layer.fontWeight,
                                textAlign: layer.textAlign,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                ...getEffectStyles(layer.effect)
                            });
                            return <div key={layer.id} style={style}>{layer.content}</div>;
                        } else if ('assetId' in layer) {
                            const imageUrl = assetUrlMap.get(layer.assetId);
                            return <img key={layer.id} src={imageUrl} style={style} className="object-contain" />;
                        } else {
                            Object.assign(style, {
                                ...getFillStyle(layer.fill),
                                border: layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.strokeColor}` : 'none',
                                borderRadius: layer.borderRadius ? `${layer.borderRadius}px` : (layer.type === 'circle' ? '50%' : '0'),
                            });
                             return <div key={layer.id} style={style}></div>;
                        }
                    })}
                </div>
            </div>
            <div className="p-2 text-center">
                 <Button size="sm" variant="secondary">이 버전 적용</Button>
            </div>
        </div>
    );
};

export const RemixSuggestionsModal: React.FC<RemixSuggestionsModalProps> = ({ isOpen, onClose, suggestions, originalPage, assetUrlMap, onSelect }) => {
    if (!isOpen) return null;

    return (
        <Modal title="AI 리믹스 제안" onClose={onClose} size="4xl">
            <p className="text-sm text-slate-600 mb-4">
                AI가 현재 페이지의 콘텐츠를 유지하면서 3가지 새로운 레이아웃을 제안합니다. 마음에 드는 버전을 선택하여 적용하세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {suggestions.map((suggestion, index) => (
                    <SuggestionPreview
                        key={index}
                        suggestion={suggestion}
                        originalPage={originalPage}
                        assetUrlMap={assetUrlMap}
                        onSelect={() => onSelect(suggestion)}
                    />
                ))}
            </div>
        </Modal>
    );
};