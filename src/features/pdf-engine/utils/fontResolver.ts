// =============================================================================
// UTILITY — FONT RESOLVER
// Maps CSS/Fabric text properties (family, weight, style) to standard PDF fonts.
// Supports caching embedded fonts on PDFDocument to minimize document size.
// =============================================================================

import { StandardFonts, type PDFDocument, type PDFFont } from 'pdf-lib';

export interface TextStyleOptions {
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
}

/**
 * Maps CSS/Fabric font attributes to the closest StandardFonts enum value.
 */
export function resolveStandardFont(options?: TextStyleOptions): StandardFonts {
  const family = String(options?.fontFamily || '').toLowerCase();
  const weight = String(options?.fontWeight || '').toLowerCase();
  const style = String(options?.fontStyle || '').toLowerCase();

  const isBold = weight === 'bold' || Number(weight) >= 700;
  const isItalic = style === 'italic' || style === 'oblique';

  if (family.includes('times') || family.includes('serif')) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (family.includes('courier') || family.includes('mono') || family.includes('code')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  // Default to Helvetica family (covers sans-serif, Arial, Inter, Roboto, etc.)
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/**
 * Embeds or retrieves a cached StandardFont on a PDFDocument.
 */
export async function getOrEmbedStandardFont(
  doc: PDFDocument,
  cache: Map<StandardFonts, PDFFont>,
  options?: TextStyleOptions
): Promise<PDFFont> {
  const fontName = resolveStandardFont(options);
  let font = cache.get(fontName);
  if (!font) {
    font = await doc.embedFont(fontName);
    cache.set(fontName, font);
  }
  return font;
}
