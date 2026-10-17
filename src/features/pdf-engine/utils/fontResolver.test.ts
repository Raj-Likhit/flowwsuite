import { describe, it, expect, vi } from 'vitest';
import { StandardFonts, type PDFDocument, type PDFFont } from 'pdf-lib';
import { resolveStandardFont, getOrEmbedStandardFont } from './fontResolver';

describe('fontResolver utility', () => {
  describe('resolveStandardFont', () => {
    it('defaults to Helvetica for unspecified font', () => {
      expect(resolveStandardFont()).toBe(StandardFonts.Helvetica);
      expect(resolveStandardFont({})).toBe(StandardFonts.Helvetica);
    });

    it('resolves Helvetica variants (sans-serif, Arial)', () => {
      expect(resolveStandardFont({ fontFamily: 'Arial' })).toBe(StandardFonts.Helvetica);
      expect(resolveStandardFont({ fontFamily: 'Helvetica', fontWeight: 'bold' })).toBe(
        StandardFonts.HelveticaBold
      );
      expect(resolveStandardFont({ fontFamily: 'Inter', fontWeight: 700 })).toBe(
        StandardFonts.HelveticaBold
      );
      expect(resolveStandardFont({ fontFamily: 'Helvetica', fontStyle: 'italic' })).toBe(
        StandardFonts.HelveticaOblique
      );
      expect(
        resolveStandardFont({ fontFamily: 'Helvetica', fontWeight: 'bold', fontStyle: 'italic' })
      ).toBe(StandardFonts.HelveticaBoldOblique);
    });

    it('resolves Times Roman variants', () => {
      expect(resolveStandardFont({ fontFamily: 'Times New Roman' })).toBe(StandardFonts.TimesRoman);
      expect(resolveStandardFont({ fontFamily: 'serif' })).toBe(StandardFonts.TimesRoman);
      expect(resolveStandardFont({ fontFamily: 'Times', fontWeight: 'bold' })).toBe(
        StandardFonts.TimesRomanBold
      );
      expect(resolveStandardFont({ fontFamily: 'Times', fontStyle: 'italic' })).toBe(
        StandardFonts.TimesRomanItalic
      );
      expect(
        resolveStandardFont({ fontFamily: 'Times', fontWeight: 'bold', fontStyle: 'italic' })
      ).toBe(StandardFonts.TimesRomanBoldItalic);
    });

    it('resolves Courier / Monospace variants', () => {
      expect(resolveStandardFont({ fontFamily: 'Courier' })).toBe(StandardFonts.Courier);
      expect(resolveStandardFont({ fontFamily: 'monospace' })).toBe(StandardFonts.Courier);
      expect(resolveStandardFont({ fontFamily: 'Courier', fontWeight: 'bold' })).toBe(
        StandardFonts.CourierBold
      );
      expect(resolveStandardFont({ fontFamily: 'Courier', fontStyle: 'italic' })).toBe(
        StandardFonts.CourierOblique
      );
      expect(
        resolveStandardFont({ fontFamily: 'Courier', fontWeight: 800, fontStyle: 'oblique' })
      ).toBe(StandardFonts.CourierBoldOblique);
    });
  });

  describe('getOrEmbedStandardFont', () => {
    it('embeds font on doc and caches subsequent requests', async () => {
      const mockFont = { name: 'mock-font' } as unknown as PDFFont;
      const mockEmbedFont = vi.fn().mockResolvedValue(mockFont);
      const mockDoc = { embedFont: mockEmbedFont } as unknown as PDFDocument;
      const cache = new Map<StandardFonts, PDFFont>();

      const font1 = await getOrEmbedStandardFont(mockDoc, cache, { fontFamily: 'Times' });
      expect(font1).toBe(mockFont);
      expect(mockEmbedFont).toHaveBeenCalledWith(StandardFonts.TimesRoman);
      expect(mockEmbedFont).toHaveBeenCalledTimes(1);

      // Second call with same font should hit cache
      const font2 = await getOrEmbedStandardFont(mockDoc, cache, { fontFamily: 'Times New Roman' });
      expect(font2).toBe(mockFont);
      expect(mockEmbedFont).toHaveBeenCalledTimes(1);
    });
  });
});
