import React, { useState } from 'react';
import { ImageAsset } from '../types';
import { removeBackgroundImage, extractCleanBackground } from '../services';
import { Modal, Button } from './ui';
import { MagicWandIcon, SpinnerIcon } from './icons';
import { dataURLtoFile, getApiErrorMessage } from '../vicEdit/utils';

interface PostUploadActionModalProps {
    assets: ImageAsset[];
    onClose: () => void;
    onUpdate: (assetId: string, updatedFile: File) => void;
    setError: (error: string | null) => void;
}

type AiAction = 'remove' | 'extract';

export const PostUploadActionModal: React.FC<PostUploadActionModalProps> = ({ assets, onClose, onUpdate, setError }) => {
    const [processingAction, setProcessingAction] = useState<AiAction | null>(null);
    const [internalError, setInternalError] = useState<string | null>(null);
    const isProcessing = processingAction !== null;

    const asset = assets[0];
    if (!asset) return null;

    const handleAiAction = async (action: AiAction) => {
        setProcessingAction(action);
        setError(null);
        setInternalError(null);
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

                    if (action === 'remove') {
                        newBase64 = await removeBackgroundImage(base64Data, asset.file.type);
                        newFileNamePrefix = 'bg_removed_';
                        friendlyActionName = '배경 제거';
                    } else { // 'extract'
                        newBase64 = await extractCleanBackground(base64Data, asset.file.type);
                        newFileNamePrefix = 'bg_only_';
                        friendlyActionName = '배경만 남기기';
                    }

                    const newFileName = `${newFileNamePrefix}${asset.file.name.replace(/\.[^/.]+$/, "")}.png`;
                    const newFile = dataURLtoFile(`data:image/png;base64,${newBase64}`, newFileName);
                    onUpdate(asset.id, newFile);

                } catch (e) {
                    console.error('Error processing image in modal:', e);
                    const errorMessage = getApiErrorMessage(e, `AI ${action === 'remove' ? '배경 제거' : '배경만 남기기'}`);
                    setInternalError(errorMessage);
                } finally {
                    setProcessingAction(null);
                }
            };
            reader.onerror = () => {
                 const errorMsg = '이미지 파일을 읽는 데 실패했습니다.';
                 setInternalError(errorMsg);
                 setProcessingAction(null);
            }
        } catch (e) {
            console.error('Error setting up file reader:', e);
            const errorMsg = '이미지 처리 중 예기치 않은 오류가 발생했습니다.';
            setInternalError(errorMsg);
            setProcessingAction(null);
        }
    };

    return (
        <Modal title={`AI 추천 기능 (${assets.length}개 중 1번째)`} onClose={onClose} size="2xl">
            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="md:w-1/2 flex-shrink-0">
                    <img src={asset.previewUrl} alt="Preview" className="w-full h-auto object-contain rounded-md shadow-md" />
                </div>
                <div className="md:w-1/2 space-y-4 text-center md:text-left">
                    {internalError ? (
                        <div>
                            <h4 className="text-lg font-bold text-red-600">오류가 발생했습니다</h4>
                            <p className="text-sm text-red-500 mt-2">{internalError}</p>
                             <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
                                <Button onClick={onClose} variant="secondary">닫기</Button>
                                <Button onClick={() => handleAiAction(processingAction || 'remove')} disabled={isProcessing}>
                                    {isProcessing ? <SpinnerIcon className="animate-spin h-5 w-5" /> : '다시 시도'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h4 className="text-lg font-bold text-slate-800">업로드하신 이미지로 무엇을 할까요?</h4>
                            <p className="text-sm text-slate-600">
                                AI를 사용하여 이미지 배경을 제거하거나, 배경만 남겨 새로운 디자인의 바탕으로 활용할 수 있습니다.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                <Button onClick={() => handleAiAction('remove')} disabled={isProcessing}>
                                    {processingAction === 'remove' ? (
                                        <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 처리 중...</>
                                    ) : (
                                        <><MagicWandIcon className="h-5 w-5 mr-2" /> 배경 제거</>
                                    )}
                                </Button>
                                <Button onClick={() => handleAiAction('extract')} disabled={isProcessing}>
                                    {processingAction === 'extract' ? (
                                        <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 처리 중...</>
                                    ) : (
                                        <><MagicWandIcon className="h-5 w-5 mr-2" /> 배경만 남기기</>
                                    )}
                                </Button>
                            </div>
                            <Button onClick={onClose} variant="secondary" disabled={isProcessing} className="w-full mt-2">
                                건너뛰기
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};