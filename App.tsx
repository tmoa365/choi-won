import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DesignBrief, DesignProject, ImageAsset, DesignDocument, DesignPage, DesignType, GenerationOption, BrandLogo, BrandColor, BrandFont } from './types';
import { XCircleIcon, UploadIcon } from './components/icons';
import { DesignBriefForm } from './components/DesignBriefForm';
import { HistoryView } from './components/InfoHub';
import { KOREAN_FONTS_LIST } from './components/fonts';
import { dataURLtoFile, fileToDataURL, mmToPx, renderPdfToPngDataURL, getBase64FromDataUrl, getApiErrorMessage } from './vicEdit/utils';
import { v4 as uuidv4 } from 'uuid';
import { Editor } from './vicEdit/Editor';
import { Header } from './components/Header';
import { useHistoryState } from './vicEdit/hooks';
import { GenerationView } from './components/OutputDisplay';
import { GenerationWizardModal } from './components/GenerationWizardModal';
import { SeasonalGreetingWizardModal } from './components/SeasonalGreetingWizardModal';
import { PostUploadActionModal } from './components/PostUploadActionModal';
import { ImageScanModal } from './components/ImageScanModal';
import { scanDesignFromImage } from './services';
import { TemplateView } from './components/TemplateView';


function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const initialProjectData: DesignProject = {
    designBrief: {
        title: '',
        subtitle: '',
        bodyText: '',
        contactInfo: '',
        keywords: [],
        colorPalette: '신뢰의 파랑',
        toneAndManner: '진중하고 신뢰감',
        fontFamily: KOREAN_FONTS_LIST[0].name,
    },
    imageLibrary: [],
    documents: [],
    personalNotes: '',
    brandKit: {
      logos: [],
      colors: [],
      fonts: [],
      logoClearspace: 0.2,
      logoMinimumSize: 50,
      usageRules: '로고의 비율을 변경하지 마세요.',
    }
};

const migrateProjectData = (data: any): DesignProject => {
    // ... (migration logic remains the same)
    if (!data.brandKit || !('logos' in data.brandKit)) {
        const oldBrandKit = data.brandKit || {};
        const newBrandKit: DesignProject['brandKit'] = {
            logos: [],
            colors: [],
            fonts: [],
        };
        if (oldBrandKit.logoAssetId) {
            newBrandKit.logos.push({
                id: uuidv4(),
                role: 'Primary Signature',
                assetId: oldBrandKit.logoAssetId,
            });
        }
        if (Array.isArray(oldBrandKit.colors) && typeof oldBrandKit.colors[0] === 'string') {
            newBrandKit.colors = oldBrandKit.colors.map((color: string) => ({
                id: uuidv4(),
                role: 'Main',
                value: color,
            }));
        }
        if (oldBrandKit.fontFamily) {
             newBrandKit.fonts.push({
                id: uuidv4(),
                role: 'Headline',
                fontFamily: oldBrandKit.fontFamily,
                fontWeight: 700,
            });
        }
        data.brandKit = newBrandKit;
    }
    // Add new brandkit properties if they don't exist
    data.brandKit.logoClearspace = data.brandKit.logoClearspace ?? initialProjectData.brandKit.logoClearspace;
    data.brandKit.logoMinimumSize = data.brandKit.logoMinimumSize ?? initialProjectData.brandKit.logoMinimumSize;
    data.brandKit.usageRules = data.brandKit.usageRules ?? initialProjectData.brandKit.usageRules;
    
    if (data.generatedImages && !data.documents) {
        const migratedDocs: DesignDocument[] = [];
        const businessCardPairs: { [key: string]: any[] } = {};
        (data.generatedImages).forEach((page: any) => {
            if (page.pairId) {
                if (!businessCardPairs[page.pairId]) businessCardPairs[page.pairId] = [];
                businessCardPairs[page.pairId].push(page);
            } else {
                migratedDocs.push({ id: uuidv4(), name: page.type || `디자인`, pages: [{...page, pageNumber: 1}] });
            }
        });
        Object.values(businessCardPairs).forEach(pair => {
            pair.sort((a, b) => a.type === DesignType.BusinessCardFront ? -1 : 1);
            migratedDocs.push({ id: uuidv4(), name: "명함", pages: pair.map((p, i) => ({...p, pageNumber: i + 1})) });
        });
        data.documents = migratedDocs;
        delete data.generatedImages;
    }
    if (!data.documents) data.documents = [];
    data.documents = data.documents.map((doc: any) => {
        const addLayerDefaults = (layer: any) => ({ ...layer, isVisible: layer.isVisible !== false, isLocked: layer.isLocked === true });
        const migrateFontStyles = (layer: any): any => {
            let fontWeight = layer.fontWeight;
            if (typeof fontWeight !== 'number') {
                switch(fontWeight) {
                    case 'bold': case 'bolder': fontWeight = 700; break;
                    case 'normal': default: fontWeight = 400; break;
                }
            }
            return { ...layer, fontWeight, fontStyle: layer.fontStyle || 'normal', textDecoration: layer.textDecoration || 'none' };
        }
        const migrateShapeFill = (layer: any) => {
            if (layer.fillColor && !layer.fill) {
                layer.fill = layer.fillColor;
                delete layer.fillColor;
            } else if (!layer.fill) {
                layer.fill = '#6366f1'; // a default
            }
            if (typeof layer.fill === 'object' && layer.fill.stops) {
                layer.fill.stops = layer.fill.stops.map((stop: any) => ({
                    ...stop,
                    id: stop.id || uuidv4(),
                }));
            }
            return layer;
        }
        if (!doc.pages) doc.pages = [];
        doc.pages = doc.pages.map((page: any, index: number) => ({ 
            ...page, 
            groups: page.groups || [], 
            pageNumber: page.pageNumber || index + 1, 
            hGuides: page.hGuides || [],
            vGuides: page.vGuides || [],
            textLayers: (page.textLayers || []).map(addLayerDefaults).map(migrateFontStyles), 
            imageLayers: (page.imageLayers || []).map(addLayerDefaults), 
            shapeLayers: (page.shapeLayers || []).map(addLayerDefaults).map(migrateShapeFill) 
        }));
        return doc;
    });
    return data as DesignProject;
};

export function App() {
  const [initialProjectState] = useState(() => {
    try {
        const savedData = localStorage.getItem('designProject');
        if (!savedData) return initialProjectData;
        let parsed = JSON.parse(savedData);
        parsed = migrateProjectData(parsed);
        const newProjectData = { ...initialProjectData, ...parsed };
        
        newProjectData.documents.forEach(doc => {
            doc.pages.forEach(page => {
                if (!page.base64 || page.base64.length < 100) {
                     page.base64 = getBase64FromDataUrl(colorTo1x1PngDataURL('#F0F0F0'));
                }
            });
        });

        return { ...newProjectData, imageLibrary: [] };
    } catch (error) {
        console.error("Failed to parse design data from localStorage", error);
        return initialProjectData;
    }
  });
  const [projectData, setProjectData, undo, redo, canUndo, canRedo] = useHistoryState<DesignProject>(initialProjectState);
  
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [forceAiAssistant, setForceAiAssistant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [currentView, setCurrentView] = useState<'history' | 'editor' | 'generation'>('history');
  const [generationContext, setGenerationContext] = useState<GenerationOption | null>(null);
  const [wizardState, setWizardState] = useState<{isOpen: boolean; initialIdea: string; designType?: GenerationOption | null}>({isOpen: false, initialIdea: '', designType: null});
  const [isSeasonalWizardOpen, setIsSeasonalWizardOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debouncedProjectData = useDebounce(projectData, 1000);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [assetsForPostUpload, setAssetsForPostUpload] = useState<ImageAsset[]>([]);
  const [assetToScan, setAssetToScan] = useState<ImageAsset | null>(null);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    setSaveStatus('saving');
  }, [projectData]);

  useEffect(() => {
    if (saveStatus === 'saving') {
        try {
            const persistableData = { ...debouncedProjectData, imageLibrary: [] };
            localStorage.setItem('designProject', JSON.stringify(persistableData));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save design data to localStorage", error);
            setError("자동 저장에 실패했습니다.");
            setSaveStatus('idle');
        }
    }
  }, [debouncedProjectData, saveStatus]);
  
  useEffect(() => {
    if (editingDocumentId && currentView !== 'generation') {
        setCurrentView('editor');
    } else if (!editingDocumentId) {
        setCurrentView('history');
    }
  }, [editingDocumentId, currentView]);

  const updateProjectData = useCallback((updater: (prev: DesignProject) => DesignProject) => {
    setProjectData(updater);
  }, [setProjectData]);

  const editingDocument = useMemo(() => {
      if (!editingDocumentId) return null;
      return projectData.documents.find(d => d.id === editingDocumentId);
  }, [editingDocumentId, projectData.documents]);

  const activePage = useMemo(() => {
    if (!editingDocument || !editingDocument.pages[activePageIndex]) return null;
    return editingDocument.pages[activePageIndex];
  }, [editingDocument, activePageIndex]);

  const handleOpenEditor = (docId: string) => {
      setActivePageIndex(0);
      setEditingDocumentId(docId);
  };

  const handlePageUpdate = (pageId: string, updates: Partial<DesignPage>) => {
      if (!editingDocumentId) return;
      updateProjectData(p => ({
          ...p,
          documents: p.documents.map(doc =>
              doc.id === editingDocumentId
                  ? { ...doc, pages: doc.pages.map(page => page.id === pageId ? { ...page, ...updates } : page) }
                  : doc
          )
      }));
  };
  
    const handleAddPage = async () => {
        if (!editingDocument || !activePage) return;
        const newPage: DesignPage = {
            id: uuidv4(),
            type: activePage.type,
            width_mm: activePage.width_mm,
            height_mm: activePage.height_mm,
            base64: getBase64FromDataUrl(colorTo1x1PngDataURL('#F0F0F0')),
            textLayers: [], imageLayers: [], shapeLayers: [],
            pageNumber: editingDocument.pages.length + 1,
            hGuides: [], vGuides: [],
        };

        const newDoc = { ...editingDocument, pages: [...editingDocument.pages, newPage] };
        updateProjectData(p => ({ ...p, documents: p.documents.map(d => d.id === newDoc.id ? newDoc : d) }));
        setActivePageIndex(newDoc.pages.length - 1);
    };

    const handleDeletePage = (index: number) => {
        if (!editingDocument || editingDocument.pages.length <= 1) {
            alert("마지막 페이지는 삭제할 수 없습니다."); return;
        }
        const newPages = editingDocument.pages.filter((_, i) => i !== index);
        const newDoc = { ...editingDocument, pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })) };
        updateProjectData(p => ({ ...p, documents: p.documents.map(d => d.id === newDoc.id ? newDoc : d) }));
        setActivePageIndex(Math.max(0, index - 1));
    };

    const handleCreateNewDesign = useCallback((type: DesignType, dimensions?: { width_mm: number, height_mm: number }) => {
        const newPage: DesignPage = {
            id: uuidv4(),
            type: type,
            base64: getBase64FromDataUrl(colorTo1x1PngDataURL('#F0F0F0')),
            textLayers: [],
            imageLayers: [],
            shapeLayers: [],
            pageNumber: 1,
            hGuides: [],
            vGuides: [],
            ...(dimensions && { width_mm: dimensions.width_mm, height_mm: dimensions.height_mm }),
        };
        
        const name = dimensions ? `${dimensions.width_mm}x${dimensions.height_mm}mm 디자인` : type;

        const newDocument: DesignDocument = {
            id: uuidv4(),
            name: name,
            pages: [newPage],
        };

        updateProjectData(p => ({
            ...p,
            designBrief: initialProjectData.designBrief,
            documents: [newDocument, ...p.documents],
        }));
        
        setForceAiAssistant(true);
        handleOpenEditor(newDocument.id);
    }, [updateProjectData]);

    const handleSelectTemplate = (templateProject: DesignProject) => {
        const templateDoc = templateProject.documents[0];
        const newDoc: DesignDocument = {
            ...JSON.parse(JSON.stringify(templateDoc)), // Deep copy
            id: uuidv4(),
            name: `사본: ${templateDoc.name}`,
        };
        updateProjectData(p => ({ ...p, documents: [newDoc, ...p.documents], designBrief: templateProject.designBrief }));
        handleOpenEditor(newDoc.id);
        setIsTemplateModalOpen(false);
    };

  useEffect(() => {
    const processFiles = async (files: FileList) => {
        const fileArray = Array.from(files);
        
        if (fileArray.length > 0) {
            const newAssetsPromises: Promise<ImageAsset | null>[] = fileArray.map(async (file): Promise<ImageAsset | null> => {
                try {
                    let previewUrl: string;
                    let processedFile = file;

                    if (file.type.startsWith('image/')) {
                        previewUrl = URL.createObjectURL(file);
                    } else if (file.type === 'application/pdf') {
                        previewUrl = await renderPdfToPngDataURL(file);
                        processedFile = dataURLtoFile(previewUrl, file.name.replace(/\.pdf$/i, '.png'));
                        previewUrl = URL.createObjectURL(processedFile);
                    } else {
                        console.warn('Unsupported file type:', file.type);
                        return null;
                    }

                    const image = new Image();
                    image.src = previewUrl;
                    await new Promise((resolve, reject) => {
                        image.onload = resolve;
                        image.onerror = reject;
                    });
                    
                    return {
                        id: uuidv4(),
                        file: processedFile,
                        previewUrl: image.src,
                        width: image.naturalWidth,
                        height: image.naturalHeight
                    };
                } catch (error) {
                    console.error("Error processing file:", file.name, error);
                    setError(`'${file.name}' 파일 처리 중 오류 발생`);
                    return null;
                }
            });

            const newAssets = (await Promise.all(newAssetsPromises)).filter((asset): asset is ImageAsset => asset !== null);
            if(newAssets.length > 0) {
                const isProjectEmpty = projectData.documents.length === 0;

                if (isProjectEmpty) {
                    // If project is empty, trigger scan flow with the first image
                    setAssetToScan(newAssets[0]);
                    // Add all assets to the library so they are not lost if the user cancels
                    updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, ...newAssets] }));
                } else {
                    // Original logic for non-empty project
                    updateProjectData(p => ({ ...p, imageLibrary: [...p.imageLibrary, ...newAssets] }));
                    const jpegAssets = newAssets.filter(a => a.file.type === 'image/jpeg');
                    if (jpegAssets.length > 0) {
                        setAssetsForPostUpload(current => [...current, ...jpegAssets]);
                    }
                }
            }
        }
    };
    const handlePaste = (event: ClipboardEvent) => {
        const target = event.target as HTMLElement;
        if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        if (event.clipboardData?.files.length) {
            event.preventDefault();
            processFiles(event.clipboardData.files);
        }
    };
    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        setIsDraggingOver(false);
        if (event.dataTransfer?.files.length) {
            processFiles(event.dataTransfer.files);
        }
    };
    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        setIsDraggingOver(true);
    };
    const handleDragLeave = (event: DragEvent) => {
        if (!event.relatedTarget || (event.relatedTarget as Node).nodeName === "HTML") {
            setIsDraggingOver(false);
        }
    };
    document.addEventListener('paste', handlePaste);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    return () => {
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('drop', handleDrop);
        document.removeEventListener('dragover', handleDragOver);
        document.removeEventListener('dragleave', handleDragLeave);
    };
  }, [updateProjectData, setError, projectData.documents.length]);

  const handleReset = () => {
    if (window.confirm("정말로 모든 입력 데이터와 생성된 이미지를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        projectData.imageLibrary.forEach(asset => URL.revokeObjectURL(asset.previewUrl));
        updateProjectData(() => initialProjectData);
        setEditingDocumentId(null);
        setError(null);
        localStorage.removeItem('designProject');
    }
  }
  
  const handleExport = async () => {
    try {
      const imageLibraryPromises = projectData.imageLibrary.map(async (asset) => ({ 
          id: asset.id, 
          name: asset.file.name, 
          type: asset.file.type, 
          base64: await fileToDataURL(asset.file) 
      }));
      const exportedImageLibrary = await Promise.all(imageLibraryPromises);
      const exportableData = { ...projectData, imageLibrary: exportedImageLibrary };
      const jsonString = JSON.stringify(exportableData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI디자인_프로젝트.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export project data", error);
      setError("프로젝트 파일 내보내기에 실패했습니다.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        projectData.imageLibrary.forEach(asset => URL.revokeObjectURL(asset.previewUrl));
        const imageAssetsPromises = (importedData.imageLibrary || []).map(async (img: {id: string; base64: string; name: string}): Promise<ImageAsset> => {
            const file = dataURLtoFile(img.base64, img.name);
            const previewUrl = URL.createObjectURL(file);
            const image = new Image();
            image.src = previewUrl;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
            return {
                id: img.id,
                file: file,
                previewUrl: previewUrl,
                width: image.naturalWidth,
                height: image.naturalHeight
            };
        });
        const imageAssets: ImageAsset[] = await Promise.all(imageAssetsPromises);
        const newProjectData: DesignProject = { ...initialProjectData, ...migrateProjectData(importedData), imageLibrary: imageAssets };
        setProjectData(newProjectData);
        setEditingDocumentId(null);
        setError(null);
      } catch (error) {
        console.error("Failed to import project data", error);
        setError("유효하지 않은 프로젝트 파일입니다.");
      }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };
  
  const triggerImport = () => {
    if (window.confirm("프로젝트 파일을 불러오면 현재 작업 내용이 모두 사라집니다. 계속하시겠습니까?")) {
      importFileRef.current?.click();
    }
  };
  
    const handleStartGeneration = (genOption: GenerationOption, brief: DesignBrief) => {
      if (!brief.title) {
          setError('디자인 브리핑에서 필수 항목(제목)을 입력해주세요.');
          return;
      }
      setGenerationContext(genOption);
      setCurrentView('generation');
    };

    const handleDesignCreatedFromGeneration = (newDocument: DesignDocument) => {
      updateProjectData(p => {
          const docIndex = p.documents.findIndex(d => d.id === editingDocumentId);
          if (docIndex !== -1) {
              const docToUpdate = p.documents[docIndex];
              const isNewDoc = docToUpdate.pages.length === 1 && docToUpdate.pages[0].textLayers.length === 0 && docToUpdate.pages[0].imageLayers.length === 0;
              
              if (isNewDoc) {
                  const updatedDoc = { ...newDocument, id: editingDocumentId!, name: newDocument.name || docToUpdate.name };
                  const newDocuments = [...p.documents];
                  newDocuments[docIndex] = updatedDoc;
                  setCurrentView('editor');
                  return { ...p, documents: newDocuments };
              }
          }
          
          const newDocuments = [newDocument, ...p.documents];
          setEditingDocumentId(newDocument.id);
          setCurrentView('editor');
          return { ...p, documents: newDocuments };
      });
    };

    const handleStartWizard = (initialIdea: string) => {
      setWizardState({ isOpen: true, initialIdea, designType: null });
    };
    
    const handleStartWizardWithType = (type: GenerationOption) => {
        setWizardState({ isOpen: true, initialIdea: '', designType: type });
    };
    
    const handleStartSeasonalWizard = () => {
        setIsSeasonalWizardOpen(true);
    };

    const handleDeleteAsset = (assetId: string) => {
        updateProjectData(p => {
            const assetToDelete = p.imageLibrary.find(asset => asset.id === assetId);
            if (assetToDelete) {
                URL.revokeObjectURL(assetToDelete.previewUrl);
            }
            return { ...p, imageLibrary: p.imageLibrary.filter(asset => asset.id !== assetId) };
        });
    };
    
    const handleScanAndCreate = async (asset: ImageAsset, designType: DesignType) => {
        try {
            const base64 = await fileToDataURL(asset.file).then(getBase64FromDataUrl);
            const newDocument = await scanDesignFromImage(base64, designType, projectData);
            
            updateProjectData(p => ({
                ...p,
                documents: [newDocument, ...p.documents],
            }));

            handleOpenEditor(newDocument.id);
            setAssetToScan(null); // Close modal on success
        } catch (err) {
            setError(getApiErrorMessage(err, 'AI 디자인 스캔'));
            throw err; // Re-throw for the modal to catch
        }
    };


  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col font-sans">
        <Header
            isEditing={currentView === 'editor'}
            onNavigateHome={() => setEditingDocumentId(null)}
            onCreateNewDesign={handleCreateNewDesign}
            onStartWizardWithType={handleStartWizardWithType}
            onStartSeasonalWizard={handleStartSeasonalWizard}
            onOpenBrief={() => setIsBriefModalOpen(true)}
            onOpenTemplates={() => setIsTemplateModalOpen(true)}
            onTriggerImport={triggerImport}
            onExport={handleExport}
            onReset={handleReset}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            saveStatus={saveStatus}
        />
      <main className="flex-grow relative overflow-hidden">
        {isDraggingOver && (
            <div className="fixed inset-0 bg-indigo-500/30 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-none">
                <div className="p-12 border-4 border-dashed border-white rounded-2xl text-center">
                    <UploadIcon className="w-24 h-24 text-white mx-auto"/>
                    <p className="mt-4 text-2xl font-bold text-white">여기에 파일을 드롭하세요</p>
                </div>
            </div>
        )}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg z-50 shadow-lg" role="alert">
            <strong className="font-bold">오류: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XCircleIcon className="h-6 w-6 text-red-500"/></button>
          </div>
        )}
        
        {currentView === 'history' && (
          <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
            <HistoryView
              documents={projectData.documents}
              onSelectDocument={handleOpenEditor}
            />
          </div>
        )}

        {currentView === 'editor' && editingDocument && activePage && (
          <Editor
            key={editingDocumentId} 
            editingDocument={editingDocument}
            activePageIndex={activePageIndex}
            onPageUpdate={handlePageUpdate}
            onSelectPage={setActivePageIndex}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            projectData={projectData}
            updateProjectData={updateProjectData}
            onDeleteAsset={handleDeleteAsset}
            forceAiAssistant={forceAiAssistant}
            onAiAssistantClose={() => setForceAiAssistant(false)}
            onStartGeneration={handleStartGeneration}
            setError={setError}
            onDocumentCreationCloseEditor={() => setEditingDocumentId(null)}
            onStartWizard={handleStartWizard}
          />
        )}

        {currentView === 'generation' && generationContext && (
            <GenerationView
                projectData={projectData}
                generationType={generationContext}
                onDesignCreated={handleDesignCreatedFromGeneration}
                onCancel={() => setCurrentView(editingDocumentId ? 'editor' : 'history')}
                setError={setError}
            />
        )}

      </main>

      {isBriefModalOpen && (
        <DesignBriefForm 
          isOpen={isBriefModalOpen}
          onClose={() => setIsBriefModalOpen(false)}
          projectData={projectData}
          updateProjectData={updateProjectData}
          setError={setError}
        />
      )}

      {wizardState.isOpen && (
        <GenerationWizardModal
            initialIdea={wizardState.initialIdea}
            initialDesignType={wizardState.designType}
            projectData={projectData}
            onClose={() => setWizardState({ isOpen: false, initialIdea: '', designType: null })}
            onDesignCreated={(newDoc, newBrief) => {
                updateProjectData(p => ({...p, designBrief: newBrief, documents: [newDoc, ...p.documents] }));
                setEditingDocumentId(newDoc.id);
                setCurrentView('editor');
                setWizardState({ isOpen: false, initialIdea: '', designType: null });
            }}
            setError={setError}
        />
      )}
      
      {isSeasonalWizardOpen && (
        <SeasonalGreetingWizardModal
            projectData={projectData}
            onClose={() => setIsSeasonalWizardOpen(false)}
            onDesignCreated={(newDoc, newBrief) => {
                updateProjectData(p => ({...p, designBrief: newBrief, documents: [newDoc, ...p.documents] }));
                setEditingDocumentId(newDoc.id);
                setCurrentView('editor');
                setIsSeasonalWizardOpen(false);
            }}
            setError={setError}
        />
      )}
      
      {assetsForPostUpload.length > 0 && (
        <PostUploadActionModal
            assets={assetsForPostUpload}
            onClose={() => setAssetsForPostUpload(assets => assets.slice(1))}
            onUpdate={(assetId, updatedFile) => {
                updateProjectData(p => {
                    const newLibrary = p.imageLibrary.map(a => {
                        if (a.id === assetId) {
                            URL.revokeObjectURL(a.previewUrl);
                            return { ...a, file: updatedFile, previewUrl: URL.createObjectURL(updatedFile) };
                        }
                        return a;
                    });
                    return { ...p, imageLibrary: newLibrary };
                });
                setAssetsForPostUpload(assets => assets.slice(1));
            }}
            setError={setError}
        />
      )}

      {assetToScan && (
        <ImageScanModal
            asset={assetToScan}
            onClose={() => setAssetToScan(null)}
            onScan={handleScanAndCreate}
            setError={setError}
        />
      )}

      {isTemplateModalOpen && (
        <TemplateView
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            onSelectTemplate={handleSelectTemplate}
        />
      )}

      <input type="file" ref={importFileRef} onChange={handleImport} className="hidden" accept="application/json"/>
    </div>
  );
}

function colorTo1x1PngDataURL(color: string): string {
    if (typeof document === 'undefined') {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
    }
    return canvas.toDataURL('image/png');
};