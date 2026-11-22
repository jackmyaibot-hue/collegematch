import { publicBio } from '../../server/bio';
import { appBioRepo } from '../../server/bioRepo';
import { pathParam } from '../../server/http';
import { PRIVATE_PAGE_HEADERS, renderMissing, renderPublicBio } from '../../server/pages';

function html(body: string, status: number): Response {
  return new Response(body, { status, headers: PRIVATE_PAGE_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const record = await publicBio(appBioRepo(), pathParam(request, 1));
    if (!record) {
      return html(renderMissing('This bio is not public', 'There is no public bio at this link.'), 404);
    }
    return html(renderPublicBio(record), 200);
  } catch (error) {
    console.error(error);
    return html(renderMissing('Something went wrong', 'The bio could not be loaded. Try again in a minute.'), 500);
  }
}
