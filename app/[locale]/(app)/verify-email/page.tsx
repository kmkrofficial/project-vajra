"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Mail, ShieldCheck, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  sendVerificationOtpAction,
  verifyEmailOtpAction,
} from "@/lib/actions/email-verification";

export default function VerifyEmailPage() {
  const router = useRouter();
  const t = useTranslations("verifyEmail");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);

  // Auto-send OTP on mount
  useEffect(() => {
    handleSendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendOtp() {
    setSending(true);
    const result = await sendVerificationOtpAction();
    if (result.success) {
      setSent(true);
      toast.success(t("codeSent"));
    } else if (result.error === "Email is already verified.") {
      router.push("/onboarding");
    } else {
      toast.error(result.error ?? "Failed to send code.");
    }
    setSending(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await verifyEmailOtpAction(otp);
    if (result.success) {
      setVerified(true);
      toast.success(t("verified"));
      setTimeout(() => router.push("/onboarding"), 1200);
    } else {
      toast.error(result.error ?? "Verification failed.");
    }
    setLoading(false);
  }

  if (verified) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-bold tracking-tight">Vajra</span>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-24">
          <div className="space-y-4 text-center animate-in fade-in duration-300">
            <div className="mx-auto inline-flex rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <ShieldCheck className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">{t("verified")}</h1>
            <p className="text-muted-foreground">{t("redirecting")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
          <span className="text-lg font-bold tracking-tight">Vajra</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-2">
            <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
              <Mail className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <FormField label={t("codeLabel")} htmlFor="verify-otp" required constraint={t("codeConstraint")}>
              <Input
                id="verify-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                className="h-14 text-center text-3xl font-mono tracking-[0.3em]"
                autoFocus
                data-testid="verify-otp-input"
              />
            </FormField>
            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={loading || otp.length !== 6}
              data-testid="verify-otp-btn"
            >
              {loading ? t("verifying") : t("verify")}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendOtp}
              disabled={sending}
              className="text-xs text-muted-foreground"
              data-testid="resend-otp-btn"
            >
              {sending ? t("sending") : t("resend")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
