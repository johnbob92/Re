import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, withAuth } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongodb";
import { buildUploadKey, createPresignedUploadUrl } from "@/lib/s3/upload";

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(["resumes", "recordings", "avatars", "offers"]),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = schema.parse(await req.json());
    const user = await getSessionUser();

    // Allow anonymous resume/avatar uploads for registration; protect other folders.
    if (!user && !["resumes", "avatars"].includes(body.folder)) {
      return jsonError("Unauthorized", 401);
    }

    if (user) {
      // keep role middleware behavior for authenticated users
      return withAuth(null, async () => {
        const key = buildUploadKey(body.folder, body.filename);
        const result = await createPresignedUploadUrl({
          key,
          contentType: body.contentType,
        });
        return jsonOk({ ...result, key });
      });
    }

    const key = buildUploadKey(body.folder, body.filename);
    const result = await createPresignedUploadUrl({
      key,
      contentType: body.contentType,
    });
    return jsonOk({ ...result, key });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Validation failed", 400, error.flatten());
    }
    return jsonError(error instanceof Error ? error.message : "Upload failed", 500);
  }
}
