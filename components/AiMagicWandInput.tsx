import React, { useState, useRef, useEffect } from 'react';
import { Button, Textarea } from './ui';
import { MagicWandIcon, SpinnerIcon } from './icons';

interface AiMagicWandInputProps {
    x: number;
    y: number;
    onSubmit: (prompt: string) => void;
    onClose: () => void;
    isProcessing: boolean;
    placeholder?: string;
}

export const AiMagicWandInput: React.FC<AiMagicWandInputProps> = ({ x, y, onSubmit, onClose, isProcessing, placeholder }) => {
    const [prompt, setPrompt] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = () => {
        if (prompt.trim()) {
            onSubmit(prompt);
        }
    };

    return (
        <div
            className="absolute z-30 bg-white rounded-lg shadow-2xl border border-slate-200 p-3 w-72"
            style={{ left: x, top: y }}
            onClick={e => e.stopPropagation()}
        >
            <Textarea
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={placeholder || "예: 이 스타일과 어울리게 바꿔줘"}
                rows={2}
                disabled={isProcessing}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <div className="mt-2 flex justify-end">
                <Button onClick={handleSubmit} disabled={isProcessing || !prompt.trim()} size="sm">
                    {isProcessing ? <SpinnerIcon className="animate-spin h-4 w-4 mr-2" /> : <MagicWandIcon className="h-4 w-4 mr-2" />}
                    실행
                </Button>
            </div>
        </div>
    );
};