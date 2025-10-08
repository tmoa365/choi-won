import React from 'react';
import { SelectionCursorIcon, TypeIcon, SquareIcon, MagicWandIcon, EyedropperIcon, SparklesIcon } from '../components/icons';

export type Tool = 'select' | 'text' | 'rectangle' | 'ai-generate' | 'eyedropper' | 'magic-wand';

interface ToolbarProps {
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
}

const tools: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <SelectionCursorIcon className="w-6 h-6" />, label: '선택 도구', shortcut: 'V' },
    { id: 'text', icon: <TypeIcon className="w-6 h-6" />, label: '텍스트 도구', shortcut: 'T' },
    { id: 'rectangle', icon: <SquareIcon className="w-6 h-6" />, label: '사각형 도구', shortcut: 'R' },
    { id: 'ai-generate', icon: <SparklesIcon className="w-6 h-6" />, label: 'AI 영역 생성', shortcut: 'G' },
    { id: 'magic-wand', icon: <MagicWandIcon className="w-6 h-6" />, label: 'AI 매직 완드', shortcut: 'M' },
    { id: 'eyedropper', icon: <EyedropperIcon className="w-6 h-6" />, label: '스포이드', shortcut: 'I' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool }) => {
    return (
        <div className="w-16 bg-slate-50 p-2 flex flex-col items-center gap-2 border-r border-slate-200 flex-shrink-0">
            {tools.map(tool => (
                <button 
                    key={tool.id} 
                    onClick={() => setActiveTool(tool.id)}
                    className={`w-full flex flex-col items-center p-2 rounded-lg transition-colors relative group ${activeTool === tool.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                    title={`${tool.label} (${tool.shortcut})`}
                >
                    {tool.icon}
                </button>
            ))}
        </div>
    );
};