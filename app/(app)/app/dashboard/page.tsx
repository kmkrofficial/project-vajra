import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getMembers } from "@/lib/dal/members";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import cfg from "@/lib/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ScanLine,
  IndianRupee,
  Users,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  UserCheck,
  UserSearch,
  UserX,
} from "lucide-react";
import { PopularTimes } from "./popular-times";
import { getPopularTimes, getTodayCheckinCount } from "@/lib/dal/attendance";
import { getMonthlyRevenue } from "@/lib/dal/analytics";

/** Roles that can see revenue stats and all-branches filter. */
const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  const isAdmin = ADMIN_ROLES.includes(role);

  // Use the branch from the cookie — null means "All Branches" (admin only)
  const activeBranchId = ws.branchId;

  // Staff must always have a branch; fall back to assigned or first
  const effectiveBranchId = isAdmin
    ? activeBranchId
    : activeBranchId ?? workspace.assignedBranchId ?? workspace.branches[0]?.id ?? null;

  const [allMembers, popularTimes, todayCheckins, monthlyRevenue] = await Promise.all([
    getMembers(ws.workspaceId, effectiveBranchId),
    getPopularTimes(ws.workspaceId, effectiveBranchId),
    getTodayCheckinCount(ws.workspaceId, effectiveBranchId),
    isAdmin ? getMonthlyRevenue(ws.workspaceId, effectiveBranchId) : Promise.resolve(0),
  ]);

  const members = allMembers;

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const trialCount = members.filter((m) => m.status === "TRIAL").length;
  const enquiryCount = members.filter((m) => m.status === "ENQUIRY").length;
  const pendingCount = members.filter((m) => m.status === "PENDING_PAYMENT").length;
  const churnedCount = members.filter((m) => m.status === "CHURNED").length;

  // Members expiring within configured window
  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(now.getDate() + cfg.analytics.expiringSoonDays);
  const expiringCount = members.filter(
    (m) =>
      m.status === "ACTIVE" &&
      m.expiryDate &&
      new Date(m.expiryDate) <= weekFromNow &&
      new Date(m.expiryDate) >= now
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Action FABs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/members?action=add">
          <Button
            className="h-14 w-full gap-2 text-base font-semibold"
            data-testid="fab-add-member"
          >
            <UserPlus className="size-5" />
            Add Member
          </Button>
        </Link>
        <Link href="/kiosk">
          <Button
            variant="outline"
            className="h-14 w-full gap-2 text-base font-semibold"
            data-testid="fab-launch-kiosk"
          >
            <ScanLine className="size-5" />
            Launch Kiosk
          </Button>
        </Link>
      </div>

      {/* ── KPI Metric Cards ─────────────────────────────────────── */}
      {isAdmin ? (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
          data-testid="revenue-summary"
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <IndianRupee className="size-3.5" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                ₹{monthlyRevenue.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {activeCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                Expiring in {cfg.analytics.expiringSoonDays}d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/app/members?view=expiring" className="text-2xl font-bold text-red-500 hover:underline">
                {expiringCount}
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardCheck className="size-3.5" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/app/members?view=pending" className="text-2xl font-bold text-foreground hover:underline">
                {pendingCount}
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserCheck className="size-3.5" />
                Trial Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/app/members?view=trial" className="text-2xl font-bold text-blue-500 hover:underline">
                {trialCount}
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserSearch className="size-3.5" />
                Enquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/app/members?view=enquiry" className="text-2xl font-bold text-foreground hover:underline">
                {enquiryCount}
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserX className="size-3.5" />
                Churned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">{churnedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5" />
                Check-ins Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{todayCheckins}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
          data-testid="staff-summary"
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                Expiring in {cfg.analytics.expiringSoonDays}d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/app/members?view=expiring" className="text-2xl font-bold text-red-500 hover:underline">
                {expiringCount}
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5" />
                Check-ins Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{todayCheckins}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserCheck className="size-3.5" />
                Trial Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">{trialCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Popular Times (Google-style) ──────────────────────────── */}
      <Card data-testid="hourly-activity-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Activity className="size-4" />
            Popular Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PopularTimes data={popularTimes} />
        </CardContent>
      </Card>
    </div>
  );
}
