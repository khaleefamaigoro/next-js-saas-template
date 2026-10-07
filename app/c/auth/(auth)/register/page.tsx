import Link from "next/link";
import { ClientRegisterForm } from "./client-register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function ClientRegisterPage() {
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
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              {tenant ? `Create an account in ${tenant.name}` : "Create an account"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              Enter your details, then confirm your email with a one-time code.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <ClientRegisterForm />
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/admin/auth/login" className="underline">
              Tenant admin sign-in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayoutWrapper>
  );
}
