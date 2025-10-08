import React, { useState, useEffect } from 'react';
import { DesignProject, DesignType, DesignDocument, GenerationOption } from '../types';
import { Card, CardHeader, Button } from './ui';
import { SparklesIcon, SpinnerIcon, RedoIcon } from './icons';
import { generateFullDesignPreviews, convertPreviewToEditableDocument } from '../services';
import { getApiErrorMessage } from '../vicEdit/utils';

interface GenerationViewProps {
    projectData: DesignProject;
    generationType: GenerationOption;
    onDesignCreated: (newDocument: DesignDocument) => void;
    onCancel: () => void;
    setError: (error: string | null) => void;
}

export const GenerationView: React.FC<GenerationViewProps> = ({
    projectData,
    generationType,
    onDesignCreated,
    onCancel,
    setError,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isConverting, setIsConverting] = useState(false);
    const [designPreviews, setDesignPreviews] = useState<string[]>([]);

    useEffect(() => {
        const generateDesigns = async () => {
            setError(null);
            setIsLoading(true);
            setDesignPreviews([]);

            try {
                const designType = generationType === 'BusinessCardSet' ? DesignType.BusinessCardFront : generationType as DesignType;
                const results = await generateFullDesignPreviews(designType, projectData, 3);
                setDesignPreviews(results);
            } catch (err) {
                setError(getApiErrorMessage(err, '디자인 시안 생성'));
                console.error(err);
                onCancel(); 
            } finally {
                setIsLoading(false);
            }
        };

        generateDesigns();
    }, [generationType, projectData, setError, onCancel]);
    
    const handlePreviewSelect = async (selectedBase64: string) => {
        setIsConverting(true);
        try {
            const newDocument = await convertPreviewToEditableDocument(selectedBase64, generationType, projectData);
            onDesignCreated(newDocument);
        } catch (err) {
             setError(getApiErrorMessage(err, '디자인 변환'));
             console.error(err);
             setIsConverting(false); 
        }
    };
    
    const isProcessing = isLoading || isConverting;
    const title = generationType === 'BusinessCardSet' ? '명함 (앞/뒷면)' : generationType;

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">AI 디자인 생성: {title}</h1>
                        <p className="text-slate-500">마음에 드는 시안을 선택하면 편집 가능한 디자인으로 만들어 드립니다.</p>
                    </div>
                    <Button onClick={onCancel} variant="secondary" disabled={isProcessing}>
                        <RedoIcon className="h-5 w-5 mr-2 transform rotate-180 scale-x-[-1]" />
                        에디터로 돌아가기
                    </Button>
                </div>
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-96">
                        <SpinnerIcon className="w-16 h-16 text-indigo-600 animate-spin" />
                        <p className="mt-4 text-lg font-semibold">AI가 디자인 시안을 생성 중입니다...</p>
                        <p className="text-slate-500">잠시만 기다려주세요. 이 과정은 최대 1분 정도 소요될 수 있습니다.</p>
                    </div>
                )}
                
                {designPreviews.length > 0 && (
                     <div className="relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {designPreviews.map((base64, index) => (
                                <div key={index} className="aspect-video bg-slate-200 rounded-xl overflow-hidden cursor-pointer group relative shadow-lg hover:shadow-2xl transition-shadow" onClick={() => !isProcessing && handlePreviewSelect(base64)}>
                                    <img src={`data:image/png;base64,${base64}`} alt={`디자인 시안 ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-xl">이 디자인 선택</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {isConverting && (
                           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                               <SpinnerIcon className="w-12 h-12 text-indigo-600 animate-spin" />
                               <p className="mt-4 font-semibold">선택한 시안을 분석하여 변환 중...</p>
                           </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};