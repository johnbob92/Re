import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
    return null;
  }

  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const client = getClient();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!client || !bucket) {
    // Demo fallback URL — frontend can still store a placeholder path
    const demoUrl = `https://demo-s3.hireflow.local/${params.key}`;
    return {
      uploadUrl: demoUrl,
      publicUrl: demoUrl,
      demo: true as const,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 900,
  });

  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${params.key}`;

  return { uploadUrl, publicUrl, demo: false as const };
}

export async function deleteS3Object(key: string) {
  const client = getClient();
  const bucket = process.env.AWS_S3_BUCKET;
  if (!client || !bucket) return { demo: true };
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return { demo: false };
}

export function buildUploadKey(folder: "resumes" | "recordings" | "avatars" | "offers", filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${folder}/${Date.now()}-${safe}`;
}
