import React, { useState, useEffect, useMemo } from 'react';
import { DesignBrief, DesignDocument, DesignProject, DesignType } from '../types';
import { Modal, Button, Textarea, Label } from './ui';
import { SpinnerIcon, SparklesIcon, CheckCircleIcon } from './icons';
import { generateSeasonalImagePreviews, convertPreviewToEditableDocument } from '../services';
import { getApiErrorMessage } from '../vicEdit/utils';
import { SeasonalEvent, getUpcomingEvents, getAllEvents } from '../data/seasonalDb';

interface SeasonalGreetingWizardModalProps {
    projectData: DesignProject;
    onClose: () => void;
    onDesignCreated: (newDocument: DesignDocument, newBrief: DesignBrief) => void;
    setError: (error: string | null) => void;
}

type WizardStep = 'suggestion' | 'eventList' | 'styleSelection' | 'generating' | 'previewSelection' | 'converting';
type ImageStyle = '동양화' | '일러스트' | '사진';

export const SeasonalGreetingWizardModal: React.FC<SeasonalGreetingWizardModalProps> = ({
    projectData, onClose, onDesignCreated, setError
}) => {
    const [step, setStep] = useState<WizardStep>('suggestion');
    const [upcomingEvent, setUpcomingEvent] = useState<SeasonalEvent | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('일러스트');
    const [greeting, setGreeting] = useState('');
    const [previews, setPreviews] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    useEffect(() => {
        const event = getUpcomingEvents(10);
        setUpcomingEvent(event);
        if (event) {
            setSelectedEvent(event);
            setGreeting(event.Sample_Greeting);
        } else {
            setStep('eventList'); // No upcoming event, go straight to list
        }
    }, []);
    
    const handleGenerate = async () => {
        if (!selectedEvent || !greeting) return;
        setIsLoading(true);
        setLoadingMessage('AI가 이미지 시안을 생성 중입니다...');
        setStep('generating');
        setError(null);
        try {
            const results = await generateSeasonalImagePreviews(selectedStyle, selectedEvent.Image_Keywords);
            setPreviews(results);
            setStep('previewSelection');
        } catch (err) {
            setError(getApiErrorMessage(err, '이미지 시안 생성'));
            setStep('styleSelection'); // Go back to style selection on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectPreview = async (selectedBase64: string) => {
        if (!selectedEvent || !greeting) return;
        setIsLoading(true);
        setLoadingMessage('선택한 시안을 편집 가능한 디자인으로 변환 중...');
        setStep('converting');
        setError(null);
        try {
            const brief: DesignBrief = {
                ...projectData.designBrief,
                title: selectedEvent.Event_Name_KR,
                bodyText: greeting,
                keywords: selectedEvent.Image_Keywords.split(',').map(k => k.trim()),
            };
            const tempProjectData = { ...projectData, designBrief: brief };
            const newDocument = await convertPreviewToEditableDocument(selectedBase64, DesignType.SeasonalGreeting, tempProjectData);
            onDesignCreated(newDocument, brief);
        } catch (err) {
             setError(getApiErrorMessage(err, '디자인 변환'));
             setStep('previewSelection');
        } finally {
             setIsLoading(false);
        }
    };
    
    const allEvents = useMemo(() => getAllEvents(), []);

    return (
        <Modal title="AI 절기 문자 생성 마법사" onClose={isLoading ? () => {} : onClose} size="3xl">
            <div className="min-h-[50vh] flex flex-col">
                {(step === 'generating' || step === 'converting') && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <SpinnerIcon className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="mt-4 font-semibold">{loadingMessage}</p>
                    </div>
                )}
                {step === 'suggestion' && upcomingEvent && (
                    <div className="text-center flex flex-col justify-center items-center h-full">
                        <p className="text-2xl font-bold">
                            곧 다가오는 <span className="text-indigo-600">{upcomingEvent.Event_Name_KR}</span>!
                        </p>
                        <p className="mt-4 text-slate-600">AI로 간편하게 인사 문자를 만들어 드릴까요?</p>
                        <div className="flex gap-4 mt-8">
                            <Button variant="secondary" onClick={() => setStep('eventList')}>다른 이벤트 선택</Button>
                            <Button onClick={() => setStep('styleSelection')}>네, 좋습니다!</Button>
                        </div>
                    </div>
                )}
                 {step === 'eventList' && (
                    <div>
                        <h3 className="font-bold text-lg mb-4">어떤 이벤트를 위한 문자를 만드시겠어요?</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {allEvents.map(event => (
                                <button key={event.Event_Name_KR} onClick={() => {
                                    setSelectedEvent(event);
                                    setGreeting(event.Sample_Greeting);
                                    setStep('styleSelection');
                                }} className="p-4 border rounded-lg text-center hover:bg-indigo-50 hover:border-indigo-500 transition-colors">
                                    {event.Event_Name_KR}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {step === 'styleSelection' && selectedEvent && (
                    <div className="space-y-6">
                        <div>
                            <Label>1. 이미지 스타일을 선택하세요:</Label>
                            <div className="grid grid-cols-3 gap-4 mt-2">
                                <button onClick={() => setSelectedStyle('동양화')} className={`p-4 border-2 rounded-lg text-center ${selectedStyle === '동양화' ? 'border-indigo-600' : 'hover:border-slate-400'}`}>담백한 동양화</button>
                                <button onClick={() => setSelectedStyle('일러스트')} className={`p-4 border-2 rounded-lg text-center ${selectedStyle === '일러스트' ? 'border-indigo-600' : 'hover:border-slate-400'}`}>따뜻한 일러스트</button>
                                <button onClick={() => setSelectedStyle('사진')} className={`p-4 border-2 rounded-lg text-center ${selectedStyle === '사진' ? 'border-indigo-600' : 'hover:border-slate-400'}`}>감성적인 사진</button>
                            </div>
                        </div>
                        <div>
                            <Label>2. 문구를 직접 수정하세요:</Label>
                            <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={4} className="mt-2"/>
                        </div>
                        <Button onClick={handleGenerate} disabled={!greeting.trim()} className="w-full">
                            <SparklesIcon className="w-5 h-5 mr-2" /> AI 이미지 생성하기
                        </Button>
                    </div>
                )}
                 {step === 'previewSelection' && (
                     <div>
                         <h3 className="font-bold text-lg mb-4">마음에 드는 시안을 선택하세요.</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {previews.map((base64, index) => (
                                <div key={index} className="aspect-[4/5] bg-slate-200 rounded-lg overflow-hidden cursor-pointer group relative" onClick={() => handleSelectPreview(base64)}>
                                    <img src={`data:image/png;base64,${base64}`} alt={`시안 ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold">이 디자인 선택</span>
                                    </div>
                                </div>
                            ))}
                         </div>
                     </div>
                )}
            </div>
        </Modal>
    );
};