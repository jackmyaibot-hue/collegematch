import { approveBio, previewBio } from '../../server/bio';
import { appBioRepo } from '../../server/bioRepo';
import { pathParam, requestOrigin } from '../../server/http';
import { PRIVATE_PAGE_HEADERS, renderApproved, renderMissing, renderPreview } from '../../server/pages';

function html(body: string, status: number): Response {
  return new Response(body, { status, headers: PRIVATE_PAGE_HEADERS });
}

const MISSING = 'This approval link is no longer valid. It may have been used or it expired. The player can send a new one from the app.';

export async function GET(request: Request): Promise<Response> {
  try {
    const token = pathParam(request, 1);
    const record = await previewBio(appBioRepo(), token, Date.now());
    if (!record) return html(renderMissing('Link not valid', MISSING), 404);
    return html(renderPreview(record, token), 200);
  } catch (error) {
    console.error(error);
    return html(renderMissing('Something went wrong', 'The preview could not be loaded. Try the link again.'), 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = pathParam(request, 1);
    const record = await approveBio(appBioRepo(), token, Date.now());
    if (!record) return html(renderMissing('Link not valid', MISSING), 404);
    return html(renderApproved(record, requestOrigin(request)), 200);
  } catch (error) {
    console.error(error);
    return html(renderMissing('Something went wrong', 'Approval did not go through. Try the link again.'), 500);
  }
}
