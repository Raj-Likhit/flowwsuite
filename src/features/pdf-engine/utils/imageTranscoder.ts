// =============================================================================
// UTILITY — IMAGE TRANSCODER
// Ensures image bytes are compatible with pdf-lib (PNG or JPEG only).
// Converts WebP and unsupported image formats to PNG using Canvas/ImageBitmap APIs.
// =============================================================================

export interface TranscodedImageResult {
  bytes: Uint8Array;
  isPng: boolean;
}

export function dataUrlToBytes(dataUrl: string): { mimeType: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) throw new Error('Unsupported embedded image data');

  const [, mimeType, isBase64, payload] = match;
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { mimeType: mimeType.toLowerCase(), bytes };
}

/**
 * Validates whether byte stream has JPEG SOI header (0xFF, 0xD8).
 */
export function isJpegBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * Validates whether byte stream has PNG signature (0x89, 0x50, 0x4E, 0x47).
 */
export function isPngBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/**
 * Transcodes arbitrary image bytes (e.g. image/webp) to PNG format.
 */
export async function transcodeToPng(bytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const byteBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(byteBuffer).set(bytes);
  const blob = new Blob([byteBuffer], { type: mimeType });

  // In environments with createImageBitmap (browser and Web Worker)
  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function') {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Canvas 2D context unavailable for image transcoding');
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await pngBlob.arrayBuffer());
  }

  // Fallback for standard HTML Canvas in main thread if available
  if (typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((convertedBlob) => {
          if (!convertedBlob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          convertedBlob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to decode image of type: ${mimeType}`));
      };
      img.src = url;
    });
  }

  throw new Error('Image transcoding APIs unavailable in current runtime');
}

/**
 * Ensures image bytes are ready for pdf-lib (either valid PNG or JPEG).
 * If the image is WebP or any non-JPEG/PNG format, converts it to PNG.
 */
export async function ensurePngOrJpgBytes(
  bytes: Uint8Array,
  mimeType: string
): Promise<TranscodedImageResult> {
  const cleanMime = mimeType.toLowerCase();
  const isJpgMime = cleanMime.includes('jpeg') || cleanMime.includes('jpg');
  const isPngMime = cleanMime.includes('png');

  // Fast path: valid JPEG signature
  if (isJpgMime && isJpegBytes(bytes)) {
    return { bytes, isPng: false };
  }

  // Fast path: valid PNG signature
  if (isPngMime && isPngBytes(bytes)) {
    return { bytes, isPng: true };
  }

  // Transcode WebP or non-standard bytes to PNG
  const transcoded = await transcodeToPng(bytes, cleanMime || 'image/webp');
  return { bytes: transcoded, isPng: true };
}
