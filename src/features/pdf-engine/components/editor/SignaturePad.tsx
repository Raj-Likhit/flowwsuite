// =============================================================================
// COMPONENT — SignaturePad
// A modal for drawing a freehand signature using an HTML canvas.
// After signing, user can save it to localStorage and/or stamp it on the canvas.
//
// PROPS:
//   onClose: () => void
//   onStamp?: (dataUrl: string) => void  ← if provided, stamps signature on editor canvas
//
// DESIGN SPEC:
//   - Modal overlay (fixed inset-0 bg-black/60 backdrop-blur-sm)
//   - Inner card: glass-strong max-w-md rounded-2xl p-6
//   - Canvas: white background (#ffffff), 380px × 180px drawing area
//   - Toolbar: Clear button (left), Save + Stamp button (right)
//   - Saved signatures list below the canvas: small preview thumbnails
//     Clicking a saved signature stamps it without re-drawing
//   - "Clear" resets the drawing canvas
//   - "Save & Stamp": saves to localStorage and calls onStamp(dataUrl)
//
// IMPLEMENTATION NOTES:
//   - Use a plain <canvas> element with PointerEvents API (not Fabric.js)
//     This canvas is for DRAWING ONLY, separate from the editor canvas.
//   - Track `isDrawing` with useRef (mousedown/touchstart sets true, mouseup sets false)
//   - Use requestAnimationFrame or direct canvas 2D context for drawing
//   - Convert to data URL via canvas.toDataURL('image/png')
// =============================================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Save } from 'lucide-react';
import { useSignatureStore } from '../../hooks/useSignatureStore';

interface SignaturePadProps {
  onClose: () => void;
  onStamp?: (dataUrl: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onClose, onStamp }) => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { signatures, saveSignature } = useSignatureStore();

  /**
   * Sets up the drawing canvas 2D context and pointer event listeners.
   *
   * TODO: Implement.
   *
   * Events to handle on the draw canvas:
   *   - pointerdown: set isDrawing=true, ctx.beginPath(), ctx.moveTo(x, y)
   *   - pointermove: if isDrawing, ctx.lineTo(x, y), ctx.stroke(), setIsEmpty(false)
   *   - pointerup / pointerleave: set isDrawing=false
   *
   * Canvas context settings:
   *   ctx.strokeStyle = '#000000'
   *   ctx.lineWidth = 2.5
   *   ctx.lineCap = 'round'
   *   ctx.lineJoin = 'round'
   *
   * Note on coordinates:
   *   Subtract canvas.getBoundingClientRect().left/top from event.clientX/Y
   *   to get canvas-relative coordinates (handles CSS scaling).
   */
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      isDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Draw a dot if just clicking
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const onPointerUp = (e: PointerEvent) => {
      isDrawing.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, []);

  const handleClear = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const handleSaveAndStamp = useCallback(() => {
    const dataUrl = drawCanvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      saveSignature(dataUrl);
      onStamp?.(dataUrl);
      onClose();
    }
  }, [saveSignature, onStamp, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white">Draw Signature</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Drawing Canvas */}
        <div className="rounded-xl overflow-hidden border border-white/20 mb-4">
          <canvas
            ref={drawCanvasRef}
            width={380}
            height={180}
            className="block w-full touch-none cursor-crosshair"
            aria-label="Signature drawing area"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={handleSaveAndStamp}
            disabled={isEmpty}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Save & Stamp
          </button>
        </div>

        {/* Saved Signatures */}
        {signatures.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Saved Signatures</p>
            <div className="flex gap-2 flex-wrap">
              {signatures.map((sig) => (
                <button
                  key={sig.id}
                  onClick={() => onStamp?.(sig.dataUrl)}
                  className="rounded-lg overflow-hidden border border-white/20 hover:border-primary-500 transition-all w-20 h-12 bg-white"
                  title="Stamp this signature"
                  aria-label="Use saved signature"
                >
                  <img src={sig.dataUrl} alt="Saved signature" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
