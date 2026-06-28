// =============================================================================
// COMPONENT — ImageOverlay
// Modal/panel for adding image stamps, logos, or watermarks to the canvas.
// Supports:
//   - Click-to-browse file picker (PNG, JPEG, WEBP)
//   - Drag-and-drop onto the modal area
//
// After an image is selected, it is added to the Fabric.js canvas
// via useFabricCanvas().addImage(dataUrl).
//
// PROPS:
//   onClose: () => void
//
// DESIGN SPEC:
//   - Same modal shell as SignaturePad (fixed overlay, glass-strong card)
//   - Drop area inside the modal: dashed border, ImagePlus icon
//   - After image is loaded, preview the image + "Add to Canvas" button
//   - No explicit size/position control here — user resizes on canvas after placing
// =============================================================================

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ImagePlus } from 'lucide-react';

interface ImageOverlayProps {
  onClose: () => void;
  onAddImage?: (dataUrl: string) => void;
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({ onClose, onAddImage }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = useCallback((file: File): void => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      readFileAsDataUrl(file);
    }
  }, [readFileAsDataUrl]);

  /**
   * Adds the previewed image to the Fabric canvas.
   * Calls onAddImage(previewUrl) which is wired to useFabricCanvas().addImage() in the parent.
   */
  const handleAddToCanvas = useCallback(() => {
    if (!previewUrl) return;
    onAddImage?.(previewUrl);
    onClose();
  }, [previewUrl, onAddImage, onClose]);

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
        className="glass-strong rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white">Add Image</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Drop / Preview Area */}
        {!previewUrl ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              'rounded-xl border-2 border-dashed cursor-pointer transition-all',
              'flex flex-col items-center justify-center gap-3 h-40',
              isDragOver ? 'border-primary-500 bg-primary-500/5' : 'border-white/20 hover:border-white/40',
            ].join(' ')}
          >
            <ImagePlus className="w-8 h-8 text-white/30" />
            <p className="text-xs text-white/40">Drop an image or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFileAsDataUrl(file);
              }}
              aria-label="Select image file"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-white/20 bg-black/30 flex items-center justify-center h-40">
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-xs font-bold transition-all"
              >
                Change
              </button>
              <button
                onClick={handleAddToCanvas}
                className="flex-1 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Add to Canvas
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
