import React from 'react';
import { DesignProject } from '../types';
import { TEMPLATES } from './templates';
import { Card, CardHeader, Button, Modal } from './ui';
import { GridIcon, SparklesIcon } from './icons';

interface TemplateViewProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (templateProject: DesignProject) => void;
}

export const TemplateView: React.FC<TemplateViewProps> = ({ isOpen, onClose, onSelectTemplate }) => {
    
    if (!isOpen) return null;

    return (
        <Modal title="템플릿으로 시작" onClose={onClose} size="3xl">
            <Card>
                <CardHeader title="템플릿" subtitle="미리 만들어진 디자인 템플릿으로 빠르게 작업을 시작하세요." icon={<GridIcon />} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TEMPLATES.map(template => (
                        <div key={template.id} className="border bg-slate-50 rounded-lg flex flex-col hover:shadow-lg transition-shadow">
                            <div className="aspect-[4/3] bg-white overflow-hidden rounded-t-lg border-b">
                                <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-bold text-lg text-slate-800">{template.name}</h3>
                                <p className="text-sm text-slate-600 my-2 flex-grow">{template.description}</p>
                                <Button onClick={() => onSelectTemplate(template.project)} className="mt-auto w-full">
                                    <SparklesIcon className="w-4 h-4 mr-2" /> 이 템플릿 사용하기
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </Modal>
    );
};
