export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="text-sm leading-6">
        We process account data (name, email, company details), authentication logs, and content you put in the
        workspace in order to provide the service. Tenant data is isolated by tenant id. Owners can export workspace
        data from Settings and request deletion, which we action after review.
      </p>
      <p className="text-sm leading-6">
        Payments are processed by Paystack. We store payment references, amounts, and plan status — not full card
        numbers.
      </p>
    </main>
  );
}
