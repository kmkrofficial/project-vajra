"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddMemberDialog } from "./add-member-dialog";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import type { WorkspaceRole } from "@/lib/workspace-cookie";

interface Member {
  id: string;
  name: string;
  phone: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT";
  expiryDate: Date | null;
  createdAt: Date;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    ACTIVE: "default",
    EXPIRED: "destructive",
    PENDING_PAYMENT: "secondary",
  };

/** Roles that can see revenue / full member table */
const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

/** Members expiring within the next 7 days */
function getExpiringSoon(members: Member[]) {
  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(now.getDate() + 7);

  return members.filter(
    (m) =>
      m.status === "ACTIVE" &&
      m.expiryDate &&
      new Date(m.expiryDate) <= weekFromNow &&
      new Date(m.expiryDate) >= now
  );
}

export function MembersView({
  members,
  plans,
  defaultBranchId,
  ownerUpiId,
  gymName,
  role,
}: {
  members: Member[];
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
  role: WorkspaceRole;
}) {
  const isAdmin = ADMIN_ROLES.includes(role);
  const expiringSoon = getExpiringSoon(members);

  // Cheapest active plan for renewal link
  const cheapestPlan = plans.length > 0
    ? plans.reduce((a, b) => (a.price < b.price ? a : b))
    : null;

  return (
    <div className="space-y-6">
      {/* ── Expiring Soon ─────────────────────────────────────────── */}
      <div className="space-y-3" data-testid="expiring-soon-section">
        <h2 className="text-lg font-semibold text-foreground">
          Expiring Soon ({expiringSoon.length})
        </h2>
        {expiringSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members expiring in the next 7 days.
          </p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringSoon.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>
                      {member.expiryDate
                        ? new Date(member.expiryDate).toLocaleDateString(
                            "en-IN"
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`wa-remind-${member.id}`}
                        onClick={() => {
                          const url = generateWhatsAppLink(
                            { name: member.name, phone: member.phone },
                            ownerUpiId ?? "",
                            cheapestPlan?.price ?? 0,
                            gymName
                          );
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {/* WhatsApp icon (inline SVG) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="mr-1"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Send Reminder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Full Members Table (admin-only shows all; staff sees limited) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
          <AddMemberDialog
            plans={plans}
            defaultBranchId={defaultBranchId}
            ownerUpiId={ownerUpiId}
            gymName={gymName}
          />
        </div>

        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              No members yet. Add your first member to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    data-testid={`member-row-${member.id}`}
                  >
                    <TableCell className="font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[member.status] ?? "secondary"}
                      >
                        {member.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.expiryDate
                        ? new Date(member.expiryDate).toLocaleDateString(
                            "en-IN"
                          )
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
