import { describe, it, expect, vi } from 'vitest';
import { serializeFabricCanvas, fabricPathToSvgString } from './fabricSerializer';
import type { Canvas } from 'fabric';

describe('fabricSerializer', () => {
    describe('serializeFabricCanvas', () => {
        it('should serialize canvas to object with width and height', () => {
            const mockCanvas = {
                width: 800,
                height: 600,
                toObject: vi.fn().mockReturnValue({ objects: [] })
            } as unknown as Canvas;

            const result = serializeFabricCanvas(mockCanvas);

            expect(mockCanvas.toObject).toHaveBeenCalledWith([
                'type', 'left', 'top', 'scaleX', 'scaleY', 'angle',
                'fill', 'stroke', 'strokeWidth', 'text', 'fontFamily', 'fontSize',
                'fontWeight', 'fontStyle', 'src', 'path'
            ]);
            expect(result).toEqual({
                objects: [],
                canvasWidth: 800,
                canvasHeight: 600
            });
        });
    });

    describe('fabricPathToSvgString', () => {
        it('should return empty string if pathData is null or undefined', () => {
            expect(fabricPathToSvgString(null as any)).toBe('');
            expect(fabricPathToSvgString(undefined as any)).toBe('');
        });

        it('should return empty string if pathData is not an array', () => {
            expect(fabricPathToSvgString('M 0 0' as any)).toBe('');
        });

        it('should serialize path arrays correctly', () => {
            const pathData = [
                ['M', 0, 0],
                ['L', 10, 10],
                ['Z']
            ] as Array<Array<string | number>>;

            const result = fabricPathToSvgString(pathData);
            expect(result).toBe('M 0 0 L 10 10 Z');
        });
    });
});
