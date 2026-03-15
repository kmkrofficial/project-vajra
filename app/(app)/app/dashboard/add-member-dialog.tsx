"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { createMember, markAsPaid } from "@/lib/actions/members";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function AddMemberDialog({
  plans,
  defaultBranchId,
  upiQrImageUrl,
}: {
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
  upiQrImageUrl?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  function resetState() {
    setStep("form");
    setLoading(false);
    setSelectedPlanId("");
    setPaymentData(null);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const email = (formData.get("email") as string) || undefined;

    if (!selectedPlanId) {
      toast.error("Please select a plan.");
      setLoading(false);
      return;
    }

    if (!defaultBranchId) {
      toast.error("No branch configured. Please set up a branch first.");
      setLoading(false);
      return;
    }

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);

    const result = await createMember({
      name,
      phone,
      email,
      planId: selectedPlanId,
      branchId: defaultBranchId,
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger
        data-testid="add-member-btn"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
      >
        Add Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>New Member</DialogTitle>
              <DialogDescription>
                Enter member details and select a plan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  name="name"
                  placeholder="Full Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-phone">Phone</Label>
                <Input
                  id="member-phone"
                  name="phone"
                  placeholder="9876543210"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">Email (optional)</Label>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={selectedPlanId}
                  onValueChange={(v) => setSelectedPlanId(v ?? "")}
                >
                  <SelectTrigger data-testid="plan-select">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem
                        key={plan.id}
                        value={plan.id}
                        data-testid={`plan-option-${plan.id}`}
                      >
                        {plan.name} — ₹{plan.price} ({plan.durationDays}d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="submit-member-btn"
              >
                {loading ? "Creating…" : "Proceed to Payment"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
              <DialogDescription>
                Scan the QR or use the UPI link to collect ₹
                {paymentData?.amount}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <div
                className="rounded-lg bg-white p-4"
                data-testid="upi-qr-code"
              >
                {upiQrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={upiQrImageUrl}
                    alt="UPI QR Code"
                    className="size-[200px] object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={paymentData?.upiString ?? ""}
                    size={200}
                    level="M"
                  />
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground break-all px-4">
                {paymentData?.upiString}
              </p>

              <Separator />

              <div className="w-full space-y-2">
                <p className="text-center text-lg font-bold text-foreground">
                  Amount: ₹{paymentData?.amount}
                </p>
                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleMarkAsPaid}
                  disabled={loading}
                  data-testid="mark-paid-btn"
                >
                  {loading ? "Processing…" : "✓ Mark as Paid"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Click after confirming payment received
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
