"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createMember, markAsPaid } from "@/lib/actions/members";
import { memberFormSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

type Step = "form" | "payment";

interface PaymentData {
  memberId: string;
  transactionId: string;
  upiString: string;
  amount: number;
  durationDays: number;
}

export function AddMemberSheet({
  plans,
  defaultBranchId,
  ownerUpiId,
  gymName,
}: {
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetState() {
    setStep("form");
    setLoading(false);
    setSelectedPlanId("");
    setPaymentData(null);
    setFieldErrors({});
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const email = (formData.get("email") as string) || undefined;
    const kioskPin = (formData.get("kioskPin") as string) || undefined;

    const parsed = memberFormSchema.safeParse({
      name,
      phone,
      email: email || "",
      kioskPin: kioskPin || "",
      planId: selectedPlanId || "",
      branchId: defaultBranchId || "",
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);

    const result = await createMember({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      kioskPin: parsed.data.kioskPin || undefined,
      planId: parsed.data.planId,
      branchId: parsed.data.branchId,
    });

    if (result.success && result.data) {
      setPaymentData({
        ...result.data,
        durationDays: selectedPlan?.durationDays ?? 30,
      });
      setStep("payment");
    } else {
      toast.error(result.error ?? "Failed to create member.");
    }
    setLoading(false);
  }

  async function handleMarkAsPaid() {
    if (!paymentData) return;
    setLoading(true);

    const result = await markAsPaid(
      paymentData.transactionId,
      paymentData.durationDays
    );

    if (result.success) {
      toast.success("Payment recorded! Member is now ACTIVE.");
      setOpen(false);
      resetState();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to record payment.");
    }
    setLoading(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <SheetTrigger
        data-testid="add-member-btn"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
      >
        <UserPlus className="size-4" />
        Add Member
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        {step === "form" ? (
          <>
            <SheetHeader>
              <SheetTitle>New Member</SheetTitle>
              <SheetDescription>
                Enter member details and select a plan.
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={handleFormSubmit}
              className="space-y-4 px-4 pb-4"
            >
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Name</Label>
                <Input
                  id="sheet-name"
                  name="name"
                  placeholder="Full Name"
                  required
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-phone">Phone</Label>
                <Input
                  id="sheet-phone"
                  name="phone"
                  placeholder="9876543210"
                  required
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-email">Email (optional)</Label>
                <Input
                  id="sheet-email"
                  name="email"
                  type="email"
                  placeholder="member@example.com"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-kiosk-pin">Kiosk PIN (4 digits)</Label>
                <Input
                  id="sheet-kiosk-pin"
                  name="kioskPin"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  data-testid="sheet-kiosk-pin"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate a secure PIN.
                </p>
                {fieldErrors.kioskPin && (
                  <p className="text-xs text-destructive">{fieldErrors.kioskPin}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={selectedPlanId}
                  onValueChange={(v) => setSelectedPlanId(v ?? "")}
                >
                  <SelectTrigger data-testid="sheet-plan-select">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — ₹{plan.price} ({plan.durationDays}d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.planId && (
                  <p className="text-xs text-destructive">{fieldErrors.planId}</p>
                )}
              </div>
              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={loading}
                data-testid="sheet-submit-member"
              >
                {loading ? "Creating…" : "Proceed to Payment"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Collect Payment</SheetTitle>
              <SheetDescription>
                Scan the QR or use the UPI link to collect ₹
                {paymentData?.amount}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col items-center space-y-4 px-4 pb-4">
              <div
                className="rounded-lg bg-white p-4"
                data-testid="upi-qr-code"
              >
                <QRCodeSVG
                  value={paymentData?.upiString ?? ""}
                  size={220}
                  level="M"
                />
              </div>

              <p className="text-center text-xs text-muted-foreground break-all px-4">
                {paymentData?.upiString}
              </p>

              <Separator />

              <div className="w-full space-y-3">
                <p className="text-center text-2xl font-bold text-foreground">
                  ₹{paymentData?.amount}
                </p>
                <Button
                  className="h-14 w-full text-lg font-semibold"
                  onClick={handleMarkAsPaid}
                  disabled={loading}
                  data-testid="sheet-mark-paid"
                >
                  {loading ? "Processing…" : "✓ Verify & Mark as Paid"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Click after confirming payment received
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
