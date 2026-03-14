"use client";

import { useState } from "react";
import { Search, MessageCircle, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { AddMemberSheet } from "@/components/features/add-member-sheet";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isExpiringSoon(member: Member): boolean {
  if (member.status !== "ACTIVE" || !member.expiryDate) return false;
  const now = new Date();
  const threeDays = new Date();
  threeDays.setDate(now.getDate() + 3);
  const exp = new Date(member.expiryDate);
  return exp >= now && exp <= threeDays;
}

export function MembersList({
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
  const [query, setQuery] = useState("");

  const cheapestPlan =
    plans.length > 0
      ? plans.reduce((a, b) => (a.price < b.price ? a : b))
      : null;

  const filtered = members.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Members</h1>
        <AddMemberSheet
          plans={plans}
          defaultBranchId={defaultBranchId}
          ownerUpiId={ownerUpiId}
          gymName={gymName}
        />
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          data-testid="member-search"
        />
      </div>

      {/* Members list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            {query ? "No members match your search." : "No members yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => {
            const expiring = isExpiringSoon(member);
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                data-testid={`member-row-${member.id}`}
              >
                {/* Avatar */}
                <Avatar>
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.phone}
                    {member.expiryDate && (
                      <> · Exp {new Date(member.expiryDate).toLocaleDateString("en-IN")}</>
                    )}
                  </p>
                </div>

                {/* Status badge */}
                <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"}>
                  {member.status.replace("_", " ")}
                </Badge>

                {/* WhatsApp button — opens in new tab via window.open */}
                <Button
                  size="sm"
                  className={
                    expiring
                      ? "gap-1 bg-green-600 text-white hover:bg-green-700"
                      : "gap-1"
                  }
                  variant={expiring ? "default" : "outline"}
                  data-testid={`wa-msg-${member.id}`}
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
                  <MessageCircle className="size-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">
                    {expiring ? "Remind" : "Message"}
                  </span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
