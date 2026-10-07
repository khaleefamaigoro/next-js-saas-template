import { prisma } from "@/lib/db/client";
import { requireClientPage } from "@/lib/auth/page-guards";
import { AppShell } from "@/components/shell";
import { displayName } from "@/lib/auth/display";
import { ClientProfileForm } from "./profile-form";
import { notFound } from "next/navigation";

export default async function ClientProfilePage() {
  const actor = await requireClientPage();
  const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
  if (!client) notFound();
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true },
  });
  const profile = (client.profileJson as { name?: string } | null) ?? {};

  return (
    <AppShell
      title={tenant?.name ?? "Workspace"}
      nav={[
        { href: "/dashboard", label: "Home" },
        { href: "/profile", label: "Profile" },
      ]}
      userLabel={displayName(client)}
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/auth/login"
      logoutContext="client"
    >
      <ClientProfileForm
        initial={{
          displayName: typeof profile.name === "string" ? profile.name : displayName(client),
          firstName: client.firstName ?? "",
          lastName: client.lastName ?? "",
          otherName: client.otherName ?? "",
          phone: client.phone ?? "",
          companyName: client.companyName ?? "",
          address: client.address ?? "",
          contactPerson: client.contactPerson ?? "",
        }}
      />
    </AppShell>
  );
}
