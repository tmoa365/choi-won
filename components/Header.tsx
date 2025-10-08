import React from 'react';
import { DesignType, GenerationOption } from '../types';
import { Button } from './ui';
import { BookIcon, DownloadIcon, GridIcon, ResetIcon, UploadIcon, UndoIcon, RedoIcon } from './icons';
import { NewDesignDropdown } from './NewDesignDropdown';

interface HeaderProps {
    isEditing: boolean;
    onNavigateHome: () => void;
    onCreateNewDesign: (type: DesignType, dimensions?: { width_mm: number, height_mm: number }) => void;
    onStartWizardWithType: (type: GenerationOption) => void;
    onOpenBrief: () => void;
    onTriggerImport: () => void;
    onExport: () => void;
    onReset: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    saveStatus: 'idle' | 'saving' | 'saved';
}

export const Header: React.FC<HeaderProps> = ({
    isEditing,
    onNavigateHome,
    onCreateNewDesign,
    onStartWizardWithType,
    onOpenBrief,
    onTriggerImport,
    onExport,
    onReset,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    saveStatus,
}) => {
    return (
        <header className="bg-white shadow-sm sticky top-0 z-20 flex-shrink-0">
            <div className="max-w-full mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <div className='flex items-center gap-2'>
                    <h1 className="text-xl font-bold leading-tight text-slate-900">AI 디자인 스튜디오 🎨</h1>
                    {isEditing && (
                       <>
                         <Button onClick={onNavigateHome} variant="secondary" size="md">
                            <GridIcon className="h-5 w-5 mr-2"/> 내 디자인
                         </Button>
                         <div className="flex items-center gap-1">
                            <Button onClick={onUndo} disabled={!canUndo} variant="secondary" title="실행 취소 (Cmd+Z)"><UndoIcon className="h-5 w-5"/></Button>
                            <Button onClick={onRedo} disabled={!canRedo} variant="secondary" title="다시 실행 (Cmd+Shift+Z)"><RedoIcon className="h-5 w-5"/></Button>
                         </div>
                       </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <Button onClick={onOpenBrief} variant="secondary" size="md">
                            <BookIcon className="h-5 w-5 mr-2"/> 디자인 정보 수정
                        </Button>
                    )}
                    <NewDesignDropdown onCreateNewDesign={onCreateNewDesign} onStartWizardWithType={onStartWizardWithType} />
                    <Button onClick={onTriggerImport} variant="secondary" title="프로젝트 불러오기"><UploadIcon className="h-5 w-5"/></Button>
                    <Button onClick={onExport} variant="secondary" title="프로젝트 파일로 저장"><DownloadIcon className="h-5 w-5"/></Button>
                    <Button onClick={onReset} variant="secondary" title="모든 데이터 초기화"><ResetIcon className="h-5 w-5"/></Button>
                </div>
            </div>
        </header>
    );
};