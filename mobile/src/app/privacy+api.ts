import { renderPrivacyPage } from '../server/pages';

export function GET(): Response {
  return new Response(renderPrivacyPage(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
