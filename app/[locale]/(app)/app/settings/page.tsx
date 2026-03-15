import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreditCard, Fingerprint, MessageSquare } from "lucide-react";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceConfig } from "@/lib/dal/config";
import { CheckoutToggle } from "./checkout-toggle";
import { UpiHandleEditor } from "./upi-handle-editor";
import { UpiQrUpload } from "./upi-qr-upload";
import { WhatsappTemplateEditor } from "./whatsapp-template";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("settings");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  if (!["SUPER_ADMIN", "MANAGER"].includes(workspace.role)) {
    redirect("/app/dashboard");
  }

  const branchId = ws.branchId ?? workspace.branches[0]?.id ?? null;
  const config = await getWorkspaceConfig(ws.workspaceId, branchId);
  const checkoutEnabled = config?.checkoutEnabled ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Payment Settings ── */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <CreditCard className="size-4 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("paymentSettings")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("paymentDescription")}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="px-5 py-4">
            <UpiHandleEditor defaultUpiId={workspace.ownerUpiId ?? ""} />
          </div>
          <div className="px-5 py-4">
            <UpiQrUpload defaultImageUrl={workspace.upiQrImageUrl ?? null} />
          </div>
        </div>
      </section>

      {/* ── Kiosk Settings ── */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <Fingerprint className="size-4 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("kioskSettings")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("kioskDescription")}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <CheckoutToggle defaultEnabled={checkoutEnabled} />
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <MessageSquare className="size-4 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("notifications")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("notificationsDescription")}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <WhatsappTemplateEditor
            defaultTemplate={workspace.whatsappTemplate ?? null}
          />
        </div>
      </section>
    </div>
  );
}
