export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface FileValidationResult {
  valid: boolean;
  error?: 'empty' | 'too_large' | 'unsupported_type';
  message?: string;
}

/**
 * Validates a file against allowed types, extensions, and size constraints.
 */
export function validateFile(file: File): FileValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      error: 'empty',
      message: `"${file.name}" is an empty file (0 bytes).`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: 'too_large',
      message: `"${file.name}" (${sizeMb}MB) exceeds the 50MB size limit.`,
    };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const hasValidMime = ACCEPTED_TYPES.includes(file.type);
  const hasValidExt = ACCEPTED_EXTENSIONS.includes(extension);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: 'unsupported_type',
      message: `"${file.name}" is not a supported file format. Use PDF, JPEG, PNG, or WEBP.`,
    };
  }

  return { valid: true };
}
