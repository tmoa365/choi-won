import React, { useMemo } from 'react';

interface RulerProps {
    orientation: 'horizontal' | 'vertical';
    zoom: number;
    scrollPos: number;
    size: number;
    onMouseDown: (e: React.MouseEvent, orientation: 'horizontal' | 'vertical') => void;
}

const RULER_SIZE = 20;
const MAJOR_TICK_INTERVAL = 100;
const MINOR_TICK_INTERVAL = 10;

export const Ruler: React.FC<RulerProps> = ({ orientation, zoom, scrollPos, size, onMouseDown }) => {

    const ticks = useMemo(() => {
        const lines = [];
        const scaledMajorInterval = MAJOR_TICK_INTERVAL * zoom;
        let interval = MAJOR_TICK_INTERVAL;

        if (scaledMajorInterval < 40) interval *= 2;
        if (scaledMajorInterval < 20) interval *= 5;

        const minorInterval = interval / 10;
        
        for (let i = 0; i * minorInterval < size + scrollPos + RULER_SIZE; i++) {
            const pos = i * minorInterval;
            const isMajor = pos % interval === 0;

            if (pos < scrollPos - RULER_SIZE) continue;

            const displayPos = (pos - scrollPos) * zoom;

            if (orientation === 'horizontal') {
                lines.push(
                    <g key={`tick-${i}`}>
                        <line x1={displayPos} y1={isMajor ? 10 : 15} x2={displayPos} y2={RULER_SIZE} stroke="#9ca3af" strokeWidth="1" />
                        {isMajor && <text x={displayPos + 2} y="10" fontSize="10" fill="#6b7280">{pos}</text>}
                    </g>
                );
            } else {
                lines.push(
                     <g key={`tick-${i}`}>
                        <line x1={isMajor ? 10 : 15} y1={displayPos} x2={RULER_SIZE} y2={displayPos} stroke="#9ca3af" strokeWidth="1" />
                        {isMajor && <text x="8" y={displayPos + 10} fontSize="10" fill="#6b7280" style={{writingMode: 'vertical-rl', textOrientation: 'mixed'}}>{pos}</text>}
                    </g>
                );
            }
        }
        return lines;
    }, [zoom, scrollPos, size, orientation]);

    if (orientation === 'horizontal') {
        return (
            <svg width="100%" height={RULER_SIZE} className="absolute top-0 left-0 cursor-col-resize" onMouseDown={(e) => onMouseDown(e, 'vertical')}>
                {ticks}
            </svg>
        );
    }

    return (
         <svg width={RULER_SIZE} height="100%" className="absolute top-0 left-0 cursor-row-resize" onMouseDown={(e) => onMouseDown(e, 'horizontal')}>
            {ticks}
        </svg>
    );
};