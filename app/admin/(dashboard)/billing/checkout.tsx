"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import type { PlatformPlan } from "@/lib/platform/plans";

export function BillingCheckout({
  plans,
  currentKey,
  canCheckout,
}: {
  plans: PlatformPlan[];
  currentKey: string;
  canCheckout: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(planKey: string) {
    setPending(planKey);
    setError(null);
    const res = await apiPost<{ authorizationUrl: string }>("/api/tenant/billing/checkout", { planKey }, {
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    setPending(null);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.authorizationUrl) window.location.assign(res.data.authorizationUrl);
  }

  return (
    <div className="space-y-3">
      {plans.filter((p) => p.key !== "trial").map((p) => (
        <div key={p.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">{p.label}</p>
            <p className="text-xs text-muted-foreground">
              {p.maxUsers} seats · {p.allowApiAccess ? "API" : "No API"}
              {p.priceKobo > 0 ? ` · ₦${(p.priceKobo / 100).toLocaleString()}/mo` : " · contact sales"}
            </p>
          </div>
          {p.priceKobo > 0 && canCheckout ? (
            <Button size="sm" disabled={pending !== null || p.key === currentKey} onClick={() => buy(p.key)}>
              {p.key === currentKey ? "Current" : pending === p.key ? "Redirecting…" : "Upgrade"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{p.key === currentKey ? "Current" : "Contact support"}</span>
          )}
        </div>
      ))}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
