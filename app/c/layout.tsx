import { requireExistingTenant } from "@/lib/auth/tenant-page";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExistingTenant();
  return <>{children}</>;
}
