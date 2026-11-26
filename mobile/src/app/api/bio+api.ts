import { BioError, bioStatus, publishBio, unpublishBio } from '../../server/bio';
import { appBioRepo } from '../../server/bioRepo';
import { createEmailProvider } from '../../server/email';
import { fail, json, options, readJson, requestOrigin } from '../../server/http';

const MAX_BYTES = 1_500_000;

export function OPTIONS(): Response {
  return options();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson(request, MAX_BYTES);
    const action = body && typeof body === 'object' ? (body as { action?: unknown }).action : undefined;
    const repo = appBioRepo();
    if (action === 'status') {
      const status = await bioStatus(repo, body);
      return json({ ok: true, ...status });
    }
    if (action === 'unpublish') {
      await unpublishBio(repo, body);
      return json({ ok: true, state: 'none' });
    }
    if (action === 'publish') {
      let email;
      try {
        email = createEmailProvider();
      } catch (error) {
        throw new BioError(error instanceof Error ? error.message : 'Email is not configured. No email was sent.', 503);
      }
      const result = await publishBio({
        repo,
        email,
        body,
        origin: requestOrigin(request),
        now: Date.now(),
      });
      return json({ ok: true, ...result });
    }
    return json({ ok: false, error: 'Unknown request.' }, 400);
  } catch (error) {
    return fail(error);
  }
}
