import React, { useState } from 'react';
import { ChevronDownIcon, XCircleIcon } from './icons';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white shadow-md rounded-xl p-6 md:p-8 ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; subtitle: string; icon: React.ReactNode }> = ({ title, subtitle, icon }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-lg p-3">{icon}</div>
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

export const Label: React.FC<{ htmlFor?: string; children: React.ReactNode, required?: boolean, className?: string }> = ({ htmlFor, children, required, className }) => (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-slate-700 mb-1 ${className || ''}`}>
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none ${props.className || ''}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm 
    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${props.className || ''}`} />
);

// Fix: Update Textarea to forward refs to the underlying textarea element.
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
  <textarea {...props} ref={ref} className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${props.className || ''}`} />
));
Textarea.displayName = "Textarea";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary', size?: 'sm' | 'md' }> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center border rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
  };
  const variantClasses = variant === 'primary' 
    ? 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-300' 
    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-indigo-500';
  return <button {...props} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses} ${className}`}>{children}</button>;
};

export const Accordion: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-t border-slate-200">
            <button onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center w-full py-4 text-left">
                <div className="flex items-center gap-3">
                    <span className="text-indigo-600">{icon}</span>
                    <span className="font-medium text-slate-800">{title}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-4">{children}</div>}
        </div>
    );
};

export const ToggleSwitch: React.FC<{ checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }> = ({ checked, onChange, className }) => {
    return (
      <label className={`relative inline-flex items-center cursor-pointer ${className || ''}`}>
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    );
};

export const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; size?: 'lg' | 'xl' | '2xl' | '3xl' | '4xl' }> = ({ children, title, onClose, size = '4xl' }) => {
    const sizeClasses = {
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white rounded-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><XCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
};