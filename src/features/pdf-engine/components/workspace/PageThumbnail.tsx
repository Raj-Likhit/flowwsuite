// =============================================================================
// COMPONENT — PageThumbnail
// Renders a single page thumbnail in the grid.
// Shows the rendered page image (or a loading skeleton if not yet rendered).
// On hover: shows rotate CW, rotate CCW, delete, edit buttons.
// Shows a selection checkbox (top-left corner).
// Draggable via @dnd-kit/sortable (use `useSortable` hook).
//
// PROPS: See PageThumbnailProps below.
//
// DESIGN SPEC:
//   - Card: rounded-xl, glass-new background, overflow-hidden
//   - Thumbnail image: object-contain, aspect ratio matches page (use CSS aspect-ratio)
//   - Loading skeleton: animate-pulse, bg-white/5
//   - Hover overlay: dark bg-black/60 with action buttons centered
//   - Selected state: ring-2 ring-primary-500
//   - Rotation: apply CSS transform: rotate(Ndeg) to the image
//   - Page number badge: bottom-center, text-[10px] font-black
// =============================================================================

import React, { useCallback } from 'react';
import { RotateCw, RotateCcw, Trash2, Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PdfPage } from '../../types/pdf.types';
import { usePageThumbnail } from '../../hooks/usePageThumbnail';

interface PageThumbnailProps {
  page: PdfPage;
  pageNumber: number;
  isSelected: boolean;
  previewDataUrl?: string;
  onSelect: (id: string) => void;
  onRotateCw: (id: string) => void;
  onRotateCcw: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const PageThumbnail = React.memo(({
  page,
  pageNumber,
  isSelected,
  previewDataUrl,
  onSelect,
  onRotateCw,
  onRotateCcw,
  onDelete,
  onEdit,
}: PageThumbnailProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Lazy thumbnail loading: renders only when the card enters the viewport.
  const { cardRef, isRendering } = usePageThumbnail(page);

  // Merge the dnd-kit node ref and the IntersectionObserver ref.
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      // eslint-disable-next-line react-hooks/immutability
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [setNodeRef, cardRef]
  );

  return (
    <div
      ref={mergedRef}
      style={style}
      {...attributes}
      className={[
        'group relative rounded-xl overflow-hidden glass-new border transition-all cursor-grab active:cursor-grabbing',
        isSelected ? 'border-primary-500 ring-2 ring-primary-500/40' : 'border-white/10 hover:border-white/30',
      ].join(' ')}
    >
      {/* Drag Handle + Thumbnail */}
      <div {...listeners} className="aspect-[3/4] relative flex items-center justify-center bg-black/20">
        {page.sourceId === 'blank' ? (
          // Blank page — show clean white surface
          <div className="w-full h-full bg-white flex items-center justify-center">
            <span className="text-[10px] font-black text-black/20 uppercase tracking-widest select-none">Blank</span>
          </div>
        ) : (previewDataUrl || page.thumbnailDataUrl) ? (
          <img
            src={previewDataUrl || page.thumbnailDataUrl || ''}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-contain"
            style={{ transform: `rotate(${page.rotation}deg)` }}
            draggable={false}
          />
        ) : (
          // Loading skeleton — shown while thumbnail hasn't rendered yet.
          // isRendering = actively rendering now; otherwise waiting for scroll-into-view.
          <div className={`w-full h-full bg-white/5 ${isRendering ? 'animate-pulse' : ''}`}>
            {isRendering && (
              <div className="absolute inset-0 flex items-end justify-center pb-2">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                  Rendering…
                </span>
              </div>
            )}
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRotateCcw(page.id); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            aria-label="Rotate counter-clockwise"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(page.id); }}
            className="p-2 bg-primary-500/20 hover:bg-primary-500/40 rounded-lg text-primary-400 transition-colors"
            aria-label="Edit page"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRotateCw(page.id); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            aria-label="Rotate clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-400 transition-colors"
            aria-label="Delete page"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selection Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(page.id); }}
        className="absolute top-2 left-2 w-5 h-5 rounded border border-white/30 bg-black/40 flex items-center justify-center transition-colors hover:border-primary-500"
        aria-label={isSelected ? 'Deselect page' : 'Select page'}
        aria-pressed={isSelected}
      >
        {isSelected && <div className="w-2.5 h-2.5 rounded-sm bg-primary-500" />}
      </button>

      {/* Page Number */}
      <div className="py-2 text-center">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          {pageNumber}
        </span>
      </div>
    </div>
  );
});
