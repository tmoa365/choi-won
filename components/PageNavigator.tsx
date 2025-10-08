import React from 'react';
import { DesignPage } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface PageNavigatorProps {
    pages: DesignPage[];
    activePageIndex: number;
    onSelectPage: (index: number) => void;
    onAddPage: () => void;
    onDeletePage: (index: number) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({ pages, activePageIndex, onSelectPage, onAddPage, onDeletePage }) => {
    return (
        <div className="flex-shrink-0 bg-white p-2 border-t border-slate-200">
            <div className="flex items-center gap-3 overflow-x-auto">
                {pages.map((page, index) => (
                    <div key={page.id} className="relative flex-shrink-0 group">
                        <div
                            onClick={() => onSelectPage(index)}
                            className={`w-28 h-20 bg-white rounded-md border-2 ${activePageIndex === index ? 'border-indigo-600' : 'border-slate-300 hover:border-indigo-400'} overflow-hidden cursor-pointer`}
                        >
                            <img src={`data:image/png;base64,${page.base64}`} className="w-full h-full object-cover" alt={`Page ${index + 1}`} />
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white rounded px-1.5 py-0.5 pointer-events-none">
                            {index + 1}
                        </span>
                        {pages.length > 1 && (
                            <button
                                onClick={() => onDeletePage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                title="페이지 삭제"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={onAddPage}
                    className="w-28 h-20 bg-slate-50 rounded-md border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                    title="새 페이지 추가"
                >
                    <PlusIcon className="w-8 h-8"/>
                    <span className="text-xs font-semibold">페이지 추가</span>
                </button>
            </div>
        </div>
    );
};