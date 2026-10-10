export default function DpaPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Data processing addendum</h1>
      <p className="text-sm leading-6">
        For NDPA and similar regimes: the customer is the controller of workspace data; the platform is the processor.
        Processing is limited to hosting, support, billing, and security. Sub-processors may include email delivery,
        object storage, and Paystack. Data is retained while the tenant is active, then deleted or anonymized after
        archive, subject to legal holds.
      </p>
      <p className="text-sm leading-6">
        This page is a baseline notice, not a substitute for a negotiated DPA. Request a signed copy from the platform
        operator.
      </p>
    </main>
  );
}
