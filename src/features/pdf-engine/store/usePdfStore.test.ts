import { describe, it, expect, beforeEach } from 'vitest';
import { usePdfStore } from './usePdfStore';
import type { PdfSource, PdfPage } from '../types/pdf.types';

describe('usePdfStore', () => {
  beforeEach(() => {
    usePdfStore.getState().clearAll();
  });

  it('addSource appends a new source', () => {
    const source: PdfSource = { id: 's1', file: new File([], 'test.pdf'), name: 'test.pdf', type: 'pdf', pageCount: 1, mimeType: 'application/pdf', arrayBuffer: new ArrayBuffer(0), pdfDocument: null };
    usePdfStore.getState().addSource(source);
    expect(usePdfStore.getState().sources).toHaveLength(1);
    expect(usePdfStore.getState().sources[0].id).toBe('s1');
  });

  it('removeSource removes the source, its pages, and its overlays', () => {
    const source: PdfSource = { id: 's1', file: new File([], 'test.pdf'), name: 'test.pdf', type: 'pdf', pageCount: 1, mimeType: 'application/pdf', arrayBuffer: new ArrayBuffer(0), pdfDocument: null };
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: true, thumbnailDataUrl: null };
    
    usePdfStore.getState().addSource(source);
    usePdfStore.getState().setPages([page]);
    usePdfStore.getState().togglePageSelection('p1');
    usePdfStore.getState().setOverlay('p1', { type: 'rect' });

    expect(usePdfStore.getState().sources).toHaveLength(1);
    expect(usePdfStore.getState().pages).toHaveLength(1);
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(true);
    expect(usePdfStore.getState().overlays).toHaveLength(1);

    usePdfStore.getState().removeSource('s1');

    expect(usePdfStore.getState().sources).toHaveLength(0);
    expect(usePdfStore.getState().pages).toHaveLength(0);
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(false);
    expect(usePdfStore.getState().overlays).toHaveLength(0);
  });

  it('rotatePage rotates the page correctly and wraps around 360', () => {
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page]);

    usePdfStore.getState().rotatePage('p1', 'cw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(90);

    usePdfStore.getState().rotatePage('p1', 'ccw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(0);

    usePdfStore.getState().rotatePage('p1', 'ccw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(270);
  });

  it('insertBlankPage inserts a blank page at the correct index', () => {
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page]);

    usePdfStore.getState().insertBlankPage(1, 500, 600);
    
    const state = usePdfStore.getState();
    expect(state.pages).toHaveLength(2);
    expect(state.pages[1].sourceType).toBe('blank');
    expect(state.pages[1].widthPt).toBe(500);
    expect(state.pages[1].heightPt).toBe(600);
  });
});
