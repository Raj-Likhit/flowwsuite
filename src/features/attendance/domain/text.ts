export const MAX_TEXT_LENGTH = 100;

/**
 * Strips angle brackets, caps the length and trims user-entered free text.
 * React already escapes output; this keeps stored values tidy and predictable.
 */
export function sanitizeText(input: string, maxLength: number = MAX_TEXT_LENGTH): string {
    return input.replace(/[<>]/g, '').slice(0, maxLength).trim();
}
