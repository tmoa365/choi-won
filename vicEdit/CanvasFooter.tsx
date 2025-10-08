import React from 'react';
import { Button } from '../components/ui';
import { RulerIcon } from '../components/icons';

interface CanvasFooterProps {
    zoom: number;
    setZoom: (zoom: number) => void;
    fitToScreen: () => void;
    showRulers: boolean;
    setShowRulers: (show: boolean) => void;
}

export const CanvasFooter: React.FC<CanvasFooterProps> = ({ zoom, setZoom, fitToScreen, showRulers, setShowRulers }) => {
    
    const zoomIn = () => setZoom(Math.min(zoom + 0.25, 4));
    const zoomOut = () => setZoom(Math.max(zoom - 0.25, 0.25));

    return (
        <div className="flex-shrink-0 bg-white p-2 flex items-center justify-center gap-4 border-t border-slate-200">
             <Button onClick={() => setShowRulers(!showRulers)} variant="secondary" size="sm" title="눈금자 표시/숨기기" className={showRulers ? '!bg-indigo-100 text-indigo-700' : ''}>
                <RulerIcon className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
                <Button onClick={zoomOut} variant="secondary" size="sm">-</Button>
                <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-32"
                />
                 <Button onClick={zoomIn} variant="secondary" size="sm">+</Button>
            </div>
            <div className="w-20">
                <Button onClick={fitToScreen} variant="secondary" size="sm" className="w-full">{Math.round(zoom * 100)}%</Button>
            </div>
        </div>
    );
};