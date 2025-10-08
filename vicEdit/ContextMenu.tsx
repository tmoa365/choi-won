import React, { useEffect, useRef } from 'react';
import { AllLayer } from '../types';

export type ContextMenuTarget = 'layer' | 'canvas';

interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  selectedLayers: AllLayer[];
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onOrderChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
  onAiAction: (action: 'removeBackground' | 'suggestFont') => void;
  onFitToScreen: () => void;
  onZoomTo100: () => void;
  onGroup: () => void;
  onUngroup: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = (props) => {
  const { x, y, target, selectedLayers, onClose, onCopy, onPaste, onDelete, onOrderChange, onAiAction, onFitToScreen, onZoomTo100, onGroup, onUngroup } = props;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const handleAction = (action: () => void) => {
    action();
    onClose();
  }

  const canRemoveBackground = selectedLayers.length === 1 && 'assetId' in selectedLayers[0] && selectedLayers[0].id !== 'background';
  const canSuggestFont = selectedLayers.length === 1 && 'content' in selectedLayers[0];
  const canGroup = selectedLayers.length > 1 && selectedLayers.every(l => !l.groupId);
  const canUngroup = selectedLayers.length > 0 && !!selectedLayers[0].groupId && selectedLayers.every(l => l.groupId === selectedLayers[0].groupId);

  const renderLayerMenu = () => (
    <>
      {(canRemoveBackground || canSuggestFont) && (
            <>
                {canRemoveBackground && <button onClick={() => handleAction(() => onAiAction('removeBackground'))} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">AI 배경 제거</button>}
                {canSuggestFont && <button onClick={() => handleAction(() => onAiAction('suggestFont'))} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">AI 글꼴 추천</button>}
                <div className="my-1 h-px bg-slate-200" />
            </>
      )}
      {canGroup && <button onClick={() => handleAction(onGroup)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">그룹 만들기</button>}
      {canUngroup && <button onClick={() => handleAction(onUngroup)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">그룹 해제</button>}
      {(canGroup || canUngroup) && <div className="my-1 h-px bg-slate-200" />}
      <button onClick={() => handleAction(onCopy)} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 disabled:text-slate-400">복사</button>
      <button onClick={() => handleAction(onPaste)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">붙여넣기</button>
      <div className="my-1 h-px bg-slate-200" />
      <button onClick={() => handleAction(() => onOrderChange('forward'))} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 disabled:text-slate-400">앞으로 가져오기</button>
      <button onClick={() => handleAction(() => onOrderChange('backward'))} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 disabled:text-slate-400">뒤로 보내기</button>
      <button onClick={() => handleAction(() => onOrderChange('front'))} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 disabled:text-slate-400">맨 앞으로 가져오기</button>
      <button onClick={() => handleAction(() => onOrderChange('back'))} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 hover:bg-slate-100 disabled:text-slate-400">맨 뒤로 보내기</button>
      <div className="my-1 h-px bg-slate-200" />
      <button onClick={() => handleAction(onDelete)} disabled={selectedLayers.length === 0} className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:text-slate-400">삭제</button>
    </>
  );

  const renderCanvasMenu = () => (
    <>
        <button onClick={() => handleAction(onPaste)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">붙여넣기</button>
        <div className="my-1 h-px bg-slate-200" />
        <button onClick={() => handleAction(onFitToScreen)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">화면에 맞추기</button>
        <button onClick={() => handleAction(onZoomTo100)} className="w-full text-left px-3 py-1.5 hover:bg-slate-100">실제 크기 (100%)</button>
    </>
  );


  return (
    <div
      ref={menuRef}
      className="absolute z-[100] bg-white rounded-md shadow-lg border border-slate-200 text-sm w-48 py-1"
      style={{ top: y, left: x }}
    >
        {target === 'layer' ? renderLayerMenu() : renderCanvasMenu()}
    </div>
  );
};
