import React, { useState } from 'react';
import { ImageAsset } from '../types';
import { removeBackgroundImage } from '../services/geminiService';
import { Button } from './ui';
import { XCircleIcon, MagicWandIcon, SpinnerIcon } from './icons';
import { dataURLtoFile, getApiErrorMessage } from '../vicEdit/utils';

interface AIPhotoEditorModalProps {
    asset: ImageAsset;
    onClose: () => void;
    onUpdate: (updatedFile: File) => void;
    setError: (error: string | null) => void;
}

export const AIPhotoEditorModal: React.FC<AIPhotoEditorModalProps> = ({ asset, onClose, onUpdate, setError }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRemoveBackground = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(asset.file);
            reader.onload = async () => {
                try {
                    const base64WithMime = reader.result as string;
                    const base64Data = base64WithMime.split(',')[1];
                    const newBase64 = await removeBackgroundImage(base64Data, asset.file.type);
                    const newFileName = `bg_removed_${asset.file.name.replace(/\.[^/.]+$/, "")}.png`;
                    const newFile = dataURLtoFile(`data:image/png;base64,${newBase64}`, newFileName);
                    onUpdate(newFile);
                } catch (e) {
                    console.error('Error processing image in modal:', e);
                    setError(getApiErrorMessage(e, 'AI 배경 제거'));
                } finally {
                    setIsProcessing(false);
                }
            };
            reader.onerror = () => {
                 setError('이미지 파일을 읽는 데 실패했습니다.');
                 setIsProcessing(false);
            }
        } catch (e) {
            console.error('Error setting up file reader:', e);
            setError('이미지 처리 중 예기치 않은 오류가 발생했습니다.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">AI 사진 편집기</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><XCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto flex items-center justify-center">
                    <img src={asset.previewUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain rounded-md" />
                </div>
                <div className="p-4 border-t flex justify-end gap-4">
                    <Button onClick={onClose} variant="secondary">취소</Button>
                    <Button onClick={handleRemoveBackground} disabled={isProcessing}>
                        {isProcessing ? (
                            <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 처리 중...</>
                        ) : (
                            <><MagicWandIcon className="h-5 w-5 mr-2" /> 배경 제거</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};