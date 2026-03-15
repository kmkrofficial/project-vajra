import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceAnalytics } from "@/lib/dal/analytics";
import cfg from "@/lib/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  UserMinus,
} from "lucide-react";
import { RevenueChart } from "./revenue-chart";
import { DonutChart } from "./donut-chart";

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">N/A</span>;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-green-500" : "text-red-500"}`}>
      {positive ? (
        <TrendingUp className="size-3" strokeWidth={1.5} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={1.5} />
      )}
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  // Only SUPER_ADMIN and MANAGER can view analytics
  if (!["SUPER_ADMIN", "MANAGER"].includes(workspace.role)) {
    redirect("/app/dashboard");
  }

  // Use branch from cookie — null means all branches
  const activeBranchId = ws.branchId;
  const analytics = await getWorkspaceAnalytics(ws.workspaceId, activeBranchId);

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="analytics-page">
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>

      {/* KPI Cards */}
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        data-testid="analytics-kpis"
      >
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <IndianRupee className="size-3.5" strokeWidth={1.5} />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ₹{analytics.monthlyRevenue.toLocaleString("en-IN")}
            </p>
            <div className="mt-1">
              <span className="mr-1 text-xs text-muted-foreground">MoM</span>
              <GrowthBadge value={analytics.momGrowth} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="size-3.5" strokeWidth={1.5} />
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {analytics.activeMembers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserMinus className="size-3.5" strokeWidth={1.5} />
              Churned (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {analytics.churnCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="size-3.5" strokeWidth={1.5} />
              Weekly Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              <GrowthBadge value={analytics.wowGrowth} />
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {analytics.expiringIn7Days} expiring in {cfg.analytics.expiringSoonDays}d
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue Bar Chart — spans 2 cols */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue (Last {cfg.analytics.revenueChartMonths} Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={analytics.revenueByMonth} />
          </CardContent>
        </Card>

        {/* Donut Chart — active vs churned */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              active={analytics.activeMembers}
              churned={analytics.churnCount}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
