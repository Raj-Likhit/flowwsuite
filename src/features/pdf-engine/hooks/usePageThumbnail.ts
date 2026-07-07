// =============================================================================
// HOOK — usePageThumbnail
// Lazy-loads a PDF page thumbnail using IntersectionObserver.
// The thumbnail is only rendered when the page card enters the viewport.
//
// USAGE:
//   const { cardRef, thumbnailDataUrl, isRendering } = usePageThumbnail(page);
//
// HOW IT WORKS:
//   1. We attach an IntersectionObserver to the card DOM element.
//   2. When the card enters the viewport AND thumbnailDataUrl is null,
//      we call renderThumbnailOnDemand() from usePdfDocument.
//   3. Once rendered, the store is updated and the thumbnail appears.
//   4. The observer disconnects after the first render to avoid repeat work.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePdfStore } from '../store/usePdfStore';
import { usePdfDocument } from './usePdfDocument';
import type { PdfPage } from '../types/pdf.types';

interface UsePageThumbnailResult {
  /** Ref to attach to the page card DOM element */
  cardRef: React.RefObject<HTMLDivElement | null>;
  /** True while the thumbnail is being rendered */
  isRendering: boolean;
}

export function usePageThumbnail(page: PdfPage): UsePageThumbnailResult {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const hasTriggeredRef = useRef(false);
  const { renderThumbnailOnDemand } = usePdfDocument();

  // We read thumbnailDataUrl directly from the store (not from props) so we can
  // detect when it has been set and skip a re-render trigger.
  const thumbnailDataUrl = usePdfStore(
    useCallback(
      (state) => state.pages.find((p) => p.id === page.id)?.thumbnailDataUrl ?? null,
      [page.id]
    )
  );

  useEffect(() => {
    // Skip blank pages and image pages — they don't need lazy PDF rendering.
    if (page.sourceType !== 'pdf') return;
    // Already have a thumbnail — nothing to do.
    if (thumbnailDataUrl !== null) return;
    // Already triggered a render for this page in this mount cycle.
    if (hasTriggeredRef.current) return;

    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (hasTriggeredRef.current) return;

        // Double-check store in case render completed between observer firing
        // and this callback executing.
        const currentDataUrl = usePdfStore
          .getState()
          .pages.find((p) => p.id === page.id)?.thumbnailDataUrl;
        if (currentDataUrl) {
          observer.disconnect();
          return;
        }

        hasTriggeredRef.current = true;
        observer.disconnect();

        setIsRendering(true);
        renderThumbnailOnDemand(page.sourceId, page.id, page.originalIndex).finally(() => {
          setIsRendering(false);
        });
      },
      {
        // Start rendering when card is within 200px of the viewport
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [page.id, page.sourceId, page.originalIndex, page.sourceType, thumbnailDataUrl, renderThumbnailOnDemand]);

  return { cardRef, isRendering };
}
