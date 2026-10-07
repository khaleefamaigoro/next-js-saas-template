import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TenantClientsPage() {
  await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_READ.key);
  const rows = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyName: true,
      status: true,
      lastLoginAt: true,
    },
  });

  return (
    <div>
      <DataTableToolbar title="Clients" createHref="/admin/clients/new" createLabel="Invite client" />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"}
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.companyName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.lastLoginAt ? c.lastLoginAt.toLocaleString() : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
