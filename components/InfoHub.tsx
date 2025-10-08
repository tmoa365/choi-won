import React from 'react';
import { DesignDocument } from '../types';
import { Card, CardHeader } from './ui';
import { HistoryIcon, PageIcon, SparklesIcon } from './icons';

interface HistoryViewProps {
    documents: DesignDocument[];
    onSelectDocument: (docId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
    documents,
    onSelectDocument,
}) => {
    
    return (
        <div>
            <Card>
                 <div className="flex justify-between items-start">
                    <CardHeader title="내 디자인" subtitle="생성된 문서를 클릭하여 편집하거나, 새로 시작하세요." icon={<HistoryIcon />} />
                </div>

                {documents.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg mt-4">
                        <SparklesIcon className="w-12 h-12 text-slate-400" />
                        <p className="mt-4 text-slate-600 font-semibold">새로운 디자인을 만들어보세요!</p>
                    </div>
                ) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                        {documents.map(doc => (
                            <div key={doc.id} className="cursor-pointer group relative" onClick={() => onSelectDocument(doc.id)}>
                                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden border">
                                    {doc.pages.length > 0 && doc.pages[0].base64 && doc.pages[0].base64.length > 100 ? (
                                        <img src={`data:image/png;base64,${doc.pages[0].base64}`} alt={doc.name} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400"><PageIcon className="w-8 h-8"/></div>
                                    )}
                                </div>
                                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <PageIcon className="w-3 h-3"/> {doc.pages.length}
                                </div>
                                <div className="mt-2">
                                    <p className="font-semibold text-slate-800 truncate">{doc.name}</p>
                                </div>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold text-lg">편집하기</span>
                                </div>
                            </div>
                        ))}
                     </div>
                )}
            </Card>
        </div>
    );
};