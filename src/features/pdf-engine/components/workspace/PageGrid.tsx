// =============================================================================
// COMPONENT — PageGrid
// Renders all pages as a responsive thumbnail grid with drag-to-reorder support.
// Uses @dnd-kit/core (DndContext, SortableContext) + @dnd-kit/sortable.
//
// DESIGN SPEC:
//   - Responsive grid: 3 cols on mobile, 4 on tablet, 6 on desktop
//   - Grid gap: 16px (gap-4)
//   - Uses <PageThumbnail> for each page
//   - Empty area above grid: "Add more pages" drop zone strip
//   - DnD: vertical + horizontal strategy using rectSortingStrategy
// =============================================================================

import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { usePdfStore } from '../../store/usePdfStore';
import { PageThumbnail } from './PageThumbnail';

export const PageGrid: React.FC = () => {
  const {
    pages,
    overlays,
    selectedPageIds,
    reorderPages,
    deletePage,
    rotatePage,
    togglePageSelection,
    openEditor,
  } = usePdfStore();

  /**
   * Configure DnD sensors for both pointer (desktop) and touch (mobile).
   * TODO: Tune activation constraints if needed.
   *   PointerSensor: activationConstraint: { distance: 8 }  (prevent accidental drag on click)
   *   TouchSensor: activationConstraint: { delay: 250, tolerance: 5 }
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const fromIndex = pages.findIndex(p => p.id === active.id);
      const toIndex = pages.findIndex(p => p.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderPages(fromIndex, toIndex);
      }
    }
  }, [pages, reorderPages]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={pages.map(p => p.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          aria-label="PDF pages grid"
        >
          {pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              pageNumber={index + 1}
              isSelected={selectedPageIds.has(page.id)}
              previewDataUrl={overlays.find((overlay) => overlay.pageId === page.id)?.previewDataUrl}
              onSelect={togglePageSelection}
              onRotateCw={(id) => rotatePage(id, 'cw')}
              onRotateCcw={(id) => rotatePage(id, 'ccw')}
              onDelete={deletePage}
              onEdit={openEditor}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
