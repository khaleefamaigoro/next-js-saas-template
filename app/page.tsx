import Link from "next/link";
import { COMPANY_NAME } from "@/lib/branding";

export default function Root() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{COMPANY_NAME}</h1>
        <p className="mt-2 text-muted-foreground">
          Multi-tenant starter. Sign in as platform operator or open a tenant workspace.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Platform login
        </Link>
        <Link
          href="/admin/auth/login"
          className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium"
        >
          Tenant login
        </Link>
      </div>
    </main>
  );
}
