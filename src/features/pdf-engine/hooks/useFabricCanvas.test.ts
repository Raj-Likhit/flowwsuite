// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFabricCanvas } from './useFabricCanvas';
import { usePdfStore } from '../store/usePdfStore';

// Mock zustand store
vi.mock('../store/usePdfStore', () => ({
    usePdfStore: Object.assign(
        vi.fn(),
        {
            getState: vi.fn(),
            setState: vi.fn(),
            subscribe: vi.fn(),
        }
    )
}));

// Mock fabric
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockRenderAll = vi.fn();
const mockDispose = vi.fn();
const mockGetActiveObject = vi.fn();
const mockGetActiveObjects = vi.fn(() => []);
const mockSetActiveObject = vi.fn();
const mockDiscardActiveObject = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockLoadFromJSON = vi.fn((json, cb) => cb());
let mockToJSONValue = { version: '1.0', objects: [], canvasWidth: 800, canvasHeight: 600 };
const mockToJSON = vi.fn(() => mockToJSONValue);
const mockToDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
const mockGetObjects = vi.fn(() => [{ selectable: false, evented: false, id: 'mock-obj', set: vi.fn(), setCoords: vi.fn() }]);
const mockGetScenePoint = vi.fn(() => ({ x: 10, y: 10 }));
const mockCalcOffset = vi.fn();
const mockRequestRenderAll = vi.fn();

vi.mock('fabric', () => {
    class MockCanvas {
        add = mockAdd;
        remove = mockRemove;
        renderAll = mockRenderAll;
        dispose = mockDispose;
        getActiveObject = mockGetActiveObject;
        getActiveObjects = mockGetActiveObjects;
        setActiveObject = mockSetActiveObject;
        discardActiveObject = mockDiscardActiveObject;
        on = mockOn;
        off = mockOff;
        loadFromJSON = mockLoadFromJSON;
        toJSON = mockToJSON;
        toDataURL = mockToDataURL;
        getObjects = mockGetObjects;
        getScenePoint = mockGetScenePoint;
        calcOffset = mockCalcOffset;
        requestRenderAll = mockRequestRenderAll;
        width = 800;
        height = 600;
        selection = true;
        isDrawingMode = false;
        defaultCursor = 'default';
    }

    class MockPencilBrush {
        constructor() {}
    }
    
    class MockIText {
        enterEditing = vi.fn();
        selectAll = vi.fn();
        constructor() {}
    }

    return {
        __esModule: true,
        Canvas: MockCanvas,
        PencilBrush: MockPencilBrush,
        IText: MockIText,
        Image: {
            fromURL: vi.fn((url, opts) => {
                // If callback based (like setBackground might use?)
                // wait, setBackground uses .then() for promise version or callback?
                // fromURL in fabric v6 returns a promise
                const img = {
                    width: 100,
                    height: 100,
                    getScaledWidth: () => 100,
                    getScaledHeight: () => 100,
                    set: vi.fn(),
                    scaleToWidth: vi.fn(),
                    left: 0,
                    top: 0
                };
                return Promise.resolve(img);
            })
        }
    };
});

describe('useFabricCanvas', () => {
    let mockSetOverlay: any;
    let mockSetActiveTool: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockToJSONValue = { version: '1.0', objects: [], canvasWidth: 800, canvasHeight: 600 };
        
        mockSetOverlay = vi.fn();
        mockSetActiveTool = vi.fn();
        
        // Setup default store state
        (usePdfStore as any).mockReturnValue({
            setOverlay: mockSetOverlay,
            activeTool: 'select',
            overlays: [],
            setActiveTool: mockSetActiveTool,
        });

        (usePdfStore.getState as any).mockReturnValue({
            setOverlay: mockSetOverlay,
            activeTool: 'select',
            overlays: [],
            setActiveTool: mockSetActiveTool,
        });
        
        // Mock requestAnimationFrame for initCanvas
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0);
            return 0;
        });
    });

    it('should initialize canvas correctly without existing overlay', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        expect(result.current.fabricRef.current).toBeDefined();
        expect(mockOn).toHaveBeenCalledWith('object:added', expect.any(Function));
        expect(mockOn).toHaveBeenCalledWith('object:modified', expect.any(Function));
        expect(mockOn).toHaveBeenCalledWith('object:removed', expect.any(Function));
    });

    it('should initialize canvas and load existing overlay', () => {
        const existingOverlay = { version: '1.0', objects: [], canvasWidth: 800, canvasHeight: 600 };
        
        (usePdfStore.getState as any).mockReturnValue({
            overlays: [{ pageId: 'page-1', fabricJson: existingOverlay }]
        });

        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            // Use different size to trigger scale logic
            result.current.initCanvas(1600, 1200);
        });

        expect(mockLoadFromJSON).toHaveBeenCalledWith(existingOverlay, expect.any(Function));
    });

    it('should handle object events and mark as dirty', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        // Find the event handler for object:added
        const addHandlerCall = mockOn.mock.calls.find(call => call[0] === 'object:added');
        expect(addHandlerCall).toBeDefined();
        
        const saveToStore = addHandlerCall![1];
        
        act(() => {
            // Mutate so it detects a change
            mockToJSONValue = { ...mockToJSONValue, version: '1.2' };
            // Trigger saveToStore (markDirty: true)
            saveToStore();
        });
        
        expect(result.current.isDirty).toBe(true);
        expect(mockSetOverlay).toHaveBeenCalled();
    });

    it('should dispose previous canvas on re-initialization', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });
        
        act(() => {
            result.current.initCanvas(800, 600);
        });

        expect(mockDispose).toHaveBeenCalledTimes(1);
    });

    it('should set background image correctly', async () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        await act(async () => {
            result.current.setBackground('http://example.com/image.jpg');
        });

        expect(result.current.fabricRef.current!.backgroundImage).toBeDefined();
        expect(result.current.fabricRef.current!.backgroundColor).toBe('#ffffff');
    });

    it('should clear background when null is passed', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        act(() => {
            result.current.setBackground(null);
        });

        expect(result.current.fabricRef.current!.backgroundImage).toBeUndefined();
        expect(result.current.fabricRef.current!.backgroundColor).toBe('#ffffff');
    });

    it('should handle setTool modes correctly', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        act(() => {
            result.current.setTool('draw');
        });
        
        expect(result.current.fabricRef.current!.isDrawingMode).toBe(true);

        act(() => {
            result.current.setTool('select');
        });

        expect(result.current.fabricRef.current!.selection).toBe(true);
        expect(result.current.fabricRef.current!.defaultCursor).toBe('default');

        act(() => {
            result.current.setTool('text');
        });

        expect(result.current.fabricRef.current!.defaultCursor).toBe('text');
        expect(mockOn).toHaveBeenCalledWith('mouse:down', expect.any(Function));
        
        act(() => {
            result.current.setTool('image');
        });
        
        expect(result.current.fabricRef.current!.defaultCursor).toBe('crosshair');

        act(() => {
            result.current.setTool('eraser');
        });
        
        expect(result.current.fabricRef.current!.defaultCursor).toBe('crosshair');
    });

    it('should handle saveChanges correctly', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        mockGetActiveObject.mockReturnValueOnce({
            isEditing: true,
            exitEditing: vi.fn(),
            setCoords: vi.fn(),
        });

        let saved = false;
        act(() => {
            saved = result.current.saveChanges();
        });

        expect(saved).toBe(true);
        expect(mockSetOverlay).toHaveBeenCalled();
    });
    
    it('should handle createPreviewDataUrl error gracefully', () => {
        mockToDataURL.mockImplementationOnce(() => { throw new Error('DataURL Error'); });
        
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        let saved = false;
        act(() => {
            saved = result.current.saveChanges();
        });

        expect(saved).toBe(true);
        // previewDataUrl should be undefined
        expect(mockSetOverlay).toHaveBeenCalledWith('page-1', expect.anything(), undefined);
    });

    it('should add image correctly', async () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        await act(async () => {
            await result.current.addImage('data:image/png;base64,...');
        });

        expect(mockAdd).toHaveBeenCalled();
        expect(mockSetActiveObject).toHaveBeenCalled();
    });
    
    it('should handle addImage error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // Mock fromURL to throw
        const MockImage = (await import('fabric')).Image;
        const origFromURL = MockImage.fromURL;
        MockImage.fromURL = vi.fn().mockRejectedValueOnce(new Error('Image failed'));
        
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        await act(async () => {
            await result.current.addImage('data:image/png;base64,...');
        });

        expect(consoleSpy).toHaveBeenCalledWith('Failed to add image to canvas', expect.any(Error));
        
        // Restore
        MockImage.fromURL = origFromURL;
        consoleSpy.mockRestore();
    });

    it('should delete selected objects', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        mockGetActiveObjects.mockReturnValueOnce([{ id: '1' }]);
        
        act(() => {
            result.current.deleteSelected();
        });

        expect(mockRemove).toHaveBeenCalled();
        expect(mockDiscardActiveObject).toHaveBeenCalled();
    });

    it('should handle undo and redo properly', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });

        // Trigger a save to populate undo stack
        act(() => {
            mockToJSONValue = { ...mockToJSONValue, version: '1.1' };
            // First time it has changes vs initial state, so it pushes to undo stack
            result.current.saveChanges(); 
        });

        act(() => {
            result.current.undo();
        });

        expect(mockLoadFromJSON).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.redo();
        });

        expect(mockLoadFromJSON).toHaveBeenCalledTimes(2);
    });

    it('should test addTextBox handler', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });
        
        // Find the mouse:down handler for addTextBox
        const onCalls = mockOn.mock.calls;
        let mouseDownHandler: any = null;
        for (let call of onCalls) {
            if (call[0] === 'mouse:down') {
                mouseDownHandler = call[1];
            }
        }
        
        // Simulate setTool('text')
        act(() => {
            result.current.setTool('text');
        });
        
        // Grab handler again after setTool
        for (let call of mockOn.mock.calls) {
            if (call[0] === 'mouse:down') {
                mouseDownHandler = call[1];
            }
        }

        if (mouseDownHandler) {
            act(() => {
                mouseDownHandler({ e: new MouseEvent('mousedown') });
            });
            
            expect(mockAdd).toHaveBeenCalled();
            expect(mockSetActiveTool).toHaveBeenCalledWith('select');
        }
    });

    it('should handle unmount correctly', () => {
        const canvasRef = { current: document.createElement('canvas') };
        const { unmount } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        unmount();
        // Since we didn't init, it won't dispose
        
        // Now init and unmount
        const { result, unmount: unmount2 } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));
        act(() => {
            result.current.initCanvas(800, 600);
        });
        
        unmount2();
        expect(mockDispose).toHaveBeenCalled();
    });
    
    it('should react to activeTool changes', () => {
        const canvasRef = { current: document.createElement('canvas') };
        
        let currentActiveTool = 'select';
        (usePdfStore as any).mockImplementation(() => ({
            setOverlay: mockSetOverlay,
            activeTool: currentActiveTool,
            overlays: [],
            setActiveTool: mockSetActiveTool,
        }));
        
        const { result, rerender } = renderHook(() => useFabricCanvas(canvasRef, 'page-1'));

        act(() => {
            result.current.initCanvas(800, 600);
        });
        
        expect(result.current.fabricRef.current!.selection).toBe(true);
        
        // Change tool and rerender
        currentActiveTool = 'draw';
        rerender();
        
        expect(result.current.fabricRef.current!.isDrawingMode).toBe(true);
    });
});
