import { requireTenantPage } from "@/lib/auth/page-guards";
import { NoAccessView } from "@/components/no-access";

export default async function UnauthorizedPage() {
  await requireTenantPage();
  return <NoAccessView />;
}
