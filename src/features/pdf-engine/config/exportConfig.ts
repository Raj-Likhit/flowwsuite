import type { ExportOptions } from '../types/pdf.types';

export const COMPRESSED_EXPORT_PRESET = {
  imageQuality: 0.58,
  maxDimensionPx: 1600,
} as const;

export const EXPORT_FILENAMES = {
  standardSuffix: 'edited',
  compressedSuffix: 'compressed',
} as const;

export function createCompressedExportOptions(
  overrides: Partial<NonNullable<ExportOptions['compression']>> = {}
): ExportOptions {
  return {
    compression: {
      enabled: true,
      ...COMPRESSED_EXPORT_PRESET,
      ...overrides,
    },
  };
}

export function getExportFilename(baseTitle: string | undefined, options: ExportOptions = {}) {
  const suffix = options.compression?.enabled
    ? EXPORT_FILENAMES.compressedSuffix
    : EXPORT_FILENAMES.standardSuffix;

  return `${baseTitle || 'flowwsuite-document'}_${suffix}.pdf`;
}
