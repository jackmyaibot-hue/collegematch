import { File as ExpoFile, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { SITE_QR, SOCIAL_STAMPS, type SocialCard, type SocialStatIcon } from '../data/socialCard';
import type { PreparedPhoto } from './cutoutPhoto';

export const STORY_SIZE = { width: 1080, height: 1920, file: 'story' } as const;
export const FEED_SIZE = { width: 1080, height: 1350, file: 'feed' } as const;
export type SocialSize = typeof STORY_SIZE | typeof FEED_SIZE;

const QR_SIZE = 29;
const ATHLETIC = '"CollegeMatch Athletic", Impact, "Arial Narrow", sans-serif';

let fontReady: Promise<void> | null = null;

function loadAthleticFont(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!fontReady) {
    fontReady = (async () => {
      try {
        const face = new FontFace('CollegeMatch Athletic', 'url(/fonts/bebas-neue.woff2)');
        await face.load();
        document.fonts.add(face);
      } catch {
        // Impact is the fallback when the condensed font cannot load.
      }
    })();
  }
  return fontReady;
}

export async function renderSocialPng(card: SocialCard, photo: PreparedPhoto | null, size: SocialSize): Promise<Uint8Array> {
  if (typeof document === 'undefined') throw new Error('Saving the image works in the web app.');
  await loadAthleticFont();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the image.');
  drawCard(ctx, card, photo, size.width, size.height);
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

function drawCard(
  ctx: CanvasRenderingContext2D,
  card: SocialCard,
  photo: PreparedPhoto | null,
  width: number,
  height: number,
): void {
  const story = height >= 1600;
  const frame = story ? 28 : 22;
  ctx.save();
  rounded(ctx, 0, 0, width, height, story ? 8 : 6);
  ctx.clip();
  const foil = ctx.createLinearGradient(0, 0, width, height);
  foil.addColorStop(0, '#F8E7A0');
  foil.addColorStop(0.18, '#FFFDF6');
  foil.addColorStop(0.36, '#D8F26A');
  foil.addColorStop(0.55, '#C6A15A');
  foil.addColorStop(0.74, '#F4F1EA');
  foil.addColorStop(1, '#9BE15D');
  ctx.fillStyle = foil;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const innerX = frame;
  const innerY = frame;
  const innerW = width - frame * 2;
  const innerH = height - frame * 2;
  ctx.save();
  rounded(ctx, innerX, innerY, innerW, innerH, 36);
  ctx.clip();
  const field = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
  field.addColorStop(0, '#145C3A');
  field.addColorStop(0.42, '#0B2E22');
  field.addColorStop(1, '#07140F');
  ctx.fillStyle = field;
  ctx.fillRect(innerX, innerY, innerW, innerH);
  halftone(ctx, innerX, innerY, innerW, innerH);
  const glow = ctx.createRadialGradient(width / 2, story ? 820 : 560, 40, width / 2, story ? 820 : 560, story ? 620 : 420);
  glow.addColorStop(0, 'rgba(216, 242, 106, 0.28)');
  glow.addColorStop(1, 'rgba(216, 242, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(innerX, innerY, innerW, innerH);
  ctx.restore();

  ctx.save();
  rounded(ctx, innerX + 10, innerY + 10, innerW - 20, innerH - 20, 28);
  ctx.strokeStyle = 'rgba(244, 241, 234, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const contentX = innerX + (story ? 48 : 40);
  const contentW = innerW - (story ? 96 : 80);
  const year = String(card.gradYear);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#D8F26A';
  ctx.font = `${story ? 54 : 40}px ${ATHLETIC}`;
  track(ctx, '2px');
  ctx.fillText('CLASS OF', contentX, innerY + (story ? 118 : 96));
  track(ctx, '0px');
  ctx.fillStyle = 'rgba(244, 241, 234, 0.94)';
  const yearSize = fitWidth(ctx, year, contentW * 0.62, story ? 210 : 148, 90);
  ctx.font = `${yearSize}px ${ATHLETIC}`;
  ctx.fillText(year, contentX, innerY + (story ? 300 : 220));

  if (card.jerseyNumber != null) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#F4F1EA';
    ctx.textAlign = 'right';
    ctx.font = `${story ? 520 : 360}px ${ATHLETIC}`;
    ctx.fillText(String(card.jerseyNumber), width - frame - 36, innerY + (story ? 470 : 340));
    ctx.restore();
  }

  const footerH = story ? 168 : 132;
  const statH = story ? 118 : 96;
  const badgeH = story ? 78 : 64;
  const nameSize = story ? 124 : 92;
  const posSize = story ? 44 : 34;
  let cursor = innerY + innerH - (story ? 36 : 28);
  cursor -= footerH;
  const footerY = cursor;
  cursor -= story ? 22 : 14;
  cursor -= statH;
  const statY = cursor;
  cursor -= story ? 20 : 14;
  cursor -= badgeH;
  const badgeY = cursor;
  cursor -= story ? 56 : 42;
  const posY = cursor;
  cursor -= story ? 118 : 88;
  const nameY = cursor;
  const photoTop = innerY + (story ? 250 : 190);
  const photoBottom = nameY - (story ? 130 : 96);
  const photoH = Math.max(story ? 520 : 340, photoBottom - photoTop);
  const photoW = contentW * 0.92;
  const photoX = width / 2 - photoW / 2;

  if (photo?.image && photo.cutout) drawCutout(ctx, photo.image, photoX, photoTop, photoW, photoH);
  else if (photo?.image) drawFramedPhoto(ctx, photo.image, photoX, photoTop, photoW, photoH);
  else drawMonogram(ctx, card.name, photoX, photoTop, photoW, photoH);

  const scrim = ctx.createLinearGradient(0, nameY - (story ? 160 : 110), 0, statY);
  scrim.addColorStop(0, 'rgba(7, 20, 15, 0)');
  scrim.addColorStop(0.35, 'rgba(7, 20, 15, 0.72)');
  scrim.addColorStop(1, 'rgba(7, 20, 15, 0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(innerX, nameY - (story ? 170 : 120), innerW, statY - (nameY - (story ? 170 : 120)));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F7F4EE';
  const nameFont = fitWidth(ctx, card.name.toUpperCase(), contentW, nameSize, story ? 64 : 48);
  ctx.font = `${nameFont}px ${ATHLETIC}`;
  ctx.fillText(card.name.toUpperCase(), contentX, nameY);
  ctx.fillStyle = '#D8F26A';
  const position = card.position.toUpperCase();
  const positionFont = fitWidth(ctx, position, contentW, posSize, 22);
  ctx.font = `${positionFont}px ${ATHLETIC}`;
  track(ctx, '1px');
  ctx.fillText(position, contentX, posY);
  track(ctx, '0px');

  drawLeague(ctx, card, contentX, badgeY, contentW, badgeH);
  drawStats(ctx, card, contentX, statY, contentW, statH);
  drawFooter(ctx, contentX, footerY, contentW, footerH, story);
  if (card.stamp) drawStamp(ctx, card, width - (story ? 250 : 210), innerY + (story ? 210 : 168), story);
}

function drawCutout(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.save();
  ctx.shadowColor = 'rgba(216, 242, 106, 0.85)';
  ctx.shadowBlur = 36;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.filter = 'brightness(2)';
  const ring = 4;
  for (let step = 0; step < 8; step += 1) {
    const angle = (Math.PI * 2 * step) / 8;
    ctx.drawImage(image, dx + Math.cos(angle) * ring, dy + Math.sin(angle) * ring, dw, dh);
  }
  ctx.restore();
  ctx.drawImage(image, dx, dy, dw, dh);
}

function drawFramedPhoto(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  arch(ctx, x, y, w, h);
  ctx.clip();
  cover(ctx, image, x, y, w, h);
  const fade = ctx.createRadialGradient(x + w / 2, y + h * 0.42, w * 0.2, x + w / 2, y + h * 0.5, w * 0.72);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(1, 'rgba(7, 20, 15, 0.55)');
  ctx.fillStyle = fade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  arch(ctx, x, y, w, h);
  ctx.strokeStyle = '#D8F26A';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

function drawMonogram(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number): void {
  ctx.save();
  arch(ctx, x, y, w, h);
  ctx.fillStyle = '#146C43';
  ctx.fill();
  ctx.fillStyle = '#D8F26A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.round(h * 0.28)}px ${ATHLETIC}`;
  ctx.fillText(initials(name), x + w / 2, y + h * 0.48);
  ctx.restore();
}

function drawLeague(
  ctx: CanvasRenderingContext2D,
  card: SocialCard,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const badge = card.league?.badge ?? '';
  ctx.font = `${Math.round(height * 0.42)}px ${ATHLETIC}`;
  const badgeW = badge ? Math.max(height * 1.7, ctx.measureText(badge).width + 36) : 0;
  if (badge) {
    rounded(ctx, x, y, badgeW, height, 16);
    ctx.fillStyle = '#D8F26A';
    ctx.fill();
    ctx.fillStyle = '#0C3B2C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, x + badgeW / 2, y + height / 2 + 2);
  }
  const clubX = x + (badge ? badgeW + 18 : 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F4F1EA';
  const clubSize = fitWidth(ctx, card.club || card.sport, Math.max(40, width - (clubX - x)), Math.round(height * 0.46), 22);
  ctx.font = `${clubSize}px ${ATHLETIC}`;
  ctx.fillText(card.club || card.sport, clubX, y + height / 2 + 2);
}

function drawStats(
  ctx: CanvasRenderingContext2D,
  card: SocialCard,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const tiles = card.stats.slice(0, 3);
  if (tiles.length === 0) return;
  const gap = 14;
  const tileW = (width - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((stat, index) => {
    const left = x + index * (tileW + gap);
    rounded(ctx, left, y, tileW, height, 18);
    ctx.fillStyle = 'rgba(244, 241, 234, 0.1)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(216, 242, 106, 0.7)';
    ctx.stroke();
    const icon = Math.min(42, height * 0.36);
    rounded(ctx, left + 14, y + (height - icon) / 2, icon, icon, 10);
    ctx.fillStyle = '#D8F26A';
    ctx.fill();
    drawIcon(ctx, stat.icon, left + 14, y + (height - icon) / 2, icon);
    const textX = left + 14 + icon + 12;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F7F4EE';
    const valueSize = fitWidth(ctx, stat.value, tileW - icon - 40, Math.round(height * 0.34), 16);
    ctx.font = `${valueSize}px ${ATHLETIC}`;
    ctx.fillText(stat.value, textX, y + height * 0.4);
    ctx.fillStyle = '#D5E6DC';
    ctx.font = `${Math.max(14, Math.round(height * 0.16))}px ${ATHLETIC}`;
    ctx.fillText(stat.label.toUpperCase(), textX, y + height * 0.7);
  });
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  story: boolean,
): void {
  const mark = story ? 72 : 58;
  rounded(ctx, x, y + (height - mark) / 2, mark, mark, 16);
  ctx.fillStyle = '#D8F26A';
  ctx.fill();
  ctx.fillStyle = '#0C3B2C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(mark * 0.42)}px ${ATHLETIC}`;
  ctx.fillText('CM', x + mark / 2, y + height / 2 + 2);
  const textX = x + mark + 18;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F7F4EE';
  ctx.font = `${story ? 40 : 32}px ${ATHLETIC}`;
  ctx.fillText('COLLEGEMATCH', textX, y + height * 0.4);
  ctx.fillStyle = '#D8F26A';
  ctx.font = `${story ? 26 : 22}px ${ATHLETIC}`;
  ctx.fillText('FIND YOUR COLLEGE MATCH', textX, y + height * 0.68);
  const qr = story ? 112 : 92;
  drawQr(ctx, x + width - qr, y + (height - qr) / 2, qr);
}

function drawStamp(ctx: CanvasRenderingContext2D, card: SocialCard, x: number, y: number, story: boolean): void {
  const spec = SOCIAL_STAMPS.find((item) => item.id === card.stamp);
  if (!spec) return;
  const school = card.schoolColors;
  const fill = school ? school[0] : spec.id === 'uncommitted' ? 'rgba(7, 20, 15, 0.2)' : '#D8F26A';
  const ink = school ? school[1] : '#0C3B2C';
  const width = card.schoolName ? (story ? 390 : 320) : story ? 280 : 230;
  const schoolLines = card.schoolName ? wrapLine(ctx, card.schoolName.toUpperCase(), width - 56, story ? 20 : 16) : [];
  const height = (story ? 78 : 66) + schoolLines.length * (story ? 24 : 20);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);
  ribbon(ctx, width, height);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ribbon(ctx, width - 16, height - 16);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = spec.lines;
  const lineH = story ? 30 : 24;
  const schoolH = story ? 22 : 18;
  const blockH = lines.length * lineH + schoolLines.length * schoolH;
  let pen = -blockH / 2 + lineH / 2;
  lines.forEach((line) => {
    ctx.font = `${story ? 34 : 26}px ${ATHLETIC}`;
    ctx.fillText(line, 0, pen);
    pen += lineH;
  });
  schoolLines.forEach((line) => {
    ctx.font = `${schoolH}px ${ATHLETIC}`;
    ctx.fillText(line, 0, pen);
    pen += schoolH;
  });
  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: SocialStatIcon, x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.strokeStyle = '#0C3B2C';
  ctx.fillStyle = '#0C3B2C';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const s = size * 0.28;
  if (icon === 'jersey') {
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.2);
    ctx.lineTo(-s * 0.35, -s);
    ctx.lineTo(s * 0.35, -s);
    ctx.lineTo(s, -s * 0.2);
    ctx.lineTo(s * 0.7, s);
    ctx.lineTo(-s * 0.7, s);
    ctx.closePath();
    ctx.stroke();
  } else if (icon === 'years') {
    rounded(ctx, -s, -s * 0.8, s * 2, s * 1.7, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(-s * 0.5, -s * 0.4);
    ctx.moveTo(s * 0.5, -s);
    ctx.lineTo(s * 0.5, -s * 0.4);
    ctx.moveTo(-s, -s * 0.15);
    ctx.lineTo(s, -s * 0.15);
    ctx.stroke();
  } else if (icon === 'height') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s);
    ctx.moveTo(-s * 0.45, -s * 0.55);
    ctx.lineTo(0, -s);
    ctx.lineTo(s * 0.45, -s * 0.55);
    ctx.moveTo(-s * 0.45, s * 0.55);
    ctx.lineTo(0, s);
    ctx.lineTo(s * 0.45, s * 0.55);
    ctx.stroke();
  } else if (icon === 'gpa') {
    star(ctx, 0, 0, s);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, s * 0.15, s * 0.7, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(-s * 0.15, -s * 0.1, s * 0.3, s * 0.7);
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + point * (Math.PI / 5);
    const r = point % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fitWidth(ctx: CanvasRenderingContext2D, text: string, max: number, start: number, min: number): number {
  let size = start;
  while (size > min) {
    ctx.font = `${size}px ${ATHLETIC}`;
    if (ctx.measureText(text).width <= max) return size;
    size -= 2;
  }
  return min;
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, max: number, size: number): string[] {
  ctx.font = `${size}px ${ATHLETIC}`;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2).map((line) => fitText(ctx, line, max, size));
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, size: number): string {
  ctx.font = `${size}px ${ATHLETIC}`;
  if (ctx.measureText(text).width <= max) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > max) next = next.slice(0, -1);
  return `${next}…`;
}

function track(ctx: CanvasRenderingContext2D, value: string): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
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

function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(216, 242, 106, 0.09)';
  const gap = 18;
  for (let row = 0; row < h; row += gap) {
    for (let col = (row / gap) % 2 === 0 ? 0 : gap / 2; col < w; col += gap) {
      ctx.beginPath();
      ctx.arc(x + col, y + row, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
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

function arch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const radius = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.arc(x + radius, y + radius, radius, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function ribbon(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const notch = Math.min(22, h * 0.28);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + notch, -h / 2);
  ctx.lineTo(w / 2 - notch, -h / 2);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w / 2 - notch, h / 2);
  ctx.lineTo(-w / 2 + notch, h / 2);
  ctx.lineTo(-w / 2, 0);
  ctx.closePath();
}

function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const pad = 8;
  rounded(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2, 12);
  ctx.fillStyle = '#FFFCF7';
  ctx.fill();
  const cell = size / QR_SIZE;
  ctx.fillStyle = '#0C3B2C';
  for (let row = 0; row < QR_SIZE; row += 1) {
    const line = SITE_QR.slice(row * QR_SIZE, row * QR_SIZE + QR_SIZE);
    for (let col = 0; col < QR_SIZE; col += 1) {
      if (line[col] === '1') ctx.fillRect(x + col * cell, y + row * cell, cell + 0.4, cell + 0.4);
    }
  }
}
