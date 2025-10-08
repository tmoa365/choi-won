import React, { useState } from 'react';
import { ImageAsset } from '../types';
import { removeBackgroundImage, cropImageWithAI, extractCleanBackground } from '../services';
import { Button } from './ui';
import { XCircleIcon, MagicWandIcon, SpinnerIcon } from './icons';
import { dataURLtoFile, getApiErrorMessage } from '../vicEdit/utils';

interface AIPhotoEditorModalProps {
    asset: ImageAsset;
    onClose: () => void;
    onUpdate: (updatedFile: File) => void;
    setError: (error: string | null) => void;
}

type AiAction = 'remove' | 'crop' | 'extract';

export const AIPhotoEditorModal: React.FC<AIPhotoEditorModalProps> = ({ asset, onClose, onUpdate, setError }) => {
    const [processingAction, setProcessingAction] = useState<AiAction | null>(null);
    const isProcessing = processingAction !== null;

    const handleAiAction = async (action: AiAction) => {
        setProcessingAction(action);
        setError(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(asset.file);
            reader.onload = async () => {
                try {
                    const base64WithMime = reader.result as string;
                    const base64Data = base64WithMime.split(',')[1];
                    let newBase64: string;
                    let newFileNamePrefix: string;
                    let friendlyActionName: string;

                    switch (action) {
                        case 'remove':
                            newBase64 = await removeBackgroundImage(base64Data, asset.file.type);
                            newFileNamePrefix = 'bg_removed_';
                            friendlyActionName = '배경 제거';
                            break;
                        case 'crop':
                            newBase64 = await cropImageWithAI(base64Data, asset.file.type);
                            newFileNamePrefix = 'cropped_';
                            friendlyActionName = '스마트 자르기';
                            break;
                        case 'extract':
                            newBase64 = await extractCleanBackground(base64Data, asset.file.type);
                            newFileNamePrefix = 'bg_only_';
                            friendlyActionName = '배경만 남기기';
                            break;
                    }

                    const newFileName = `${newFileNamePrefix}${asset.file.name.replace(/\.[^/.]+$/, "")}.png`;
                    const newFile = dataURLtoFile(`data:image/png;base64,${newBase64}`, newFileName);
                    onUpdate(newFile);

                } catch (e) {
                    console.error(`Error processing image with action '${action}':`, e);
                    const actionName = action === 'remove' ? '배경 제거' : action === 'crop' ? '스마트 자르기' : '배경 추출';
                    setError(getApiErrorMessage(e, `AI ${actionName}`));
                } finally {
                    setProcessingAction(null);
                }
            };
            reader.onerror = () => {
                 setError('이미지 파일을 읽는 데 실패했습니다.');
                 setProcessingAction(null);
            }
        } catch (e) {
            console.error('Error setting up file reader:', e);
            setError('이미지 처리 중 예기치 않은 오류가 발생했습니다.');
            setProcessingAction(null);
        }
    };

    const actionButtons: { action: AiAction; label: string; }[] = [
        { action: 'remove', label: '배경 제거' },
        { action: 'crop', label: '스마트 자르기' },
        { action: 'extract', label: '배경만 남기기' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">AI 사진 편집기</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800" disabled={isProcessing}><XCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto flex flex-col md:flex-row items-center justify-center gap-6">
                    <div className="md:w-2/3 flex items-center justify-center bg-slate-100 rounded-lg p-4 h-full">
                        <img src={asset.previewUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain rounded-md" />
                    </div>
                    <div className="md:w-1/3 space-y-4">
                         <h4 className="font-bold text-slate-800">편집 기능</h4>
                         <p className="text-sm text-slate-600">
                            원하는 AI 편집 기능을 선택하여 이미지를 변환하세요.
                         </p>
                         <div className="flex flex-col gap-3 pt-4">
                            {actionButtons.map(({ action, label }) => (
                                <Button key={action} onClick={() => handleAiAction(action)} disabled={isProcessing} className="w-full">
                                    {processingAction === action ? (
                                        <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 처리 중...</>
                                    ) : (
                                        <><MagicWandIcon className="h-5 w-5 mr-2" /> {label}</>
                                    )}
                                </Button>
                            ))}
                         </div>
                    </div>
                </div>
                 <div className="p-4 border-t flex justify-end">
                    <Button onClick={onClose} variant="secondary" disabled={isProcessing}>닫기</Button>
                </div>
            </div>
        </div>
    );
};