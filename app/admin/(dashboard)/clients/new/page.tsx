import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { InviteClientForm } from "./invite-form";

export default async function NewTenantClientPage() {
  await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
  return (
    <div className="space-y-6">
      <PageHeader title="Invite client" backHref="/admin/clients" />
      <InviteClientForm />
    </div>
  );
}
