import React from 'react';
import { Input } from './ui';
import { EyedropperIcon } from './icons';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    onActivateEyedropper: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, onActivateEyedropper }) => {
    return (
        <div className="flex items-center gap-2">
            <div className="relative w-9 h-9">
                <Input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer"
                    title="색상 선택"
                />
            </div>
            <Input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="flex-grow h-9"
            />
            <button
                onClick={onActivateEyedropper}
                className="p-2 bg-slate-200 rounded-md hover:bg-slate-300"
                title="스포이드"
            >
                <EyedropperIcon className="w-5 h-5 text-slate-600" />
            </button>
        </div>
    );
};