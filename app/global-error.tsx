"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/actions/log-client-error";

/**
 * Global error boundary — catches errors in the root layout itself.
 * This is the absolute last line of defense before a blank white screen.
 * Must render its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#a1a1aa",
              marginBottom: 24,
            }}
          >
            A critical error occurred. Please try refreshing the page or return
            to the dashboard.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #27272a",
                background: "transparent",
                color: "#fafafa",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <a
              href="/app/dashboard"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#fafafa",
                color: "#09090b",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
