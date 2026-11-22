import { BioError } from './bio';
import { ROBOT_TAG } from './pages';

const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': ROBOT_TAG,
};

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

export function options(): Response {
  return json({ ok: true });
}

export function fail(error: unknown): Response {
  if (error instanceof BioError) return json({ ok: false, error: error.message }, error.status);
  console.error(error);
  return json({ ok: false, error: 'Something went wrong. Try again.' }, 500);
}

export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > maxBytes) {
    throw new BioError('That upload is too large.', 413);
  }
  try {
    return await request.json();
  } catch {
    throw new BioError('That request could not be read.', 400);
  }
}

/** Public site origin for links in texts. Prefers PUBLIC_WEB_ORIGIN, then the forwarding headers. */
export function requestOrigin(request: Request): string {
  const configured = process.env.PUBLIC_WEB_ORIGIN?.trim().replace(/\/$/, '');
  if (configured && /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configured)) return configured;
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host) && (proto === 'http' || proto === 'https')) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export function pathParam(request: Request, index: number): string {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  try {
    return decodeURIComponent(parts[index] ?? '');
  } catch {
    return '';
  }
}
