import { requireTenantPage } from "@/lib/auth/page-guards"
import { prisma } from "@/lib/db/client"
import { format } from "date-fns"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function TenantOverviewPage() {
  const actor = await requireTenantPage()

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User"

  const [userCount] = await Promise.all([
    prisma.tenantUser.count({ where: { tenantId: actor.tenantId } }),
  ])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-xl font-bold tracking-tight">
            Hi, welcome back {userName}
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Workspace users</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next</CardDescription>
            <CardTitle className="text-base font-medium">
              Add your product models, permissions, and nav items. Isolation and auth stay as they are.
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
