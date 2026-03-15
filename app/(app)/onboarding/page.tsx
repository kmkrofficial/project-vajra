"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { completeOnboarding } from "@/lib/actions/onboarding";
import {
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  IndianRupee,
  Smartphone,
  Sparkles,
} from "lucide-react";

const STEPS = ["Your Gym", "Payments", "First Plan"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [gymName, setGymName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [planName, setPlanName] = useState("1 Month Standard");
  const [planPrice, setPlanPrice] = useState("999");

  function canProceed() {
    if (step === 0) return gymName.trim().length > 0 && branchName.trim().length > 0;
    if (step === 1) return upiId.trim().length > 0;
    if (step === 2) return planName.trim().length > 0 && Number(planPrice) > 0;
    return false;
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const result = await completeOnboarding({
        gymName: gymName.trim(),
        branchName: branchName.trim(),
        upiId: upiId.trim(),
        planName: planName.trim(),
        planPrice: Number(planPrice),
      });

      if (result.success) {
        toast.success("Your gym is ready!");
        router.push("/workspaces");
        router.refresh();
      } else {
        toast.error(result.error ?? "Onboarding failed. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
          <span className="text-lg font-bold tracking-tight">Vajra</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-2 px-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1 w-full rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-[10px] font-medium transition-colors duration-300 ${
                i <= step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        {/* Step 0: Identity */}
        {step === 0 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Name your gym</h1>
              <p className="text-sm text-muted-foreground">
                This is what your staff and members will see.
              </p>
            </div>
            <div className="space-y-4">
              <FormField label="Gym Name" htmlFor="gymName" required tooltip="This is what your staff and members will see" constraint="Min 2 characters">
                <Input
                  id="gymName"
                  placeholder="e.g. Iron Temple Fitness"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </FormField>
              <FormField label="Primary Branch Name" htmlFor="branchName" required tooltip="Your gym's main location name" constraint="Min 2 characters">
                <Input
                  id="branchName"
                  placeholder="e.g. Main Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="h-12 text-base"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* Step 1: Revenue Engine */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                <IndianRupee className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Set up payments</h1>
              <p className="text-sm text-muted-foreground">
                Members pay directly to your UPI ID. No middlemen, zero fees.
              </p>
            </div>
            <div className="space-y-4">
              <FormField label="Your UPI ID" htmlFor="upiId" required tooltip="Your UPI ID for receiving member payments" constraint="e.g. yourname@paytm">
                <Input
                  id="upiId"
                  placeholder="yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </FormField>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <Smartphone className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground">
                  Works with <span className="font-medium text-foreground">PhonePe</span>,{" "}
                  <span className="font-medium text-foreground">Google Pay</span>,{" "}
                  <span className="font-medium text-foreground">Paytm</span>, and all UPI apps.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: First Plan */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5">
                <Sparkles className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Create your first plan</h1>
              <p className="text-sm text-muted-foreground">
                You can always add more plans later from Settings.
              </p>
            </div>
            <div className="space-y-4">
              <FormField label="Plan Name" htmlFor="planName" required tooltip="The name members see when enrolling" constraint="Min 2 characters">
                <Input
                  id="planName"
                  placeholder="e.g. 1 Month Standard"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </FormField>
              <FormField label="Price (₹)" htmlFor="planPrice" required tooltip="Plan cost in Indian Rupees" constraint="Min ₹1">
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="planPrice"
                    type="number"
                    min={1}
                    placeholder="999"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    className="h-12 pl-9 text-base"
                  />
                </div>
              </FormField>
              <p className="text-xs text-muted-foreground">
                Duration is set to <span className="font-medium text-foreground">30 days</span> by default.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gap-1.5"
            >
              Continue
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || loading}
              className="gap-1.5"
            >
              {loading ? "Setting up…" : "Launch My Gym"}
              <Sparkles className="size-4" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
