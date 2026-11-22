export const MAX_PHOTO_BYTES = 500_000;

export type BioPhoto = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

export function sniffImage(bytes: Uint8Array): BioPhoto['contentType'] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function decodeBase64(value: string): Uint8Array | null {
  const clean = value.replace(/\s/g, '');
  if (clean.length === 0 || clean.length > 800_000 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(clean)) return null;
  const padded = clean.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(clean.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

/** Null means no photo. Throws a short message the player can read. */
export function acceptPhoto(input: unknown): BioPhoto | null {
  if (input == null) return null;
  if (typeof input !== 'object') throw new Error('That photo could not be read.');
  const data = (input as { data?: unknown }).data;
  if (typeof data !== 'string' || data.trim().length === 0) throw new Error('That photo could not be read.');
  const bytes = decodeBase64(data);
  if (!bytes) throw new Error('That photo could not be read.');
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error('That photo is too large. Use one under 500KB.');
  const contentType = sniffImage(bytes);
  if (!contentType) throw new Error('Use a JPEG, PNG, or WebP photo.');
  return { contentType, data: data.replace(/\s/g, '') };
}
