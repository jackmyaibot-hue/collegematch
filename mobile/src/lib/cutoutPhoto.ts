import type { BioPhoto } from '../data/photo';

export type PreparedPhoto = {
  image: HTMLImageElement | null;
  /** True when the background was removed. False means the original photo, framed on the card. */
  cutout: boolean;
};

type Remover = (image: string, config: Record<string, unknown>) => Promise<Blob>;

const IMGLY_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
const ONNX_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/+esm';

/**
 * Removes the photo background in the browser with @imgly/background-removal.
 * The photo is not uploaded. The library downloads its model on first use.
 * Native has no canvas cutout, so callers keep the original photo.
 */
export async function preparePlayerPhoto(
  photo: BioPhoto | null,
  onStatus?: (message: string) => void,
): Promise<PreparedPhoto> {
  if (!photo || typeof document === 'undefined') return { image: null, cutout: false };
  const original = await loadImage(`data:${photo.contentType};base64,${photo.data}`);
  if (!original) return { image: null, cutout: false };
  onStatus?.('Removing the background…');
  try {
    const remove = await loadRemover();
    const blob = await remove(`data:${photo.contentType};base64,${photo.data}`, {
      model: 'isnet_quint8',
      device: 'cpu',
      output: { format: 'image/png', type: 'foreground' },
      progress: (_key: string, current: number, total: number) => {
        if (total > 0) onStatus?.(`Removing the background… ${Math.min(99, Math.round((current / total) * 100))}%`);
      },
    });
    const cut = await loadImage(URL.createObjectURL(blob));
    const hardened = cut ? await hardenCutout(cut) : null;
    if (hardened && cornersAreClear(hardened)) return { image: hardened, cutout: true };
  } catch {
    // The card frames the original photo instead of showing a broken image.
  }
  return { image: original, cutout: false };
}

function loadRemover(): Promise<Remover> {
  const win = window as Window & { __cmRemoveBackground?: Remover };
  if (win.__cmRemoveBackground) return Promise.resolve(win.__cmRemoveBackground);
  return (async () => {
    const source = await fetch(IMGLY_URL).then((response) => {
      if (!response.ok) throw new Error('The background tool did not load.');
      return response.text();
    });
    const patched = source.replaceAll('"/npm/onnxruntime-web@1.21.0/+esm"', JSON.stringify(ONNX_URL));
    const blob = new Blob([patched], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<{ removeBackground?: Remover }>;
      const loaded = await importer(url);
      if (!loaded.removeBackground) throw new Error('The background tool did not load.');
      win.__cmRemoveBackground = loaded.removeBackground;
      return loaded.removeBackground;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Drops the hazy leftover background so the player reads as a clean cutout. */
function hardenCutout(image: HTMLImageElement): Promise<HTMLImageElement | null> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return Promise.resolve(image);
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;
  for (let index = 3; index < pixels.length; index += 4) {
    pixels[index] = pixels[index] < 170 ? 0 : 255;
  }
  keepLargest(pixels, canvas.width, canvas.height);
  ctx.putImageData(frame, 0, 0);
  return loadImage(canvas.toDataURL('image/png'));
}

/** Keeps the player and drops leftover specks from the background. */
function keepLargest(pixels: Uint8ClampedArray, width: number, height: number): void {
  const count = width * height;
  const solid = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) solid[index] = pixels[index * 4 + 3] > 0 ? 1 : 0;
  const joined = dilate(solid, width, height, 10);
  const seen = new Uint8Array(count);
  const stack: number[] = [];
  let bestStart = -1;
  let bestSize = 0;
  for (let start = 0; start < count; start += 1) {
    if (!joined[start] || seen[start]) continue;
    let size = 0;
    let seed = start;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop() ?? 0;
      size += 1;
      if (solid[index]) seed = index;
      const x = index % width;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= count || seen[next] || !joined[next]) continue;
        const nextX = next % width;
        if (Math.abs(nextX - x) > 1) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestStart = seed;
    }
  }
  if (bestStart < 0) return;
  seen.fill(0);
  stack.push(bestStart);
  seen[bestStart] = 1;
  const keep = new Uint8Array(count);
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    keep[index] = 1;
    const x = index % width;
    const neighbors = [index - 1, index + 1, index - width, index + width];
    for (const next of neighbors) {
      if (next < 0 || next >= count || seen[next] || !joined[next]) continue;
      const nextX = next % width;
      if (Math.abs(nextX - x) > 1) continue;
      seen[next] = 1;
      stack.push(next);
    }
  }
  for (let index = 0; index < count; index += 1) {
    if (solid[index] && !keep[index]) pixels[index * 4 + 3] = 0;
  }
}

function dilate(solid: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const across = new Uint8Array(solid.length);
  const down = new Uint8Array(solid.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dx = -radius; dx <= radius && !on; dx += 1) {
        const next = x + dx;
        if (next >= 0 && next < width && solid[y * width + next]) on = 1;
      }
      across[y * width + x] = on;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy += 1) {
        const next = y + dy;
        if (next >= 0 && next < height && across[next * width + x]) on = 1;
      }
      down[y * width + x] = on;
    }
  }
  return down;
}

function cornersAreClear(image: HTMLImageElement): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(image, 0, 0);
  const spots = [
    [2, 2],
    [image.width - 3, 2],
    [2, image.height - 3],
    [image.width - 3, image.height - 3],
  ];
  return spots.every(([x, y]) => {
    const pixel = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data;
    return pixel[3] < 40;
  });
}
