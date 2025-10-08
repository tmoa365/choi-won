/**
 * @deprecated This file is no longer used and can be safely deleted.
 * Its functionality has been integrated into `vicEdit/InspectorPanel.tsx`.
 */
import React from 'react';
// FIX: Import DesignType to be used in the AiAction type definition.
import { DesignType } from '../types';

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
    | { type: 'extractColors', layerId: string }
    // FIX: Add 'remixPage' and 'adaptPage' to the AiAction type to resolve comparability errors.
    | { type: 'remixPage' }
    | { type: 'adaptPage', targetType: DesignType };

export const AiAssistantModal: React.FC = () => {
    return null;
};