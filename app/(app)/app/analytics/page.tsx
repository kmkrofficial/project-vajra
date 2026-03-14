import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceAnalytics } from "@/lib/dal/analytics";
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
} from "lucide-react";
import { RevenueChart } from "./revenue-chart";

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

  const analytics = await getWorkspaceAnalytics(ws.workspaceId);

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
              <IndianRupee className="size-3.5" strokeWidth={1.5} />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              ₹{analytics.monthlyRevenue.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="size-3.5" strokeWidth={1.5} />
              Expiring in 7d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {analytics.expiringIn7Days}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5" strokeWidth={1.5} />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {analytics.revenueByMonth.length} mo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={analytics.revenueByMonth} />
        </CardContent>
      </Card>
    </div>
  );
}
