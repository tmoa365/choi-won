import React, { useState, useMemo, ChangeEvent } from 'react';
import { DesignPage, TextLayer, DataMapping } from '../types';
import { Button, Label, Select, Textarea } from './ui';
import { XCircleIcon, SparklesIcon } from './icons';

interface DataDrivenModalProps {
    isOpen: boolean;
    onClose: () => void;
    templatePage: DesignPage;
    onGenerate: (data: Record<string, string>[], mapping: DataMapping) => void;
}

const parseCSV = (csvText: string): { headers: string[], rows: Record<string, string>[] } => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const rowObject: Record<string, string> = {};
        headers.forEach((header, index) => {
            rowObject[header] = values[index] || '';
        });
        return rowObject;
    });
    return { headers, rows };
};

export const DataDrivenModal: React.FC<DataDrivenModalProps> = ({ isOpen, onClose, templatePage, onGenerate }) => {
    const [csvData, setCsvData] = useState('');
    const [mapping, setMapping] = useState<DataMapping>({});

    const parsedData = useMemo(() => {
        if (!csvData) return null;
        return parseCSV(csvData);
    }, [csvData]);

    const templateTextLayers = useMemo(() => templatePage.textLayers, [templatePage]);

    const handleMappingChange = (layerId: string, header: string) => {
        setMapping(prev => ({ ...prev, [layerId]: header }));
    };

    const handleGenerateClick = () => {
        if (parsedData && parsedData.rows.length > 0) {
            onGenerate(parsedData.rows, mapping);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">데이터로 대량 제작: {templatePage.type}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><XCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <Label htmlFor="csv-data">1. 데이터 붙여넣기</Label>
                        <Textarea
                            id="csv-data"
                            rows={8}
                            value={csvData}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCsvData(e.target.value)}
                            placeholder="이름,직책,연락처
김민준,디자이너,010-1111-2222
이서연,개발자,010-3333-4444"
                        />
                        <p className="text-xs text-slate-500 mt-1">첫 줄은 제목(헤더)이어야 합니다. 쉼표(,) 또는 탭으로 데이터를 구분해주세요.</p>
                    </div>
                    {parsedData && parsedData.headers.length > 0 && (
                        <div>
                            <Label>2. 데이터 연결하기</Label>
                            <div className="space-y-3 p-4 bg-slate-50 rounded-md border">
                                {templateTextLayers.map(layer => (
                                    <div key={layer.id} className="grid grid-cols-2 items-center gap-4">
                                        <p className="text-sm font-medium truncate" title={layer.content}>
                                            <span className="text-slate-500">템플릿 레이어:</span> "{layer.content}"
                                        </p>
                                        <Select
                                            value={mapping[layer.id] || ''}
                                            onChange={(e) => handleMappingChange(layer.id, e.target.value)}
                                        >
                                            <option value="">연결 안함</option>
                                            {parsedData.headers.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </Select>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">템플릿의 텍스트 레이어를 데이터의 어떤 열로 바꿀지 선택하세요.</p>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end">
                    <Button onClick={handleGenerateClick} disabled={!parsedData || parsedData.rows.length === 0}>
                        <SparklesIcon className="mr-2 h-5 w-5"/>
                        {parsedData ? `${parsedData.rows.length}개 디자인 생성` : '생성하기'}
                    </Button>
                </div>
            </div>
        </div>
    );
};