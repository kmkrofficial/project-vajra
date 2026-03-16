import { logger } from "@/lib/logger";

/**
 * Cloudflare R2 object storage abstraction.
 *
 * In production, uses the S3-compatible R2 API via standard fetch.
 * In development, falls back to local filesystem (.r2-local/).
 *
 * Environment variables (production):
 *   R2_ACCOUNT_ID      — Cloudflare account ID
 *   R2_ACCESS_KEY_ID   — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret
 *   R2_BUCKET_NAME     — R2 bucket name
 *   R2_PUBLIC_URL      — Public URL prefix for the bucket (e.g. https://assets.yourdomain.com)
 *
 * @module lib/services/storage
 */

import { randomUUID } from "node:crypto";

const isDev = process.env.NODE_ENV !== "production";

// ─── Local dev helpers ──────────────────────────────────────────────────────

const LOCAL_DIR = ".r2-local";

async function ensureLocalDir() {
  const { mkdir } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  await mkdir(resolve(process.cwd(), LOCAL_DIR), { recursive: true });
}

async function writeLocal(key: string, data: Buffer): Promise<string> {
  await ensureLocalDir();
  const { writeFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const filePath = resolve(process.cwd(), LOCAL_DIR, key);
  // Ensure subdirectories exist
  const { mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return `/${LOCAL_DIR}/${key}`;
}

async function deleteLocal(key: string): Promise<void> {
  const { unlink } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  try {
    await unlink(resolve(process.cwd(), LOCAL_DIR, key));
  } catch {
    // File may already be gone
  }
}

// ─── R2 S3-compatible helpers ───────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 signature for AWS Signature V4 (used by R2).
 */
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const { createHmac } = await import("node:crypto");
  return new Uint8Array(createHmac("sha256", key).update(message).digest());
}

async function sha256Hex(data: Buffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(data).digest("hex");
}

async function getSigningKey(secret: string, date: string, region: string, service: string) {
  let key = await hmacSha256(new TextEncoder().encode(`AWS4${secret}`), date);
  key = await hmacSha256(key, region);
  key = await hmacSha256(key, service);
  key = await hmacSha256(key, "aws4_request");
  return key;
}

async function signR2Request(
  method: string,
  path: string,
  body: Buffer | null,
  contentType?: string
): Promise<{ url: string; headers: Record<string, string> }> {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET_NAME!;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${bucket}/${path}`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const payloadHash = body ? await sha256Hex(body) : "UNSIGNED-PAYLOAD";

  const headers: Record<string, string> = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  const canonicalRequest = [
    method,
    `/${bucket}/${path}`,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(Buffer.from(canonicalRequest)),
  ].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const { createHmac } = await import("node:crypto");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  headers["authorization"] =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { url, headers };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Storage key (path within the bucket) */
  key: string;
  /** Public URL to access the file */
  url: string;
}

/**
 * Upload a file to R2 (production) or local filesystem (dev).
 *
 * @param data       Raw file data as a Buffer
 * @param folder     Logical folder (e.g. "upi-qr", "avatars")
 * @param filename   Original filename (extension is preserved)
 * @param contentType MIME type
 */
export async function uploadFile(
  data: Buffer,
  folder: string,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const key = `${folder}/${randomUUID()}${ext}`;

  if (isDev) {
    const localUrl = await writeLocal(key, data);
    logger.info({ fn: "uploadFile", key, local: true }, `[DEV STORAGE] Saved to ${localUrl}`);
    return { key, url: localUrl };
  }

  const { url, headers } = await signR2Request("PUT", key, data, contentType);
  const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(data) });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ fn: "uploadFile", status: res.status, body: text }, "R2 upload failed");
    throw new Error(`R2 upload failed: ${res.status}`);
  }

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  logger.info({ fn: "uploadFile", key }, "File uploaded to R2");
  return { key, url: publicUrl };
}

/**
 * Delete a file from R2 (production) or local filesystem (dev).
 */
export async function deleteFile(key: string): Promise<void> {
  if (isDev) {
    await deleteLocal(key);
    logger.info({ fn: "deleteFile", key, local: true }, `[DEV STORAGE] Deleted ${key}`);
    return;
  }

  const { url, headers } = await signR2Request("DELETE", key, null);
  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    logger.error({ fn: "deleteFile", status: res.status, body: text }, "R2 delete failed");
    throw new Error(`R2 delete failed: ${res.status}`);
  }

  logger.info({ fn: "deleteFile", key }, "File deleted from R2");
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(key: string): string {
  if (isDev) return `/${LOCAL_DIR}/${key}`;
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
