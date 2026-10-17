// =============================================================================
// COMPONENT — DropZone
// Persistent file ingestion area shown when no document is loaded.
// Accepts: PDF files, JPEG, PNG.
// Supports: click-to-browse, drag-and-drop, multi-file drop.
//
// PROPS:
//   onFilesAccepted: (files: File[]) => void
//     Called with valid files after type/size validation.
//
// DESIGN SPEC:
//   - Full-center layout within a rounded dashed border (border-dashed, border-white/20)
//   - Icon: FileUp from lucide-react (large, animated pulse on drag-over)
//   - Title: "Drop your PDFs here" (text-2xl font-black)
//   - Subtitle: "or click to browse · PDF, JPEG, PNG" (text-white/40 text-sm)
//   - Drag-over state: border turns primary color, background brightens
//   - Error state: shake animation + red border for invalid file types
//   - Use the existing `glass-new` CSS class for the container background
// =============================================================================

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void;
}

import { validateFile } from '../../utils/fileValidation';

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAccepted }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles drag-enter and drag-over events.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    setHasError(false);
  }, []);

  /**
   * Handles drag-leave event.
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const invalidMessages: string[] = [];

    for (const file of files) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else if (result.message) {
        invalidMessages.push(result.message);
      }
    }

    if (validFiles.length === 0) {
      setHasError(true);
      if (invalidMessages.length === 1) {
        toast.error(invalidMessages[0]);
      } else {
        toast.error('No valid files found. Please upload PDF, JPEG, PNG, or WEBP files under 50MB.');
      }
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (invalidMessages.length > 0) {
      toast.warning(`Accepted ${validFiles.length} file(s). Skipped ${invalidMessages.length} invalid file(s).`);
    }

    onFilesAccepted(validFiles);
  }, [onFilesAccepted]);

  /**
   * Handles file drop event.
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);

  /**
   * Handles file selection via the hidden <input type="file">.
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    
    // Reset input so the same files can be selected again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [processFiles]);

  return (
    <motion.div
      variants={{
        idle: { x: 0 },
        shake: { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } }
      }}
      animate={hasError ? "shake" : "idle"}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'glass-new rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300',
        'flex flex-col items-center justify-center gap-4 p-16 w-full max-w-2xl text-center',
        isDragOver ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' : 'border-white/20 hover:border-white/40 hover:bg-white/5',
        hasError ? 'border-red-500/60 bg-red-500/5' : '',
      ].join(' ')}
      role="button"
      tabIndex={0}
      aria-label="Upload PDF or image files"
    >
      <motion.div
        animate={{ y: isDragOver ? -10 : 0, scale: isDragOver ? 1.1 : 1 }}
        className="p-4 bg-white/5 rounded-full mb-2"
      >
        <FileUp className={`w-10 h-10 ${isDragOver ? 'text-primary-400' : 'text-white/60'} transition-colors`} />
      </motion.div>

      <div>
        <h2 className="text-2xl font-black text-white mb-2">Drop PDFs or images here</h2>
        <p className="text-white/40 text-sm font-medium">or click to browse · PDF, JPG, PNG, WEBP</p>
      </div>

      <button className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all">
        Browse Files
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />
    </motion.div>
  );
};
