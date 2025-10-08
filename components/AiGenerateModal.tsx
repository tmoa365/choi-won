import React, { useState } from 'react';
import { Modal, Button, Textarea } from './ui';
import { SparklesIcon, SpinnerIcon } from './icons';

interface AiGenerateModalProps {
    onClose: () => void;
    onGenerate: (prompt: string) => Promise<void>;
}

export const AiGenerateModal: React.FC<AiGenerateModalProps> = ({ onClose, onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            await onGenerate(prompt);
        } catch(e) {
            // Error is handled by the parent component, but we should stop spinning
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal title="AI로 요소 생성" onClose={onClose} size="lg">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    선택된 영역에 생성할 이미지에 대해 설명해주세요.
                </p>
                <div>
                    <Textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="예: 선글라스를 낀 골든 리트리버"
                        rows={3}
                        disabled={isGenerating}
                        onKeyDown={(e) => {if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()}}
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={isGenerating}>취소</Button>
                    <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
                        {isGenerating ? <SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> : <SparklesIcon className="h-5 w-5 mr-2" />}
                        생성
                    </Button>
                </div>
            </div>
        </Modal>
    );
};