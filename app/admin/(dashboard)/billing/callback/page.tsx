import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { paystackFetch, applyPaidPlan } from "@/lib/platform/paystack";

export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const actor = await requireTenantPage();
  const { reference } = await searchParams;
  if (!reference) redirect("/admin/billing");

  const data = (await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`)) as {
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: { tenantId?: string; planKey?: string };
  };

  if (data.status === "success" && data.metadata?.tenantId === actor.tenantId && data.metadata.planKey) {
    await applyPaidPlan({
      tenantId: actor.tenantId,
      planKey: data.metadata.planKey,
      reference,
      amountKobo: data.amount ?? 0,
      currency: data.currency,
    });
  }

  redirect("/admin/billing");
}
