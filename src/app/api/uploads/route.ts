import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, withAuth } from "@/lib/api";
import { buildUploadKey, createPresignedUploadUrl } from "@/lib/s3/upload";

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(["resumes", "recordings", "avatars", "offers"]),
});

export async function POST(req: NextRequest) {
  return withAuth(null, async () => {
    const body = schema.parse(await req.json());
    const key = buildUploadKey(body.folder, body.filename);
    const result = await createPresignedUploadUrl({
      key,
      contentType: body.contentType,
    });
    return jsonOk({ ...result, key });
  });
}
