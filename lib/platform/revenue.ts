import { prisma } from "@/lib/db/client";
import { format } from "date-fns";
import { formatMoney } from "@/lib/platform/money";

export { formatMoney };

export type RevenueCurrencyTotal = {
  currency: string;
  total: number;
  count: number;
};

export type RevenueMonthPoint = {
  month: string;
  label: string;
  total: number;
};

export type RevenueTopTenant = {
  tenantId: string;
  name: string;
  slug: string;
  total: number;
  currency: string;
};

export type RevenueRecentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recordedAt: Date;
  startDate: Date;
  endDate: Date;
  description: string | null;
  tenant: { name: string; slug: string; id: string };
};

export type PlatformRevenueData = {
  primaryCurrency: string;
  totalsByCurrency: RevenueCurrencyTotal[];
  recognizedTotal: number;
  thisMonth: number;
  lastMonth: number;
  activeCount: number;
  expiredCount: number;
  revokedCount: number;
  payingTenants: number;
  monthly: RevenueMonthPoint[];
  topTenants: RevenueTopTenant[];
  recent: RevenueRecentRow[];
};

function monthKey(d: Date) {
  return format(d, "yyyy-MM");
}

export async function loadPlatformRevenue(): Promise<PlatformRevenueData> {
  const rows = await prisma.tenantSubscription.findMany({
    orderBy: { recordedAt: "desc" },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
    take: 2000,
  });

  const recognized = rows.filter((r) => r.status !== "REVOKED");
  const byCurrency = new Map<string, { total: number; count: number }>();
  for (const r of recognized) {
    const cur = r.currency || "NGN";
    const prev = byCurrency.get(cur) ?? { total: 0, count: 0 };
    prev.total += Number(r.amount);
    prev.count += 1;
    byCurrency.set(cur, prev);
  }
  const totalsByCurrency = [...byCurrency.entries()]
    .map(([currency, v]) => ({ currency, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
  const primaryCurrency = totalsByCurrency[0]?.currency ?? "NGN";

  const now = new Date();
  const thisKey = monthKey(now);
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(last);

  const inPrimary = (r: (typeof recognized)[number]) => (r.currency || "NGN") === primaryCurrency;
  const thisMonth = recognized.filter((r) => inPrimary(r) && monthKey(r.recordedAt) === thisKey)
    .reduce((s, r) => s + Number(r.amount), 0);
  const lastMonth = recognized.filter((r) => inPrimary(r) && monthKey(r.recordedAt) === lastKey)
    .reduce((s, r) => s + Number(r.amount), 0);

  const monthlyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(monthKey(d), 0);
  }
  for (const r of recognized.filter(inPrimary)) {
    const k = monthKey(r.recordedAt);
    if (monthlyMap.has(k)) monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + Number(r.amount));
  }
  const monthly = [...monthlyMap.entries()].map(([month, total]) => ({
    month,
    label: format(new Date(`${month}-01T00:00:00`), "MMM yyyy"),
    total,
  }));

  const tenantTotals = new Map<string, RevenueTopTenant>();
  for (const r of recognized.filter(inPrimary)) {
    const prev = tenantTotals.get(r.tenantId) ?? {
      tenantId: r.tenantId,
      name: r.tenant.name,
      slug: r.tenant.slug,
      total: 0,
      currency: primaryCurrency,
    };
    prev.total += Number(r.amount);
    tenantTotals.set(r.tenantId, prev);
  }
  const topTenants = [...tenantTotals.values()].sort((a, b) => b.total - a.total).slice(0, 6);

  return {
    primaryCurrency,
    totalsByCurrency,
    recognizedTotal: totalsByCurrency.find((t) => t.currency === primaryCurrency)?.total ?? 0,
    thisMonth,
    lastMonth,
    activeCount: rows.filter((r) => r.status === "ACTIVE").length,
    expiredCount: rows.filter((r) => r.status === "EXPIRED").length,
    revokedCount: rows.filter((r) => r.status === "REVOKED").length,
    payingTenants: tenantTotals.size,
    monthly,
    topTenants,
    recent: rows.slice(0, 25).map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      recordedAt: r.recordedAt,
      startDate: r.startDate,
      endDate: r.endDate,
      description: r.description,
      tenant: r.tenant,
    })),
  };
}
