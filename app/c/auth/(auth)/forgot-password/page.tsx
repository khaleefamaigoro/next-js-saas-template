import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function ClientForgotPasswordPage() {
  const { tenant } = await loadTenantPageContext();
  const settings = tenant ? parseTenantSettings(tenant.settingsJson) : null;
  const logoUrl =
    settings?.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings?.logoKey && s3Configured()
        ? publicUrlForKey(settings.logoKey)
        : null;

  return (
    <AuthLayoutWrapper logoUrl={logoUrl} tenantName={tenant?.name}>
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <CardTitle className="text-2xl font-medium text-card-foreground">Forgot password</CardTitle>
          <CardDescription>
            We&apos;ll email you a link to reset your client password
            {tenant ? (
              <>
                {" "}
                for <span className="font-semibold text-foreground">{tenant.name}</span>
              </>
            ) : null}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ForgotPasswordForm
            surface="tenant_client"
            backHref="/auth/login"
            backLabel="Back to login"
          />
        </CardContent>
      </Card>
    </AuthLayoutWrapper>
  );
}
