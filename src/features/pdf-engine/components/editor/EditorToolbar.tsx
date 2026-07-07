// =============================================================================
// COMPONENT — EditorToolbar
// Tool selection sidebar (vertical on desktop, horizontal strip on mobile).
// Each tool button sets the active tool in Zustand store.
//
// PROPS:
//   orientation: 'vertical' | 'horizontal'
//
// TOOLS:
//   - Select (MousePointer2) — default, move/resize/select objects
//   - Text (Type) — click canvas to add IText
//   - Draw (Pen) — freehand brush mode (opens DrawTool sub-panel on click)
//   - Image (ImagePlus) — opens ImageOverlay / file picker
//   - Signature (PenTool) — opens SignaturePad modal
//   - Eraser (Eraser) — delete active selection mode
//
// DESIGN SPEC:
//   - Vertical: fixed 56px wide column, bg glass-strong, border-r border-white/5
//   - Horizontal: full-width strip, bg glass-strong, border-t border-white/5
//   - Active tool: bg-primary-500/20 ring-1 ring-primary-500/40, icon in primary color
//   - Inactive: bg-white/5 hover:bg-white/10, icon in text-white/40
//   - Tooltip on hover (title attribute or CSS tooltip)
// =============================================================================

import React, { useState } from 'react';
import {
  MousePointer2, Type, Pen, ImagePlus, PenTool, Eraser,
} from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';
import type { EditorTool } from '../../types/pdf.types';
import { SignaturePad } from './SignaturePad';
import { ImageOverlay } from './ImageOverlay';

interface EditorToolbarProps {
  orientation: 'vertical' | 'horizontal';
  onAddImage?: (dataUrl: string) => void;
  onStamp?: (dataUrl: string) => void;
  onDeleteSelected?: () => void;
}

interface ToolItem {
  id: EditorTool;
  icon: React.ReactNode;
  label: string;
  /** If true, clicking opens a panel/modal rather than just setting the tool */
  hasPanel?: boolean;
}

const TOOLS: ToolItem[] = [
  { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Select' },
  { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Text' },
  { id: 'draw', icon: <Pen className="w-5 h-5" />, label: 'Draw', hasPanel: true },
  { id: 'image', icon: <ImagePlus className="w-5 h-5" />, label: 'Image', hasPanel: true },
  // Signature is a special case — handled via the 'draw' or custom tool
  // TODO: Decide if signature gets its own tool slot or lives in the draw panel
  { id: 'eraser', icon: <Eraser className="w-5 h-5" />, label: 'Eraser' },
];

export const EditorToolbar = React.memo(({
  orientation,
  onAddImage,
  onStamp,
  onDeleteSelected,
}: EditorToolbarProps) => {
  const activeTool = usePdfStore(state => state.activeTool);
  const setActiveTool = usePdfStore(state => state.setActiveTool);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showImageOverlay, setShowImageOverlay] = useState(false);

  const handleToolClick = (tool: ToolItem) => {
    setActiveTool(tool.id);
    if (tool.id === 'image') setShowImageOverlay(true);
  };

  const baseButtonClass = `
    flex flex-col items-center justify-center gap-1 transition-all rounded-xl
    ${orientation === 'vertical' ? 'w-10 h-10' : 'w-12 h-12'}
  `;

  const activeClass = 'bg-primary-500/20 ring-1 ring-primary-500/40 text-primary-400';
  const inactiveClass = 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white';

  const containerClass = orientation === 'vertical'
    ? 'hidden md:flex flex-col items-center gap-2 py-4 px-2 glass-strong border-r border-white/5 w-14'
    : 'flex flex-row items-center justify-around py-2 px-4 glass-strong border-t border-white/5 overflow-x-auto';

  return (
    <>
      <div className={containerClass} role="toolbar" aria-label="Editor tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className={`${baseButtonClass} ${activeTool === tool.id ? activeClass : inactiveClass}`}
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
          >
            {tool.icon}
            {orientation === 'horizontal' && (
              <span className="text-[9px] font-black uppercase tracking-widest">{tool.label}</span>
            )}
          </button>
        ))}

        {/* Signature button — always opens SignaturePad modal */}
        <button
          onClick={() => setShowSignaturePad(true)}
          className={`${baseButtonClass} ${inactiveClass}`}
          title="Signature"
          aria-label="Add signature"
        >
          <PenTool className="w-5 h-5" />
          {orientation === 'horizontal' && (
            <span className="text-[9px] font-black uppercase tracking-widest">Sign</span>
          )}
        </button>
      </div>

      {/* Panels */}
      {showSignaturePad && (
        <SignaturePad
          onClose={() => setShowSignaturePad(false)}
          onStamp={(dataUrl) => {
            onStamp?.(dataUrl);
            setShowSignaturePad(false);
          }}
        />
      )}
      {showImageOverlay && (
        <ImageOverlay
          onClose={() => setShowImageOverlay(false)}
          onAddImage={(dataUrl) => {
            onAddImage?.(dataUrl);
            setShowImageOverlay(false);
            setActiveTool('select');
          }}
        />
      )}
    </>
  );
});
