// =============================================================================
// HOOK — useFabricCanvas
// Manages the Fabric.js canvas lifecycle:
//   - Initialization on a given <canvas> element ref
//   - Tool mode switching (select, text, draw, image, eraser)
//   - Setting the PDF page as background image
//   - Undo/redo stack
//   - Serialization to store overlay on change
//   - Cleanup on unmount
//
// USAGE:
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const { initCanvas, setTool, setBackground } = useFabricCanvas(canvasRef, pageId);
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePdfStore } from '../store/usePdfStore';
import type { EditorTool } from '../types/pdf.types';
import * as fabric from 'fabric';

/**
 * Maximum undo history depth.
 */
const MAX_UNDO_STEPS = 30;

interface SerializedFabricCanvas {
  version?: string;
  objects?: unknown[];
  canvasWidth?: number;
  canvasHeight?: number;
}

interface FabricCanvasWithSerializableProps extends fabric.Canvas {
  toJSON(propertiesToInclude?: string[]): SerializedFabricCanvas;
}

interface EditableFabricObject extends fabric.Object {
  isEditing?: boolean;
  exitEditing?: () => void;
}

function serializeCanvas(canvas: fabric.Canvas): string {
  const json = (canvas as FabricCanvasWithSerializableProps).toJSON([
    'src',
    'crossOrigin',
    'text',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'fill',
    'stroke',
    'strokeWidth',
    'path',
  ]);

  return JSON.stringify({
    version: json.version,
    objects: json.objects ?? [],
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });
}

function getSavedCanvasDimensions(fabricJson: object, fallbackWidth: number, fallbackHeight: number) {
  const overlay = fabricJson as SerializedFabricCanvas;

  return {
    width: Number(overlay.canvasWidth) || fallbackWidth,
    height: Number(overlay.canvasHeight) || fallbackHeight,
  };
}

export function useFabricCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  pageId: string
) {
  const { setOverlay, activeTool } = usePdfStore();
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  /**
   * The Fabric.js Canvas instance. Created in initCanvas, destroyed in cleanup.
   */
  const fabricRef = useRef<fabric.Canvas | null>(null);

  /**
   * Undo history stack — each entry is a serialized canvas JSON string.
   */
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // Flag to prevent saveToStore during undo/redo operations
  const isRestoringRef = useRef(false);

  const createPreviewDataUrl = useCallback((canvas: fabric.Canvas): string | undefined => {
    try {
      return canvas.toDataURL({
        format: 'jpeg',
        quality: 0.86,
        multiplier: 0.45,
      });
    } catch (error) {
      console.warn('Could not create edited page preview', error);
      return undefined;
    }
  }, []);

  const persistCanvas = useCallback((options: {
    force?: boolean;
    markDirty?: boolean;
    previewDataUrl?: string;
  } = {}): boolean => {
    if (!fabricRef.current || isRestoringRef.current) return false;
    
    const canvas = fabricRef.current;
    const json = serializeCanvas(canvas);
    const hasChanged = undoStackRef.current.length === 0 || undoStackRef.current[undoStackRef.current.length - 1] !== json;
    
    if (hasChanged) {
      undoStackRef.current.push(json);
      if (undoStackRef.current.length > MAX_UNDO_STEPS) undoStackRef.current.shift();
      redoStackRef.current = [];
    }

    if (hasChanged || options.force) {
      setOverlay(pageId, JSON.parse(json), options.previewDataUrl);
    }

    if (options.markDirty) {
      setIsDirty(true);
    } else if (options.force || hasChanged) {
      setIsDirty(false);
      setLastSavedAt(Date.now());
    }

    return hasChanged || !!options.force;
  }, [pageId, setOverlay]);

  const saveToStore = useCallback((): void => {
    persistCanvas({ markDirty: true });
  }, [persistCanvas]);

  const saveChanges = useCallback((): boolean => {
    const canvas = fabricRef.current;
    if (!canvas) return false;

    const activeObject = canvas.getActiveObject() as EditableFabricObject | undefined;

    if (activeObject?.isEditing && activeObject.exitEditing) {
      activeObject.exitEditing();
    }

    activeObject?.setCoords();
    canvas.calcOffset();
    canvas.requestRenderAll();

    const previewDataUrl = createPreviewDataUrl(canvas);
    return persistCanvas({ force: true, previewDataUrl });
  }, [createPreviewDataUrl, persistCanvas]);

  const initCanvas = useCallback((width: number, height: number): void => {
    if (!canvasRef.current) return;
    setIsDirty(false);
    
    // Dispose previous instance if exists
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
    });
    
    fabricRef.current = canvas;
    canvas.calcOffset();
    requestAnimationFrame(() => canvas.calcOffset());

    const existingOverlay = usePdfStore
      .getState()
      .overlays
      .find((overlay) => overlay.pageId === pageId)?.fabricJson;

    if (existingOverlay) {
      isRestoringRef.current = true;
      canvas.loadFromJSON(existingOverlay, () => {
        const previousSize = getSavedCanvasDimensions(existingOverlay, width, height);
        const scaleX = width / previousSize.width;
        const scaleY = height / previousSize.height;

        if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
          canvas.getObjects().forEach((obj) => {
            obj.set({
              left: (obj.left ?? 0) * scaleX,
              top: (obj.top ?? 0) * scaleY,
              scaleX: (obj.scaleX ?? 1) * scaleX,
              scaleY: (obj.scaleY ?? 1) * scaleY,
            });
            obj.setCoords();
          });
        }

        canvas.requestRenderAll();
        isRestoringRef.current = false;
        setIsDirty(false);
        // Push initial state to undo stack
        undoStackRef.current = [serializeCanvas(canvas)];
      });
    } else {
      undoStackRef.current = [serializeCanvas(canvas)];
    }

    canvas.on('object:added', saveToStore);
    canvas.on('object:modified', saveToStore);
    canvas.on('object:removed', saveToStore);

    // Default brush settings
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = '#000000';
    canvas.freeDrawingBrush.width = 2;

  }, [canvasRef, pageId, saveToStore]);

  const setBackground = useCallback((imageSrc: string | null): void => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    // Blank page — clear any background image and fill white
    if (!imageSrc) {
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
      return;
    }

    fabric.Image.fromURL(imageSrc, { crossOrigin: 'anonymous' }).then((img) => {
      if (fabricRef.current !== canvas) return;

      const canvasWidth = canvas.width ?? 0;
      const canvasHeight = canvas.height ?? 0;
      const scaleX = canvasWidth / (img.width ?? 1);
      const scaleY = canvasHeight / (img.height ?? 1);

      img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX,
        scaleY,
        selectable: false,
        evented: false,
      });

      canvas.backgroundImage = img;
      canvas.backgroundColor = '#ffffff';
      canvas.calcOffset();

      canvas.requestRenderAll();
    });
  }, []);

  const addTextBox = useCallback((opt: any) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Only add if clicking on empty space
    if (opt.target && opt.target.type !== 'path') return;

    const text = new fabric.IText('Double click to edit', {
      left: opt.pointer?.x || 50,
      top: opt.pointer?.y || 50,
      fontFamily: 'Helvetica',
      fontSize: 24,
      fill: '#000000',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    saveToStore();
    
    // Switch back to select tool after adding text
    usePdfStore.getState().setActiveTool('select');
  }, [saveToStore]);

  const handleErase = useCallback((opt: any) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    // We only erase paths (pencil drawings) or text/images if the user clicks them in eraser mode.
    // The user requested "only erases the pencil drawings" like MS Paint, so we target paths.
    if (opt.target && opt.target.type === 'path') {
      canvas.remove(opt.target);
      saveToStore();
    }
  }, [saveToStore]);

  const setTool = useCallback((tool: EditorTool): void => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    canvas.off('mouse:down', addTextBox);
    canvas.off('mouse:down', handleErase);
    // Remove mouse:over listener by recreating it or clearing all mouse:over
    canvas.off('mouse:over');
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';
    canvas.getObjects().forEach((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });

    switch (tool) {
      case 'select':
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.getObjects().forEach((obj) => {
          obj.selectable = true;
          obj.evented = true;
        });
        break;
      case 'text':
        canvas.defaultCursor = 'text';
        canvas.on('mouse:down', addTextBox);
        break;
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 2;
        break;
      case 'image':
        canvas.defaultCursor = 'crosshair';
        break;
      case 'eraser':
        canvas.defaultCursor = 'crosshair';
        // Enable evented for paths so we can click them to erase
        canvas.getObjects().forEach((obj) => {
          if (obj.type === 'path') {
            obj.evented = true;
          }
        });
        canvas.on('mouse:down', handleErase);
        // Also support click-and-drag erasing
        canvas.on('mouse:over', (opt: any) => {
          if (opt.e.buttons === 1) handleErase(opt);
        });
        break;
    }
    canvas.renderAll();
  }, [addTextBox, handleErase]);

  const addImage = useCallback(async (dataUrl: string): Promise<void> => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    try {
      const img = await fabric.Image.fromURL(dataUrl);
      img.scaleToWidth(Math.min(img.width ?? 0, 300));
      
      // Center the image initially
      img.left = (canvas.width ?? 0) / 2 - (img.getScaledWidth() / 2);
      img.top = (canvas.height ?? 0) / 2 - (img.getScaledHeight() / 2);
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    } catch (e) {
      console.error('Failed to add image to canvas', e);
    }
  }, []);

  const undo = useCallback((): void => {
    if (!fabricRef.current || undoStackRef.current.length <= 1) return;
    
    const canvas = fabricRef.current;
    
    // Move current state to redo
    const currentState = undoStackRef.current.pop()!;
    redoStackRef.current.push(currentState);
    
    // Load previous state
    const prevState = undoStackRef.current[undoStackRef.current.length - 1];
    
    isRestoringRef.current = true;
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      isRestoringRef.current = false;
      setOverlay(pageId, JSON.parse(prevState));
      setIsDirty(true);
    });
  }, [pageId, setOverlay]);

  const redo = useCallback((): void => {
    if (!fabricRef.current || redoStackRef.current.length === 0) return;
    
    const canvas = fabricRef.current;
    
    // Pop from redo, push to undo
    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(nextState);
    
    isRestoringRef.current = true;
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      isRestoringRef.current = false;
      setOverlay(pageId, JSON.parse(nextState));
      setIsDirty(true);
    });
  }, [pageId, setOverlay]);

  const deleteSelected = useCallback((): void => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (fabricRef.current) {
      setTool(activeTool);
    }
  }, [activeTool, setTool]);

  return {
    fabricRef,
    initCanvas,
    setBackground,
    setTool,
    addImage,
    saveChanges,
    isDirty,
    lastSavedAt,
    undo,
    redo,
    deleteSelected,
  };
}
