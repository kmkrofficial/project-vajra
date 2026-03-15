import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceConfig } from "@/lib/dal/config";
import { CheckoutToggle } from "./checkout-toggle";
import { UpiHandleEditor } from "./upi-handle-editor";
import { UpiQrUpload } from "./upi-qr-upload";
import { WhatsappTemplateEditor } from "./whatsapp-template";

export default async function SettingsPage() {
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
    <div className="space-y-8 p-4 md:p-6" data-testid="settings-page">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* UPI Handle */}
      <section className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            UPI Handle
          </h2>
          <p className="text-sm text-muted-foreground">
            Your UPI ID for receiving payments. This is used to generate
            payment QR codes and UPI deep links for members.
          </p>
        </div>
        <UpiHandleEditor defaultUpiId={workspace.ownerUpiId ?? ""} />
      </section>

      {/* Member Checkout */}
      <section className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Member Check-out
          </h2>
          <p className="text-sm text-muted-foreground">
            When enabled, a second kiosk PIN entry will check the member out
            (close their session). When off, the kiosk only records check-ins.
          </p>
        </div>
        <CheckoutToggle defaultEnabled={checkoutEnabled} />
      </section>

      {/* UPI QR Code */}
      <section className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            UPI QR Code
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload your UPI payment QR code. This will be shown to members
            during payment instead of the auto-generated QR.
          </p>
        </div>
        <UpiQrUpload defaultImageUrl={workspace.upiQrImageUrl ?? null} />
      </section>

      {/* WhatsApp Message Template */}
      <section className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            WhatsApp Message
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize the renewal reminder message sent via WhatsApp.
          </p>
        </div>
        <WhatsappTemplateEditor
          defaultTemplate={workspace.whatsappTemplate ?? null}
        />
      </section>
    </div>
  );
}
