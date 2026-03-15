"use client";

/**
 * Members list with filters, sort, views, and bulk messaging.
 *
 * Views (URL-synced via `view` param):
 *   all | active | expiring | trial | enquiry | pending | expired | churned | new
 *
 * Sort: name (A-Z / Z-A), joined (newest / oldest), expiry (soonest / latest)
 * Search: name or phone
 * Actions: View profile, Message on WhatsApp (individual + bulk for expiring)
 */

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  MessageCircle,
  Eye,
  ArrowUpDown,
  Users,
  AlertTriangle,
  UserCheck,
  UserSearch,
  ClipboardCheck,
  UserX,
  Clock,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { AddMemberSheet } from "@/components/features/add-member-sheet";

// ─── Types ──────────────────────────────────────────────────────────────────

type MemberStatus = "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT" | "TRIAL" | "ENQUIRY" | "CHURNED";

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  checkinPin?: string | null;
  status: MemberStatus;
  expiryDate: Date | null;
  createdAt: Date;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "destructive",
  PENDING_PAYMENT: "secondary",
  TRIAL: "outline",
  ENQUIRY: "secondary",
  CHURNED: "destructive",
};

type ViewKey = "all" | "active" | "expiring" | "trial" | "enquiry" | "pending" | "expired" | "churned" | "new";

const VIEW_KEYS: { key: ViewKey; labelKey: string; icon: React.ElementType; shortKey: string }[] = [
  { key: "all", labelKey: "views.all", icon: Users, shortKey: "views.allShort" },
  { key: "active", labelKey: "views.active", icon: Users, shortKey: "views.active" },
  { key: "expiring", labelKey: "views.expiring", icon: AlertTriangle, shortKey: "views.expiringShort" },
  { key: "trial", labelKey: "views.trial", icon: UserCheck, shortKey: "views.trial" },
  { key: "enquiry", labelKey: "views.enquiry", icon: UserSearch, shortKey: "views.enquiryShort" },
  { key: "pending", labelKey: "views.pending", icon: ClipboardCheck, shortKey: "views.pendingShort" },
  { key: "expired", labelKey: "views.expired", icon: Clock, shortKey: "views.expired" },
  { key: "churned", labelKey: "views.churned", icon: UserX, shortKey: "views.churned" },
  { key: "new", labelKey: "views.new", icon: Sparkles, shortKey: "views.new" },
];

type SortKey = "name-asc" | "name-desc" | "joined-new" | "joined-old" | "expiry-soon" | "expiry-late";

const SORT_KEYS: { key: SortKey; labelKey: string }[] = [
  { key: "name-asc", labelKey: "sort.nameAsc" },
  { key: "name-desc", labelKey: "sort.nameDesc" },
  { key: "joined-new", labelKey: "sort.joinedNew" },
  { key: "joined-old", labelKey: "sort.joinedOld" },
  { key: "expiry-soon", labelKey: "sort.expirySoon" },
  { key: "expiry-late", labelKey: "sort.expiryLate" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isExpiringSoon(member: Member, days: number): boolean {
  if (member.status !== "ACTIVE" || !member.expiryDate) return false;
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  const exp = new Date(member.expiryDate);
  return exp >= now && exp <= future;
}

function isNew(member: Member, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(member.createdAt) >= cutoff;
}

function daysUntilExpiry(member: Member): number | null {
  if (!member.expiryDate) return null;
  const diff = new Date(member.expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function filterByView(members: Member[], view: ViewKey, expiringSoonDays: number, newMemberDays: number): Member[] {
  switch (view) {
    case "active":
      return members.filter((m) => m.status === "ACTIVE");
    case "expiring":
      return members.filter((m) => isExpiringSoon(m, expiringSoonDays));
    case "trial":
      return members.filter((m) => m.status === "TRIAL");
    case "enquiry":
      return members.filter((m) => m.status === "ENQUIRY");
    case "pending":
      return members.filter((m) => m.status === "PENDING_PAYMENT");
    case "expired":
      return members.filter((m) => m.status === "EXPIRED");
    case "churned":
      return members.filter((m) => m.status === "CHURNED");
    case "new":
      return members.filter((m) => isNew(m, newMemberDays));
    default:
      return members;
  }
}

function sortMembers(members: Member[], sort: SortKey): Member[] {
  const sorted = [...members];
  switch (sort) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "joined-new":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "joined-old":
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case "expiry-soon":
      return sorted.sort((a, b) => {
        const ae = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const be = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return ae - be;
      });
    case "expiry-late":
      return sorted.sort((a, b) => {
        const ae = a.expiryDate ? new Date(a.expiryDate).getTime() : -Infinity;
        const be = b.expiryDate ? new Date(b.expiryDate).getTime() : -Infinity;
        return be - ae;
      });
    default:
      return sorted;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MembersList({
  members,
  plans,
  defaultBranchId,
  ownerUpiId,
  gymName,
  upiQrImageUrl,
  whatsappTemplate,
  expiringSoonDays,
  newMemberDays,
  defaultPlanDurationDays,
}: {
  members: Member[];
  plans: Plan[];
  defaultBranchId: string | null;
  ownerUpiId: string | null;
  gymName: string;
  upiQrImageUrl?: string | null;
  whatsappTemplate?: string | null;
  expiringSoonDays: number;
  newMemberDays: number;
  defaultPlanDurationDays: number;
}) {
  const t = useTranslations("members");
  const ts = useTranslations("status");
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialView = (searchParams.get("view") as ViewKey) || "all";
  const [activeView, setActiveView] = useState<ViewKey>(initialView);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined-new");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const cheapestPlan =
    plans.length > 0 ? plans.reduce((a, b) => (a.price < b.price ? a : b)) : null;

  // Computed counts per view
  const viewCounts = useMemo(() => {
    const counts: Record<ViewKey, number> = {
      all: members.length,
      active: 0,
      expiring: 0,
      trial: 0,
      enquiry: 0,
      pending: 0,
      expired: 0,
      churned: 0,
      new: 0,
    };
    for (const m of members) {
      if (m.status === "ACTIVE") counts.active++;
      if (m.status === "TRIAL") counts.trial++;
      if (m.status === "ENQUIRY") counts.enquiry++;
      if (m.status === "PENDING_PAYMENT") counts.pending++;
      if (m.status === "EXPIRED") counts.expired++;
      if (m.status === "CHURNED") counts.churned++;
      if (isExpiringSoon(m, expiringSoonDays)) counts.expiring++;
      if (isNew(m, newMemberDays)) counts.new++;
    }
    return counts;
  }, [members, expiringSoonDays, newMemberDays]);

  // Apply view → search → sort pipeline
  const result = useMemo(() => {
    let list = filterByView(members, activeView, expiringSoonDays, newMemberDays);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
      );
    }
    return sortMembers(list, sortKey);
  }, [members, activeView, query, sortKey, expiringSoonDays, newMemberDays]);

  function handleViewChange(view: ViewKey) {
    setActiveView(view);
    const params = new URLSearchParams(searchParams.toString());
    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.replace(`/app/members?${params.toString()}`, { scroll: false });
  }

  function openWhatsApp(member: Member) {
    const url = generateWhatsAppLink(
      { name: member.name, phone: member.phone },
      ownerUpiId ?? "",
      cheapestPlan?.price ?? 0,
      gymName,
      whatsappTemplate
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <AddMemberSheet
          plans={plans}
          defaultBranchId={defaultBranchId}
          ownerUpiId={ownerUpiId}
          gymName={gymName}
          upiQrImageUrl={upiQrImageUrl}
          defaultPlanDurationDays={defaultPlanDurationDays}
        />
      </div>

      {/* ── View Tabs (scrollable on mobile) ── */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        data-testid="member-view-tabs"
      >
        {VIEW_KEYS.map(({ key, labelKey, icon: Icon, shortKey }) => {
          const count = viewCounts[key];
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => handleViewChange(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              data-testid={`view-tab-${key}`}
            >
              <Icon className="size-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t(labelKey)}</span>
              <span className="sm:hidden">{t(shortKey)}</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
                  ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-foreground"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Sort row ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            data-testid="member-search"
          />
        </div>

        {/* Sort select */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger data-testid="sort-btn" className="w-auto shrink-0 gap-1.5">
            <ArrowUpDown className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_KEYS.map((opt) => (
              <SelectItem
                key={opt.key}
                value={opt.key}
                data-testid={`sort-${opt.key}`}
              >
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Expiring Soon banner (shown in expiring view) ── */}
      {activeView === "expiring" && result.length > 0 && (
        <div
          className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/30"
          data-testid="expiring-banner"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-500" />
            <span className="text-sm font-medium text-foreground">
              {t("expiringBanner", { count: result.length })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
            onClick={() => {
              for (const m of result) {
                openWhatsApp(m);
              }
            }}
            data-testid="bulk-remind-btn"
          >
            <MessageCircle className="size-3.5" />
            {t("remindAll")}
          </Button>
        </div>
      )}

      {/* ── Trial / Enquiry action banners ── */}
      {activeView === "trial" && result.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">
              {t("trialBanner", { count: result.length })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            onClick={() => {
              for (const m of result) openWhatsApp(m);
            }}
            data-testid="bulk-trial-msg-btn"
          >
            <MessageCircle className="size-3.5" />
            {t("messageAll")}
          </Button>
        </div>
      )}

      {activeView === "enquiry" && result.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900 dark:bg-purple-950/30">
          <div className="flex items-center gap-2">
            <UserSearch className="size-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">
              {t("enquiryBanner", { count: result.length })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
            onClick={() => {
              for (const m of result) openWhatsApp(m);
            }}
            data-testid="bulk-enquiry-msg-btn"
          >
            <MessageCircle className="size-3.5" />
            {t("messageAll")}
          </Button>
        </div>
      )}

      {activeView === "new" && result.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-green-500" />
            <span className="text-sm font-medium text-foreground">
              {t("newBanner", { count: result.length })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
            onClick={() => {
              for (const m of result) openWhatsApp(m);
            }}
            data-testid="bulk-new-msg-btn"
          >
            <MessageCircle className="size-3.5" />
            {t("welcomeAll")}
          </Button>
        </div>
      )}

      {/* ── Result count ── */}
      <p className="text-xs text-muted-foreground" data-testid="member-count">
        {t("memberCount", { count: result.length })}
        {query && " "}
        {query && t("matchingSearch", { query })}
      </p>

      {/* ── Members list ── */}
      {result.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            {query ? t("noMatchSearch") : t("noMembersInView")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {result.map((member) => {
            const expDays = daysUntilExpiry(member);
            const expiring = isExpiringSoon(member, expiringSoonDays);

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 ${
                  expiring ? "border-orange-300 dark:border-orange-800" : "border-border"
                }`}
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
                    {member.expiryDate
                      ? expDays !== null && expDays >= 0
                        ? t("expiresIn", { days: expDays })
                        : t("expiredDate", { date: new Date(member.expiryDate).toLocaleDateString("en-IN") })
                      : member.status === "TRIAL"
                        ? t("trialMember")
                        : member.status === "ENQUIRY"
                          ? t("enquiryLabel")
                          : t("noExpirySet")}
                  </p>
                </div>

                {/* Status badge */}
                <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"}>
                  {ts(member.status === "PENDING_PAYMENT" ? "pendingPayment" : member.status.toLowerCase())}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => openWhatsApp(member)}
                    title={t("messageOnWhatsApp")}
                    data-testid={`wa-msg-${member.id}`}
                  >
                    <MessageCircle className="size-3.5 text-green-600" strokeWidth={1.5} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setSelectedMember(member)}
                    title={t("viewProfile")}
                    data-testid={`view-profile-${member.id}`}
                  >
                    <Eye className="size-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Member Profile Dialog ─── */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle>{t("profileTitle")}</DialogTitle>
                <DialogDescription>
                  {t("profileDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Name & Status */}
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">
                      {selectedMember.name}
                    </p>
                    <Badge variant={STATUS_VARIANT[selectedMember.status] ?? "secondary"}>
                      {ts(selectedMember.status === "PENDING_PAYMENT" ? "pendingPayment" : selectedMember.status.toLowerCase())}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("contact")}
                  </h3>
                  <div className="grid grid-cols-[80px_1fr] gap-y-1 text-sm">
                    <span className="text-muted-foreground">{t("phone")}</span>
                    <span className="font-medium text-foreground" data-testid="profile-phone">
                      {selectedMember.phone}
                    </span>
                    <span className="text-muted-foreground">{t("emailLabel")}</span>
                    <span className="font-medium text-foreground" data-testid="profile-email">
                      {selectedMember.email || "—"}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Plan & Expiry */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("membership")}
                  </h3>
                  <div className="grid grid-cols-[80px_1fr] gap-y-1 text-sm">
                    <span className="text-muted-foreground">{t("expiry")}</span>
                    <span className="font-medium text-foreground">
                      {selectedMember.expiryDate
                        ? new Date(selectedMember.expiryDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                    <span className="text-muted-foreground">{t("joined")}</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedMember.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Kiosk Check-In PIN */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("kioskPin")}
                  </h3>
                  <div
                    className="inline-flex items-center rounded-lg bg-muted px-4 py-2"
                    data-testid="profile-kiosk-pin"
                  >
                    <span className="font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                      {selectedMember.checkinPin || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("sharePinNote")}
                  </p>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-1.5 bg-green-600 text-white hover:bg-green-700"
                    onClick={() => openWhatsApp(selectedMember)}
                    data-testid={`profile-wa-msg-${selectedMember.id}`}
                  >
                    <MessageCircle className="size-4" strokeWidth={1.5} />
                    {t("messageOnWhatsApp")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
