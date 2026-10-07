"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueMonthPoint, RevenueTopTenant } from "@/lib/platform/revenue";
import { formatMoney } from "@/lib/platform/money";
import Link from "next/link";

const config = {
  total: { label: "Earnings", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RevenueCharts({
  currency,
  monthly,
  topTenants,
}: {
  currency: string;
  monthly: RevenueMonthPoint[];
  topTenants: RevenueTopTenant[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Earnings over time</CardTitle>
          <CardDescription>Recognized {currency} amounts by month recorded (last 12 months).</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[260px] w-full">
            <AreaChart data={monthly} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={56} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="total" type="monotone" fill="var(--color-total)" fillOpacity={0.2} stroke="var(--color-total)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top tenants</CardTitle>
          <CardDescription>Highest recognized {currency} volume.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recognized earnings yet.</p>
          ) : (
            topTenants.map((t) => (
              <div key={t.tenantId} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/tenants/${t.tenantId}?tab=payments`} className="min-w-0 hover:underline">
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                </Link>
                <span className="tabular-nums shrink-0">{formatMoney(t.total, currency)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
