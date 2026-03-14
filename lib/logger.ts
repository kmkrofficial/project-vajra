import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Singleton Pino logger for Project Vajra.
 *
 * - Production: Raw JSON to stdout (captured by Coolify).
 * - Development: Pretty-printed via pino-pretty.
 *
 * Sensitive fields (password, token, pin, cookie) are automatically redacted.
 */
export const logger = pino({
  level: isDev ? "debug" : "info",
  redact: {
    paths: [
      "password",
      "token",
      "pin",
      "cookie",
      "req.headers.cookie",
      "req.headers.authorization",
      "*.password",
      "*.token",
      "*.pin",
      "*.cookie",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});
