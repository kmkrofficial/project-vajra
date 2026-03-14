"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processKioskCheckin } from "@/lib/actions/kiosk";

type KioskState = "idle" | "loading" | "success" | "error";

const COOKIE_NAME = "vajra_active_workspace";

function readBranchIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.split("=")[1]));
    return parsed.branchId ?? null;
  } catch {
    return null;
  }
}

export default function KioskPage() {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<KioskState>("idle");
  const [memberName, setMemberName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const branchId = readBranchIdFromCookie();

  const resetAfterDelay = useCallback(() => {
    setTimeout(() => {
      setPin("");
      setMemberName("");
      setErrorMessage("");
      setState("idle");
    }, 3000);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || !branchId) return;

    setState("loading");

    const result = await processKioskCheckin(pin, branchId);

    if (result.success) {
      setMemberName(result.memberName);
      setState("success");
    } else {
      setErrorMessage(result.error);
      setState("error");
    }

    resetAfterDelay();
  }, [pin, branchId, resetAfterDelay]);

  const handleKey = useCallback(
    (key: string) => {
      if (state !== "idle" && state !== "loading") return;

      if (key === "clear") {
        setPin("");
        return;
      }

      if (key === "submit") {
        handleSubmit();
        return;
      }

      // Digit
      setPin((prev) => (prev.length < 4 ? prev + key : prev));
    },
    [state, handleSubmit]
  );

  // Physical keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        handleKey(e.key);
      } else if (e.key === "Backspace" || e.key === "Escape") {
        handleKey("clear");
      } else if (e.key === "Enter") {
        handleKey("submit");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  // Background color based on state
  const bgColor =
    state === "success"
      ? "bg-green-500"
      : state === "error"
        ? "bg-red-500"
        : "bg-background";

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-colors duration-300 ${bgColor}`}
      data-testid="kiosk-root"
      data-kiosk-state={state}
    >
      {/* Success overlay */}
      {state === "success" && (
        <div
          className="text-center text-white"
          data-testid="kiosk-success"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-4xl font-bold">Welcome, {memberName}!</p>
        </div>
      )}

      {/* Error overlay */}
      {state === "error" && (
        <div
          className="text-center text-white"
          data-testid="kiosk-error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <p className="text-4xl font-bold">{errorMessage}</p>
        </div>
      )}

      {/* Idle / Loading — Numpad UI */}
      {(state === "idle" || state === "loading") && (
        <div className="flex w-full max-w-sm flex-col items-center gap-6 px-4">
          {/* PIN display */}
          <div className="text-center">
            <p className="mb-2 text-lg text-muted-foreground">
              Enter your 4-digit PIN
            </p>
            <div
              className="flex justify-center gap-3"
              data-testid="kiosk-pin-display"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex h-16 w-14 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-colors ${
                    pin[i]
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {pin[i] ? "●" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Numpad grid */}
          <div className="grid w-full grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-16 text-2xl font-bold"
                onClick={() => handleKey(digit)}
                disabled={state === "loading"}
                data-testid={`kiosk-key-${digit}`}
              >
                {digit}
              </Button>
            ))}

            {/* Bottom row: Clear, 0, Submit */}
            <Button
              variant="destructive"
              className="h-16 text-lg font-bold"
              onClick={() => handleKey("clear")}
              disabled={state === "loading"}
              data-testid="kiosk-key-clear"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-16 text-2xl font-bold"
              onClick={() => handleKey("0")}
              disabled={state === "loading"}
              data-testid="kiosk-key-0"
            >
              0
            </Button>
            <Button
              className="h-16 text-lg font-bold"
              onClick={() => handleKey("submit")}
              disabled={state === "loading" || pin.length !== 4}
              data-testid="kiosk-key-submit"
            >
              {state === "loading" ? "…" : "Go"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
