import { decodeBase64 } from '../../../data/photo';
import { publicBio } from '../../../server/bio';
import { appBioRepo } from '../../../server/bioRepo';
import { pathParam } from '../../../server/http';
import { imageBody, imageMissing } from '../../../server/pages';

export async function GET(request: Request): Promise<Response> {
  try {
    const record = await publicBio(appBioRepo(), pathParam(request, 1));
    const bytes = record?.photo ? decodeBase64(record.photo.data) : null;
    if (!record?.photo || !bytes) return imageMissing();
    return imageBody(bytes, record.photo.contentType);
  } catch (error) {
    console.error(error);
    return imageMissing(500);
  }
}
