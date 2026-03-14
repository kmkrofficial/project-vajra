"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/lib/actions/log-client-error";

/**
 * Route-level error boundary.
 * Catches errors in nested layouts/pages within the app router.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    logClientError({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      pathname,
    });
  }, [error, pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified. Please try
            again or return to the dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
          <a href="/app/dashboard">
            <Button>Return to Dashboard</Button>
          </a>
        </div>

        {process.env.NODE_ENV === "development" && error?.message && (
          <details className="mt-6 rounded-lg border border-border bg-muted p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-destructive">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
