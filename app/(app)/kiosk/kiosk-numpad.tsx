"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { processKioskCheckin } from "@/lib/actions/kiosk";

type KioskState = "idle" | "loading" | "success" | "error";

interface KioskNumpadProps {
  branchId: string;
  checkoutEnabled: boolean;
}

export default function KioskNumpad({ branchId, checkoutEnabled }: KioskNumpadProps) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<KioskState>("idle");
  const [memberName, setMemberName] = useState("");
  const [kioskAction, setKioskAction] = useState<"checkin" | "checkout">("checkin");
  const [errorMessage, setErrorMessage] = useState("");

  const resetAfterDelay = useCallback(() => {
    setTimeout(() => {
      setPin("");
      setMemberName("");
      setKioskAction("checkin");
      setErrorMessage("");
      setState("idle");
    }, 3000);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || !branchId) return;

    setState("loading");

    const result = await processKioskCheckin(pin, branchId, checkoutEnabled);

    if (result.success) {
      setMemberName(result.memberName);
      setKioskAction(result.action);
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
    state === "success" && kioskAction === "checkout"
      ? "bg-blue-500"
      : state === "success"
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
      {/* Back to dashboard link — top-right corner */}
      <Link
        href="/app/dashboard"
        className="absolute right-3 top-3 z-10 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        data-testid="kiosk-exit-btn"
      >
        ← Dashboard
      </Link>

      {/* Success overlay */}
      {state === "success" && (
        <div className="text-center text-white px-4" data-testid="kiosk-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 size-16 sm:mb-6 sm:size-28"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-2xl font-bold sm:text-5xl">
            {kioskAction === "checkout" ? `Goodbye, ${memberName}!` : `Welcome, ${memberName}!`}
          </p>
          <p className="mt-1 text-base font-medium opacity-80 sm:mt-2 sm:text-2xl">
            {kioskAction === "checkout" ? "Checked out" : "Checked in"}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {state === "error" && (
        <div className="text-center text-white px-4" data-testid="kiosk-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 size-16 sm:mb-6 sm:size-28"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <p className="text-2xl font-bold sm:text-5xl">{errorMessage}</p>
        </div>
      )}

      {/* Idle / Loading — Numpad UI */}
      {(state === "idle" || state === "loading") && (
        <div className="flex w-full max-w-xs flex-col items-center gap-4 px-4 sm:max-w-md sm:gap-8 sm:px-6">
          {/* PIN display */}
          <div className="text-center">
            <p className="mb-2 text-base text-muted-foreground sm:mb-3 sm:text-xl">
              Enter your 4-digit PIN
            </p>
            <div
              className="flex justify-center gap-2.5 sm:gap-4"
              data-testid="kiosk-pin-display"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex size-14 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-colors sm:size-20 sm:text-4xl ${
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

          {/* Numpad grid — responsive touch targets */}
          <div className="grid w-full grid-cols-3 gap-2 sm:gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-14 text-2xl font-bold sm:h-20 sm:min-h-[80px] sm:text-3xl"
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
              className="h-14 text-lg font-bold sm:h-20 sm:min-h-[80px] sm:text-xl"
              onClick={() => handleKey("clear")}
              disabled={state === "loading"}
              data-testid="kiosk-key-clear"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-14 text-2xl font-bold sm:h-20 sm:min-h-[80px] sm:text-3xl"
              onClick={() => handleKey("0")}
              disabled={state === "loading"}
              data-testid="kiosk-key-0"
            >
              0
            </Button>
            <Button
              className="h-14 text-lg font-bold sm:h-20 sm:min-h-[80px] sm:text-xl"
              onClick={() => handleKey("submit")}
              disabled={state === "loading" || pin.length !== 4}
              data-testid="kiosk-key-submit"
            >
              {state === "loading" ? "…" : "Enter"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
