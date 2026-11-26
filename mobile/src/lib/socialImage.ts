import { File as ExpoFile, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { SITE_QR, type SocialCard } from '../data/socialCard';
import type { BioPhoto } from '../data/photo';

export const STORY_SIZE = { width: 1080, height: 1920, file: 'story' } as const;
export const FEED_SIZE = { width: 1080, height: 1350, file: 'feed' } as const;
export type SocialSize = typeof STORY_SIZE | typeof FEED_SIZE;

const QR_SIZE = 29;

export async function renderSocialPng(card: SocialCard, photo: BioPhoto | null, size: SocialSize): Promise<Uint8Array> {
  if (typeof document === 'undefined') throw new Error('Saving the image works in the web app.');
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the image.');
  const image = photo ? await loadPhoto(photo) : null;
  drawCard(ctx, card, image, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not draw the image.');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function shareSocialPng(bytes: Uint8Array, filename: string): Promise<'shared' | 'downloaded'> {
  if (Platform.OS === 'web') return shareOnWeb(bytes, filename);
  const file = new ExpoFile(Paths.cache, filename);
  file.write(bytes);
  if (await isAvailableAsync()) {
    await shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Social profile' });
    return 'shared';
  }
  return 'downloaded';
}

async function shareOnWeb(bytes: Uint8Array, filename: string): Promise<'shared' | 'downloaded'> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: 'image/png' });
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'CollegeMatch' });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}

function loadPhoto(photo: BioPhoto): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `data:${photo.contentType};base64,${photo.data}`;
  });
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  card: SocialCard,
  photo: HTMLImageElement | null,
  width: number,
  height: number,
): void {
  const story = height >= 1600;
  ctx.fillStyle = '#0C3B2C';
  ctx.fillRect(0, 0, width, height);
  const mark = story ? 88 : 72;
  rounded(ctx, 72, story ? 72 : 56, mark, mark, 22);
  ctx.fillStyle = '#D8F26A';
  ctx.fill();
  ctx.fillStyle = '#0C3B2C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(mark * 0.36)}px Georgia, serif`;
  ctx.fillText('CM', 72 + mark / 2, (story ? 72 : 56) + mark / 2 + 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#F4F1EA';
  ctx.font = `700 ${story ? 40 : 34}px Georgia, serif`;
  ctx.fillText('CollegeMatch', 72 + mark + 22, (story ? 72 : 56) + mark / 2);

  const photoY = story ? 188 : 160;
  const photoH = story ? 1000 : 500;
  const photoW = width - 144;
  if (photo) {
    ctx.save();
    rounded(ctx, 72, photoY, photoW, photoH, 48);
    ctx.clip();
    cover(ctx, photo, 72, photoY, photoW, photoH);
    ctx.restore();
  } else {
    rounded(ctx, 72, photoY, photoW, photoH, 48);
    ctx.fillStyle = '#146C43';
    ctx.fill();
    ctx.fillStyle = '#D8F26A';
    ctx.textAlign = 'center';
    ctx.font = `700 ${story ? 160 : 120}px Georgia, serif`;
    ctx.fillText(initials(card.name), width / 2, photoY + photoH / 2);
  }

  let y = photoY + photoH + (story ? 92 : 64);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F4F1EA';
  const nameSize = fitSize(ctx, card.name, width - 144, story ? 84 : 64, 36);
  ctx.font = `700 ${nameSize}px Georgia, serif`;
  ctx.fillText(card.name, 72, y);
  y += story ? 52 : 40;
  ctx.fillStyle = '#D5E6DC';
  ctx.font = `${story ? 32 : 26}px sans-serif`;
  const meta = `${card.sport} · ${card.position}`;
  ctx.font = `${fitSize(ctx, meta, width - 144, story ? 32 : 26, 18)}px sans-serif`;
  ctx.fillText(meta, 72, y);
  y += story ? 42 : 34;
  const club = [`Class of ${card.gradYear}`, card.club].filter(Boolean).join(' · ');
  ctx.fillText(club, 72, y);
  y += story ? 36 : 28;

  const pills = [...card.stats];
  if (card.gpa) pills.push({ label: 'GPA', value: `GPA ${card.gpa}` });
  let x = 72;
  const pillH = story ? 64 : 52;
  for (const stat of pills.slice(0, 3)) {
    ctx.font = `700 ${story ? 26 : 22}px sans-serif`;
    const pillW = ctx.measureText(stat.value).width + 48;
    rounded(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.fillStyle = '#D8F26A';
    ctx.fill();
    ctx.fillStyle = '#0C3B2C';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.value, x + 24, y + pillH / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    x += pillW + 14;
  }

  const qr = story ? 200 : 150;
  const qrY = Math.min(y + pillH + (story ? 56 : 40), height - qr - 64);
  drawQr(ctx, 72, qrY, qr);
  const textX = 72 + qr + 32;
  ctx.fillStyle = '#F4F1EA';
  ctx.font = `700 ${story ? 40 : 32}px Georgia, serif`;
  ctx.fillText('Find your college match', textX, qrY + qr * 0.42);
  ctx.fillStyle = '#D5E6DC';
  ctx.font = `${story ? 24 : 20}px sans-serif`;
  ctx.fillText('CollegeMatch', textX, qrY + qr * 0.42 + 42);
  ctx.fillText('collegematch.expo.app', textX, qrY + qr * 0.42 + 76);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fitSize(ctx: CanvasRenderingContext2D, text: string, max: number, start: number, min: number): number {
  let size = start;
  while (size > min) {
    ctx.font = `700 ${size}px Georgia, serif`;
    if (ctx.measureText(text).width <= max) return size;
    size -= 2;
  }
  return min;
}

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.max(dw / image.width, dh / image.height);
  const sw = dw / scale;
  const sh = dh / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, dx, dy, dw, dh);
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const pad = 16;
  rounded(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2, 18);
  ctx.fillStyle = '#FFFCF7';
  ctx.fill();
  const cell = size / QR_SIZE;
  ctx.fillStyle = '#0C3B2C';
  for (let row = 0; row < QR_SIZE; row += 1) {
    for (let col = 0; col < QR_SIZE; col += 1) {
      if (SITE_QR[row * QR_SIZE + col] === '1') ctx.fillRect(x + col * cell, y + row * cell, cell + 0.4, cell + 0.4);
    }
  }
}
