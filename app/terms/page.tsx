export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Terms of service</h1>
      <p className="text-sm text-muted-foreground">Last updated {new Date().getFullYear()}.</p>
      <p className="text-sm leading-6">
        This workspace software is provided as a multi-tenant SaaS. You must keep credentials confidential, use the
        product lawfully, and remain responsible for data you store. Paid plans renew monthly until cancelled. We may
        suspend workspaces that violate these terms or whose trial or subscription has ended.
      </p>
      <p className="text-sm leading-6">
        Contact the platform operator for a signed order form or DPA if you require one for your organization.
      </p>
    </main>
  );
}
