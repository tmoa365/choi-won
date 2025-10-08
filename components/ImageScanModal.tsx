import React, { useState } from 'react';
import { ImageAsset, DesignType } from '../types';
import { Modal, Button, Select, Label } from './ui';
import { SparklesIcon, SpinnerIcon } from './icons';

interface ImageScanModalProps {
    asset: ImageAsset;
    onClose: () => void;
    onScan: (asset: ImageAsset, designType: DesignType) => Promise<void>;
    setError: (error: string | null) => void;
}

export const ImageScanModal: React.FC<ImageScanModalProps> = ({ asset, onClose, onScan, setError }) => {
    const [designType, setDesignType] = useState<DesignType>(DesignType.AutoDetect);
    const [isScanning, setIsScanning] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    const handleScan = async () => {
        setIsScanning(true);
        setInternalError(null);
        setError(null);
        try {
            await onScan(asset, designType);
            // Parent will close modal on success
        } catch (err) {
            setInternalError(err instanceof Error ? err.message : '스캔 중 오류가 발생했습니다.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <Modal title="AI 이미지 스캔" onClose={onClose} size="2xl">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-700 mb-2">분석할 이미지:</p>
                    <img src={asset.previewUrl} alt="Scanned content preview" className="w-full h-auto object-contain rounded-md shadow-md bg-slate-100" />
                </div>
                <div className="md:w-1/2 space-y-4 flex flex-col">
                    <h4 className="text-lg font-bold text-slate-800">이미지를 분석하여 디자인을 시작합니다.</h4>
                    <p className="text-sm text-slate-600 flex-grow">
                        AI가 이미지의 콘텐츠(텍스트, 이미지, 도형 등)를 분석하여 편집 가능한 디자인으로 변환합니다.
                        'AI 자동 감지'를 선택하면 AI가 디자인 종류를 스스로 파악합니다. 아니면 만들고 싶은 종류를 직접 선택할 수도 있습니다.
                    </p>
                    <div>
                        <Label htmlFor="design-type-select">디자인 종류 선택</Label>
                        <Select
                            id="design-type-select"
                            value={designType}
                            onChange={(e) => setDesignType(e.target.value as DesignType)}
                            disabled={isScanning}
                        >
                            {Object.values(DesignType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </Select>
                    </div>
                    {internalError && (
                        <p className="text-sm text-red-600">{internalError}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={onClose} disabled={isScanning}>취소</Button>
                        <Button onClick={handleScan} disabled={isScanning}>
                            {isScanning ? (
                                <><SpinnerIcon className="animate-spin h-5 w-5 mr-2" /> 스캔 중...</>
                            ) : (
                                <><SparklesIcon className="h-5 w-5 mr-2" /> 스캔 시작</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};