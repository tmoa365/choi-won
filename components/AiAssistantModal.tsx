import React from 'react';

// This component is no longer used as its functionality has been integrated
// directly into the InspectorPanel for a better user experience.
// It is being stubbed out to avoid compilation errors in case of any lingering imports,
// and can be safely deleted.

export type AiAction = 
    | { type: 'refinePage', prompt: string }
    | { type: 'refineText', layerId: string, prompt: string }
    | { type: 'suggestFont', layerId: string }
    | { type: 'removeBackground', layerId: string }
    | { type: 'smartCrop', layerId: string }
    | { type: 'generateAltText', layerId: string }
    | { type: 'extractColors', layerId: string };

export const AiAssistantModal: React.FC = () => {
    return null;
};
