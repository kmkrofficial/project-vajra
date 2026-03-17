import { logger } from "@/lib/logger";

/**
 * Supabase Storage object storage abstraction.
 *
 * In production, uses the Supabase Storage REST API.
 * In development, falls back to local filesystem (.storage-local/).
 *
 * Environment variables (production):
 *   SUPABASE_URL          — Supabase project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_KEY  — Supabase service_role key (server-side only)
 *   SUPABASE_STORAGE_BUCKET — Bucket name (default: "assets")
 *
 * @module lib/services/storage
 */

import { randomUUID } from "node:crypto";

const isDev = process.env.NODE_ENV !== "production";

// ─── Local dev helpers ──────────────────────────────────────────────────────

const LOCAL_DIR = ".storage-local";

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

// ─── Supabase Storage helpers ───────────────────────────────────────────────

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "assets";
  return { url, serviceKey, bucket };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Storage key (path within the bucket) */
  key: string;
  /** Public URL to access the file */
  url: string;
}

/**
 * Upload a file to Supabase Storage (production) or local filesystem (dev).
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

  const { url: supabaseUrl, serviceKey, bucket } = getSupabaseConfig();
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(data),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ fn: "uploadFile", status: res.status, body: text }, "Supabase upload failed");
    throw new Error(`Supabase upload failed: ${res.status}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  logger.info({ fn: "uploadFile", key }, "File uploaded to Supabase Storage");
  return { key, url: publicUrl };
}

/**
 * Delete a file from Supabase Storage (production) or local filesystem (dev).
 */
export async function deleteFile(key: string): Promise<void> {
  if (isDev) {
    await deleteLocal(key);
    logger.info({ fn: "deleteFile", key, local: true }, `[DEV STORAGE] Deleted ${key}`);
    return;
  }

  const { url: supabaseUrl, serviceKey, bucket } = getSupabaseConfig();
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;

  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    logger.error({ fn: "deleteFile", status: res.status, body: text }, "Supabase delete failed");
    throw new Error(`Supabase delete failed: ${res.status}`);
  }

  logger.info({ fn: "deleteFile", key }, "File deleted from Supabase Storage");
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(key: string): string {
  if (isDev) return `/${LOCAL_DIR}/${key}`;
  const { url: supabaseUrl, bucket } = getSupabaseConfig();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
}
