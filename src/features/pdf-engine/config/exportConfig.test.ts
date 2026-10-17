import { describe, it, expect } from 'vitest';
import {
    COMPRESSED_EXPORT_PRESET,
    EXPORT_FILENAMES,
    createCompressedExportOptions,
    getExportFilename,
} from './exportConfig';

describe('exportConfig', () => {
    it('defines COMPRESSED_EXPORT_PRESET and EXPORT_FILENAMES constants', () => {
        expect(COMPRESSED_EXPORT_PRESET.imageQuality).toBe(0.58);
        expect(COMPRESSED_EXPORT_PRESET.maxDimensionPx).toBe(1600);
        expect(EXPORT_FILENAMES.standardSuffix).toBe('edited');
        expect(EXPORT_FILENAMES.compressedSuffix).toBe('compressed');
    });

    it('creates default compressed export options', () => {
        const opts = createCompressedExportOptions();
        expect(opts).toEqual({
            compression: {
                enabled: true,
                imageQuality: 0.58,
                maxDimensionPx: 1600,
            },
        });
    });

    it('creates compressed export options with custom overrides', () => {
        const opts = createCompressedExportOptions({
            imageQuality: 0.8,
            maxDimensionPx: 2000,
        });
        expect(opts).toEqual({
            compression: {
                enabled: true,
                imageQuality: 0.8,
                maxDimensionPx: 2000,
            },
        });
    });

    it('generates standard export filename when compression is disabled or unspecified', () => {
        expect(getExportFilename('my-contract')).toBe('my-contract_edited.pdf');
        expect(getExportFilename('')).toBe('flowwsuite-document_edited.pdf');
        expect(getExportFilename(undefined, { })).toBe('flowwsuite-document_edited.pdf');
        expect(getExportFilename('doc', { compression: { enabled: false, imageQuality: 0.8, maxDimensionPx: 1000 } })).toBe('doc_edited.pdf');
    });

    it('generates compressed export filename when compression is enabled', () => {
        expect(getExportFilename('annual-report', { compression: { enabled: true, imageQuality: 0.8, maxDimensionPx: 1000 } })).toBe('annual-report_compressed.pdf');
        expect(getExportFilename(undefined, { compression: { enabled: true, imageQuality: 0.8, maxDimensionPx: 1000 } })).toBe('flowwsuite-document_compressed.pdf');
    });
});
