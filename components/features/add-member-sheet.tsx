"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createMember, markAsPaid } from "@/lib/actions/members";
import { memberFormSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
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
  upiQrImageUrl,
  defaultPlanDurationDays = 30,
}: {
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
  upiQrImageUrl?: string | null;
  defaultPlanDurationDays?: number;
}) {
  const router = useRouter();
  const t = useTranslations("addMember");
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
        durationDays: selectedPlan?.durationDays ?? defaultPlanDurationDays,
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
      toast.success(t("paymentRecorded"));
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
              <SheetTitle>{t("title")}</SheetTitle>
              <SheetDescription>
                {t("description")}
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={handleFormSubmit}
              className="space-y-4 px-4 pb-4"
            >
              <FormField
                label={t("name")}
                htmlFor="sheet-name"
                required
                tooltip={t("nameTooltip")}
                constraint={t("nameConstraint")}
                error={fieldErrors.name}
              >
                <Input
                  id="sheet-name"
                  name="name"
                  placeholder={t("namePlaceholder")}
                  required
                />
              </FormField>

              <FormField
                label={t("phone")}
                htmlFor="sheet-phone"
                required
                tooltip={t("phoneTooltip")}
                constraint={t("phoneConstraint")}
                error={fieldErrors.phone}
              >
                <Input
                  id="sheet-phone"
                  name="phone"
                  placeholder={t("phonePlaceholder")}
                  required
                />
              </FormField>

              <FormField
                label={t("email")}
                htmlFor="sheet-email"
                optional
                tooltip={t("emailTooltip")}
                error={fieldErrors.email}
              >
                <Input
                  id="sheet-email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                />
              </FormField>

              <FormField
                label={t("kioskPin")}
                htmlFor="sheet-kiosk-pin"
                optional
                tooltip={t("kioskPinTooltip")}
                constraint={t("kioskPinConstraint")}
                error={fieldErrors.kioskPin}
              >
                <Input
                  id="sheet-kiosk-pin"
                  name="kioskPin"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("kioskPinPlaceholder")}
                  data-testid="sheet-kiosk-pin"
                />
              </FormField>

              <FormField
                label={t("plan")}
                required
                tooltip={t("planTooltip")}
                error={fieldErrors.planId}
              >
                <Select
                  value={selectedPlanId}
                  onValueChange={(v) => setSelectedPlanId(v ?? "")}
                >
                  <SelectTrigger data-testid="sheet-plan-select">
                    <SelectValue placeholder={t("selectPlan")} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => {
                      const label = `${plan.name} — ₹${plan.price} (${plan.durationDays}d)`;
                      return (
                        <SelectItem key={plan.id} value={plan.id} label={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormField>

              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={loading}
                data-testid="sheet-submit-member"
              >
                {loading ? t("creating") : t("proceedToPayment")}
              </Button>
            </form>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{t("collectPayment")}</SheetTitle>
              <SheetDescription>
                {t("scanQr", { amount: paymentData?.amount ?? 0 })}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col items-center space-y-4 px-4 pb-4">
              <div
                className="rounded-lg bg-white p-4"
                data-testid="upi-qr-code"
              >
                {upiQrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={upiQrImageUrl}
                    alt="UPI QR Code"
                    className="size-[220px] object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={paymentData?.upiString ?? ""}
                    size={220}
                    level="M"
                  />
                )}
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
                  {loading ? t("processing") : t("verifyMarkPaid")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("confirmPayment")}
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
