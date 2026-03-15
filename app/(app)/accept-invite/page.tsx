"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, ShieldCheck, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { acceptInviteAction } from "@/lib/actions/employees";

type Step = "email" | "otp" | "done";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await acceptInviteAction({ email, otp });

    if (result.success) {
      setStep("done");
      toast.success("Invitation accepted! Redirecting to your workspace…");
      // Give them a moment to see the success, then redirect
      setTimeout(() => router.push("/workspaces"), 1500);
    } else {
      toast.error(result.error ?? "Verification failed.");
    }
    setLoading(false);
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
        {step === "done" ? (
          <div className="space-y-4 text-center animate-in fade-in duration-300">
            <div className="mx-auto inline-flex rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <ShieldCheck className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">You&apos;re in!</h1>
            <p className="text-muted-foreground">
              Your invitation has been accepted. Redirecting…
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                <Mail className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Accept Invitation
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the email address your invitation was sent to, and the
                6-digit verification code from the email.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <FormField label="Email Address" htmlFor="invite-email" required tooltip="The email address your invitation was sent to">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                  data-testid="invite-email-input"
                />
              </FormField>
              <FormField label="Verification Code" htmlFor="invite-otp" required constraint="6-digit code from the invitation email">
                <Input
                  id="invite-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  className="h-12 text-center text-2xl font-mono tracking-[0.3em]"
                  data-testid="invite-otp-input"
                />
              </FormField>
              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={loading || otp.length !== 6 || !email}
                data-testid="invite-verify-btn"
              >
                {loading ? "Verifying…" : "Verify & Join"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                Sign up first
              </a>
              , then come back here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
