import { parseUsage, recordUsage, utcDay } from '../../server/usage';

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
}

export function OPTIONS(): Response {
  return json({ ok: true });
}

export async function POST(request: Request): Promise<Response> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 2000) return json({ ok: false }, 413);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const event = parseUsage(body);
  if (!event) return json({ ok: false }, 400);
  const stored = await recordUsage(event, utcDay());
  return json({ ok: true, stored });
}
