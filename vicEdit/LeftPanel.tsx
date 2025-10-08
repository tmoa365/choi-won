import React, { useState, useEffect } from 'react';
import { DesignProject, DesignPage, DesignBrief, GenerationOption, AllLayer } from '../types';
import { ElementsIcon, LayersIcon, SparklesIcon } from '../components/icons';
import { AssetPanel } from './AssetPanel';
import { LayerPanel } from './LayerPanel';
import { ProjectBriefPanel } from './AiAssistantPanel';

type ActiveTab = 'brief' | 'assets' | 'layers';

interface LeftPanelProps {
    projectData: DesignProject;
    addLayer: (layer: AllLayer) => void;
    updateProjectData: (updater: (prev: DesignProject) => DesignProject) => void;
    allLayers: AllLayer[];
    selectedLayerIds: string[];
    setSelectedLayerIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    handleLayerUpdate: (id: string, updates: Partial<AllLayer>) => void;
    forceAiAssistant: boolean;
    onAiAssistantClose: () => void;
    editingDocumentId: string | null;
    onStartGeneration: (genOption: GenerationOption, brief: DesignBrief) => void;
    onOpenDataDrivenModal: () => void;
    onStartWizard: (initialIdea: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = (props) => {
    const { 
        projectData, addLayer, updateProjectData, allLayers, selectedLayerIds, 
        setSelectedLayerIds, handleLayerUpdate, forceAiAssistant, onAiAssistantClose,
        editingDocumentId, onStartGeneration, onOpenDataDrivenModal, onStartWizard
    } = props;
    const [activeTab, setActiveTab] = useState<ActiveTab>('brief');

    useEffect(() => {
        if(forceAiAssistant) {
            setActiveTab('brief');
        }
    }, [forceAiAssistant]);

    useEffect(() => {
        if (!editingDocumentId) {
            setActiveTab('brief');
        }
    }, [editingDocumentId]);

    const handleTabChange = (tab: ActiveTab) => {
        if(activeTab === 'brief' && tab !== 'brief') {
            onAiAssistantClose();
        }
        setActiveTab(tab);
    }

    const tabs: { id: ActiveTab, icon: React.ReactNode, label: string }[] = [
        { id: 'brief', icon: <SparklesIcon className="w-5 h-5"/>, label: '프로젝트 브리핑' },
        { id: 'assets', icon: <ElementsIcon className="w-5 h-5"/>, label: '요소' },
        { id: 'layers', icon: <LayersIcon className="w-5 h-5"/>, label: '레이어' },
    ];

    return (
        <div className="w-80 bg-slate-50 flex flex-shrink-0 h-full border-r border-slate-200">
            <div className="w-20 bg-slate-100 p-2 flex flex-col items-center gap-2 border-r border-slate-200">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => handleTabChange(tab.id as any)}
                        className={`w-full flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 text-slate-600'}`}>
                        {tab.icon}
                        <span className="text-xs mt-1">{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'brief' && (
                    <ProjectBriefPanel
                        projectData={projectData}
                        updateProjectData={updateProjectData}
                        onStartGeneration={onStartGeneration}
                        editingDocumentId={editingDocumentId}
                        onOpenDataDrivenModal={onOpenDataDrivenModal}
                        onStartWizard={onStartWizard}
                    />
                )}
                {activeTab === 'assets' && (
                    <AssetPanel
                        projectData={projectData}
                        addLayer={addLayer}
                        updateProjectData={updateProjectData}
                    />
                )}
                 {activeTab === 'layers' && (
                    <LayerPanel
                        layers={allLayers}
                        selectedLayerIds={selectedLayerIds}
                        onSelectLayer={setSelectedLayerIds}
                        onLayerUpdate={handleLayerUpdate}
                    />
                )}
            </div>
        </div>
    );
};
