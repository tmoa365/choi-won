import React, { useState } from 'react';
import { Modal, Button, Input, Label } from './ui';
import { SparklesIcon } from './icons';

interface CustomSizeModalProps {
    onClose: () => void;
    onCreate: (dimensions: { width_mm: number, height_mm: number }) => void;
}

export const CustomSizeModal: React.FC<CustomSizeModalProps> = ({ onClose, onCreate }) => {
    const [width, setWidth] = useState(420);
    const [height, setHeight] = useState(297);

    const handleCreate = () => {
        if (width > 0 && height > 0) {
            onCreate({ width_mm: width, height_mm: height });
        }
    };

    return (
        <Modal title="사용자 정의 크기" onClose={onClose} size="lg">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    새로 만들 디자인의 너비와 높이를 밀리미터(mm) 단위로 입력하세요.
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="custom-width">너비 (mm)</Label>
                        <Input
                            id="custom-width"
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
                            placeholder="예: 420"
                        />
                    </div>
                    <div>
                        <Label htmlFor="custom-height">높이 (mm)</Label>
                        <Input
                            id="custom-height"
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
                            placeholder="예: 297"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>취소</Button>
                    <Button onClick={handleCreate} disabled={!width || !height}>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        디자인 생성
                    </Button>
                </div>
            </div>
        </Modal>
    );
};