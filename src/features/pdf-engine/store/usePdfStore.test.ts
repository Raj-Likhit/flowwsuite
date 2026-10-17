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

  it('rotatePage rotates the page correctly, swaps width/height, and wraps around 360', () => {
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 400, heightPt: 300, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page]);

    usePdfStore.getState().rotatePage('p1', 'cw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(90);
    expect(usePdfStore.getState().pages[0].widthPt).toBe(300);
    expect(usePdfStore.getState().pages[0].heightPt).toBe(400);

    usePdfStore.getState().rotatePage('p1', 'ccw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(0);
    expect(usePdfStore.getState().pages[0].widthPt).toBe(400);
    expect(usePdfStore.getState().pages[0].heightPt).toBe(300);

    usePdfStore.getState().rotatePage('p1', 'ccw');
    expect(usePdfStore.getState().pages[0].rotation).toBe(270);
    expect(usePdfStore.getState().pages[0].widthPt).toBe(300);
    expect(usePdfStore.getState().pages[0].heightPt).toBe(400);
    
    // Test ignoring other pages
    const page2: PdfPage = { id: 'p2', sourceId: 's1', sourceType: 'pdf', originalIndex: 1, currentIndex: 1, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page, page2]);
    usePdfStore.getState().rotatePage('p1', 'cw');
    expect(usePdfStore.getState().pages[1].rotation).toBe(0);
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

  it('reorderPages moves page correctly', () => {
    const page1: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    const page2: PdfPage = { id: 'p2', sourceId: 's1', sourceType: 'pdf', originalIndex: 1, currentIndex: 1, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page1, page2]);

    usePdfStore.getState().reorderPages(0, 1);
    expect(usePdfStore.getState().pages[0].id).toBe('p2');
    expect(usePdfStore.getState().pages[1].id).toBe('p1');
  });

  it('deletePage removes page and overlay and unselects', () => {
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page]);
    usePdfStore.getState().togglePageSelection('p1');
    usePdfStore.getState().setOverlay('p1', { type: 'rect' });

    usePdfStore.getState().deletePage('p1');
    expect(usePdfStore.getState().pages).toHaveLength(0);
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(false);
    expect(usePdfStore.getState().overlays).toHaveLength(0);
  });

  it('deleteSelectedPages removes all selected pages', () => {
    const page1: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    const page2: PdfPage = { id: 'p2', sourceId: 's1', sourceType: 'pdf', originalIndex: 1, currentIndex: 1, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page1, page2]);
    
    usePdfStore.getState().togglePageSelection('p1');
    usePdfStore.getState().setOverlay('p1', { type: 'rect' });
    
    usePdfStore.getState().deleteSelectedPages();
    expect(usePdfStore.getState().pages).toHaveLength(1);
    expect(usePdfStore.getState().pages[0].id).toBe('p2');
    expect(usePdfStore.getState().selectedPageIds.size).toBe(0);
    expect(usePdfStore.getState().overlays).toHaveLength(0);
  });

  it('setPageThumbnail updates thumbnail', () => {
    const page: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page]);
    
    usePdfStore.getState().setPageThumbnail('p1', 'data:image/png;base64,...');
    expect(usePdfStore.getState().pages[0].thumbnailDataUrl).toBe('data:image/png;base64,...');
    
    // Ignored page
    usePdfStore.getState().setPageThumbnail('p2', 'data:image/png;base64,...');
    expect(usePdfStore.getState().pages[0].thumbnailDataUrl).toBe('data:image/png;base64,...');
  });

  it('selection methods work', () => {
    const page1: PdfPage = { id: 'p1', sourceId: 's1', sourceType: 'pdf', originalIndex: 0, currentIndex: 0, widthPt: 100, heightPt: 100, rotation: 0, isSelected: false, thumbnailDataUrl: null };
    usePdfStore.getState().setPages([page1]);
    
    usePdfStore.getState().togglePageSelection('p1');
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(true);
    usePdfStore.getState().togglePageSelection('p1');
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(false);
    
    usePdfStore.getState().selectAllPages();
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(true);
    
    usePdfStore.getState().clearSelection();
    expect(usePdfStore.getState().selectedPageIds.has('p1')).toBe(false);
  });

  it('editor methods work', () => {
    usePdfStore.getState().openEditor('p1');
    expect(usePdfStore.getState().activeEditorPageId).toBe('p1');
    expect(usePdfStore.getState().activeTool).toBe('select');
    
    usePdfStore.getState().setActiveTool(('draw'));
    expect(usePdfStore.getState().activeTool).toBe(('draw'));
    
    usePdfStore.getState().closeEditor();
    expect(usePdfStore.getState().activeEditorPageId).toBeNull();
  });

  it('overlay methods work', () => {
    usePdfStore.getState().setOverlay('p1', { type: 'rect' }, 'data:preview');
    expect(usePdfStore.getState().overlays).toHaveLength(1);
    expect(usePdfStore.getState().overlays[0].fabricJson).toEqual({ type: 'rect' });
    expect(usePdfStore.getState().overlays[0].previewDataUrl).toBe('data:preview');
    
    // Update existing
    usePdfStore.getState().setOverlay('p1', { type: 'circle' });
    expect(usePdfStore.getState().overlays).toHaveLength(1);
    expect(usePdfStore.getState().overlays[0].fabricJson).toEqual({ type: 'circle' });
    expect(usePdfStore.getState().overlays[0].previewDataUrl).toBe('data:preview'); // unchanged preview

    usePdfStore.getState().clearOverlay('p1');
    expect(usePdfStore.getState().overlays).toHaveLength(0);
  });

  it('UI methods work', () => {
    usePdfStore.getState().setLoading(true, 'loading docs');
    expect(usePdfStore.getState().isLoading).toBe(true);
    expect(usePdfStore.getState().loadingMessage).toBe('loading docs');
    
    usePdfStore.getState().setLoading(false); // test default message
    expect(usePdfStore.getState().isLoading).toBe(false);
    expect(usePdfStore.getState().loadingMessage).toBe('');
    
    usePdfStore.getState().setError('error message');
    expect(usePdfStore.getState().error).toBe('error message');
  });

  it('metadata methods work', () => {
    usePdfStore.getState().updateMetadata({ title: 'New Title' });
    expect(usePdfStore.getState().metadata.title).toBe('New Title');
    expect(usePdfStore.getState().metadata.author).toBe(''); // unchanged
  });
});
