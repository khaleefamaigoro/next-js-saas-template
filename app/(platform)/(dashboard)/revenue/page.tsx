import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { loadPlatformRevenue } from "@/lib/platform/revenue";
import { formatMoney } from "@/lib/platform/money";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueCharts } from "./revenue-charts";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default async function RevenuePage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);
  const data = await loadPlatformRevenue();
  const delta =
    data.lastMonth === 0
      ? data.thisMonth > 0
        ? 100
        : 0
      : ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" />
      <p className="text-sm text-muted-foreground -mt-4">
        Earnings from tenant subscriptions. Revoked rows are excluded from totals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recognized ({data.primaryCurrency})</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(data.recognizedTotal, data.primaryCurrency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data.payingTenants} paying tenant{data.payingTenants === 1 ? "" : "s"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This month</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(data.thisMonth, data.primaryCurrency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {delta === 0 ? "No change vs last month" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}% vs last month`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subscription mix</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{data.activeCount} active</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data.expiredCount} expired · {data.revokedCount} revoked
          </CardContent>
        </Card>
      </div>

      {data.totalsByCurrency.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By currency</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {data.totalsByCurrency.map((c) => (
              <Badge key={c.currency} variant="outline" className="text-sm py-1.5 px-3">
                {formatMoney(c.total, c.currency)} · {c.count} payment{c.count === 1 ? "" : "s"}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RevenueCharts currency={data.primaryCurrency} monthly={data.monthly} topTenants={data.topTenants} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent payments</CardTitle>
          <CardDescription>Latest subscription rows across tenants.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No subscription payments to display yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/tenants/${row.tenant.id}?tab=payments`} className="font-medium hover:underline">
                        {row.tenant.name}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">{row.tenant.slug}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatMoney(row.amount, row.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(row.startDate, "PP")} — {format(row.endDate, "PP")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          row.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : row.status === "EXPIRED"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                        )}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(row.recordedAt, "PP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
