import { requireTenantPage } from "@/lib/auth/page-guards";
import { getPlatformSettings } from "@/lib/platform/settings";
import { resolveTenantAccess } from "@/lib/platform/entitlements";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingCheckout } from "./checkout";

export default async function BillingPage() {
  const actor = await requireTenantPage();
  const [settings, access] = await Promise.all([
    getPlatformSettings(),
    resolveTenantAccess(actor.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>
            {access.plan.label}
            {access.reason === "trial" && access.trialEndsAt
              ? ` · trial until ${access.trialEndsAt.toLocaleDateString()}`
              : null}
            {access.subscriptionEndsAt
              ? ` · paid through ${access.subscriptionEndsAt.toLocaleDateString()}`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Seat limit {access.maxUsers}. API access {access.allowApiAccess ? "included" : "not included"}.
          </p>
          <BillingCheckout
            plans={settings.plans}
            currentKey={access.planKey}
            canCheckout={actor.isOwner}
          />
        </CardContent>
      </Card>
    </div>
  );
}
