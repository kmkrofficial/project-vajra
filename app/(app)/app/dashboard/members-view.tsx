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
import { AddMemberDialog } from "./add-member-dialog";

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

export function MembersView({
  members,
  plans,
  defaultBranchId,
  ownerUpiId,
  gymName,
}: {
  members: Member[];
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
}) {
  return (
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
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} data-testid={`member-row-${member.id}`}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"}>
                      {member.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.expiryDate
                      ? new Date(member.expiryDate).toLocaleDateString("en-IN")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
