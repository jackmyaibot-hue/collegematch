import { passwordsMatch, readUsage, statsPage, storageConfigured, utcDay } from '../server/usage';

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function GET(): Response {
  return html(statsPage(null));
}

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.STATS_PASSWORD ?? '';
  if (!expected) return html(statsPage(null, 'Set STATS_PASSWORD on the server before viewing counts.'), 503);
  const given = new URLSearchParams(await request.text()).get('password') ?? '';
  if (!given || !passwordsMatch(given, expected)) return html(statsPage(null, 'That password does not match.'), 401);
  if (!storageConfigured()) {
    return html(statsPage(null, 'The count store is not configured yet.'), 503);
  }
  const report = await readUsage(utcDay());
  if (!report) return html(statsPage(null, 'The count store did not respond.'), 502);
  return html(statsPage(report));
}
