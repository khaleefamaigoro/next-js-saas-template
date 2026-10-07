import { prisma } from "@/lib/db/client";
import { requireClientPage } from "@/lib/auth/page-guards";
import { AppShell } from "@/components/shell";
import { displayName } from "@/lib/auth/display";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientDashboardPage() {
  const actor = await requireClientPage();
  const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true },
  });
  const label = client ? displayName(client) : "Client";

  return (
    <AppShell
      title={tenant?.name ?? "Workspace"}
      nav={[
        { href: "/dashboard", label: "Home" },
        { href: "/profile", label: "Profile" },
      ]}
      userLabel={label}
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/auth/login"
      logoutContext="client"
    >
      <Card>
        <CardHeader>
          <CardTitle>Welcome{label ? `, ${label}` : ""}</CardTitle>
          <CardDescription>
            This is your client workspace. Product features for this tenant go here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Signed in as <span className="font-medium text-foreground">{client?.email}</span>
            {client?.companyName ? <> · {client.companyName}</> : null}.
          </p>
          <p className="mt-4">
            <Link href="/profile" className="underline">
              Update your profile
            </Link>
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
