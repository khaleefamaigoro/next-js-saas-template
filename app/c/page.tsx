import Link from "next/link";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { COMPANY_NAME } from "@/lib/branding";

export default async function TenantClientLandingPage() {
  const { tenant } = await loadTenantPageContext();
  const settings = tenant ? parseTenantSettings(tenant.settingsJson) : null;
  const logoUrl =
    settings?.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings?.logoKey && s3Configured()
        ? publicUrlForKey(settings.logoKey)
        : null;
  const name = tenant?.name ?? COMPANY_NAME;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="max-w-md text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto mb-6 h-12 w-auto" />
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to your client workspace or create an account.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Client login
        </Link>
        <Link
          href="/auth/register"
          className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium"
        >
          Create account
        </Link>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Staff?{" "}
        <Link href="/admin/auth/login" className="underline">
          Admin sign-in
        </Link>
      </p>
    </main>
  );
}
