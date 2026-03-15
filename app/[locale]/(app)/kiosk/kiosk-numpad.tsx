"use client";

import { useState, useCallback, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { processKioskCheckin } from "@/lib/actions/kiosk";

/**
 * idle     → numpad visible
 * loading  → processing PIN
 * success  → green — normal check-in / blue — checkout
 * warning  → amber — checked in but plan expiring soon
 * denied   → orange — member recognized but can't enter (expired / pending / etc.)
 * error    → red — PIN not found or system error
 */
type KioskState = "idle" | "loading" | "success" | "warning" | "denied" | "error";

interface KioskNumpadProps {
  branchId: string;
  checkoutEnabled: boolean;
  overlayResetMs: number;
}

export default function KioskNumpad({ branchId, checkoutEnabled, overlayResetMs }: KioskNumpadProps) {
  const t = useTranslations("kiosk");
  const [pin, setPin] = useState("");
  const [state, setState] = useState<KioskState>("idle");
  const [memberName, setMemberName] = useState("");
  const [kioskAction, setKioskAction] = useState<"checkin" | "checkout">("checkin");
  const [displayMessage, setDisplayMessage] = useState("");
  const [displaySub, setDisplaySub] = useState("");

  const resetAfterDelay = useCallback(() => {
    setTimeout(() => {
      setPin("");
      setMemberName("");
      setKioskAction("checkin");
      setDisplayMessage("");
      setDisplaySub("");
      setState("idle");
    }, overlayResetMs);
  }, [overlayResetMs]);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || !branchId) return;

    setState("loading");

    const result = await processKioskCheckin(pin, branchId, checkoutEnabled);

    if (result.success) {
      setMemberName(result.memberName);
      setKioskAction(result.action);

      if (result.action === "checkout") {
        setDisplayMessage(t("goodbyeName", { name: result.memberName }));
        setDisplaySub(t("checkedOut"));
        setState("success");
      } else if (result.expiryWarning) {
        // Checked in, but plan expiring soon
        setDisplayMessage(t("welcomeName", { name: result.memberName }));
        setDisplaySub(result.expiryWarning);
        setState("warning");
      } else {
        setDisplayMessage(t("welcomeName", { name: result.memberName }));
        setDisplaySub(t("greatWorkout"));
        setState("success");
      }
    } else {
      // Member recognized but denied? (has memberName)
      if (result.memberName) {
        setMemberName(result.memberName);
        setDisplayMessage(result.error);
        setDisplaySub("");
        setState("denied");
      } else {
        setDisplayMessage(result.error);
        setDisplaySub("");
        setState("error");
      }
    }

    resetAfterDelay();
  }, [pin, branchId, checkoutEnabled, resetAfterDelay]);

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
        : state === "warning"
          ? "bg-amber-500"
          : state === "denied"
            ? "bg-orange-500"
            : state === "error"
              ? "bg-red-500"
              : "bg-background";

  // Icon for each overlay state
  const overlayIcon =
    state === "success" || state === "warning" ? (
      // Checkmark
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
    ) : state === "denied" ? (
      // Hand / stop icon (circle with line)
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
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ) : (
      // X mark
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
    );

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
        {t("backToDashboard")}
      </Link>

      {/* ── Success overlay (check-in / check-out) ─────────────────── */}
      {state === "success" && (
        <div className="text-center text-white px-4" data-testid="kiosk-success">
          {overlayIcon}
          <p className="text-2xl font-bold sm:text-5xl">{displayMessage}</p>
          <p className="mt-1 text-base font-medium opacity-80 sm:mt-2 sm:text-2xl">
            {displaySub}
          </p>
        </div>
      )}

      {/* ── Warning overlay (checked in, but plan expiring soon) ──── */}
      {state === "warning" && (
        <div className="text-center text-white px-4" data-testid="kiosk-warning">
          {overlayIcon}
          <p className="text-2xl font-bold sm:text-5xl">{displayMessage}</p>
          <p className="mt-2 text-base font-medium opacity-90 sm:mt-3 sm:text-2xl">
            {displaySub}
          </p>
        </div>
      )}

      {/* ── Denied overlay (member found, but status prevents entry) ─ */}
      {state === "denied" && (
        <div className="text-center text-white px-6" data-testid="kiosk-denied">
          {overlayIcon}
          <p className="text-xl font-bold leading-snug sm:text-4xl sm:leading-snug max-w-lg mx-auto">
            {displayMessage}
          </p>
        </div>
      )}

      {/* ── Error overlay (PIN not found / system error) ───────────── */}
      {state === "error" && (
        <div className="text-center text-white px-6" data-testid="kiosk-error">
          {overlayIcon}
          <p className="text-lg font-bold leading-snug sm:text-3xl sm:leading-snug max-w-lg mx-auto">
            {displayMessage}
          </p>
        </div>
      )}

      {/* Idle / Loading — Numpad UI */}
      {(state === "idle" || state === "loading") && (
        <div className="flex w-full max-w-xs flex-col items-center gap-4 px-4 sm:max-w-md sm:gap-8 sm:px-6">
          {/* PIN display */}
          <div className="text-center">
            <p className="mb-2 text-base text-muted-foreground sm:mb-3 sm:text-xl">
              {t("enterPin")}
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
              {t("clear")}
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
              {state === "loading" ? "\u2026" : t("enter")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
