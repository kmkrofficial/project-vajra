"use server";

import { logger } from "@/lib/logger";

/**
 * Server Action called from client error boundaries to
 * log unhandled UI crashes to our backend Pino logger.
 * Captured by Coolify via stdout/stderr in production.
 */
export async function logClientError(data: {
  message: string;
  digest?: string;
  stack?: string;
  pathname?: string;
}) {
  logger.error(
    {
      source: "client_error_boundary",
      digest: data.digest,
      pathname: data.pathname,
      stack: data.stack,
    },
    data.message || "Unhandled client error"
  );
}
