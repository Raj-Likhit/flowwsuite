import { describe, it, expect } from 'vitest';
import { sanitizeWinAnsiText } from './pdf.compile.worker';

describe('pdf.compile.worker - Export Fidelity & WinAnsi Sanitization', () => {
  it('preserves clean ASCII text without changes', () => {
    const input = 'Hello World! Standard text 12345.';
    expect(sanitizeWinAnsiText(input)).toBe(input);
  });

  it('replaces curly smart quotes with straight quotes', () => {
    const input = '“Hello” and ‘World’';
    expect(sanitizeWinAnsiText(input)).toBe('"Hello" and \'World\'');
  });

  it('replaces em-dash and en-dash with standard hyphen', () => {
    const input = 'Section A–B — Full Overview';
    expect(sanitizeWinAnsiText(input)).toBe('Section A-B - Full Overview');
  });

  it('replaces bullets, ellipsis, and non-breaking spaces', () => {
    const input = '• Item 1… Next\u00A0Word';
    expect(sanitizeWinAnsiText(input)).toBe('* Item 1... Next Word');
  });

  it('replaces non-WinAnsi unicode symbols with question mark fallback', () => {
    const input = 'Status: ✔ Passed ⚡ High';
    expect(sanitizeWinAnsiText(input)).toBe('Status: ? Passed ? High');
  });
});
