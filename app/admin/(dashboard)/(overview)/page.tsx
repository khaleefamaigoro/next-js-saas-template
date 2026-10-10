import { requireTenantPage } from "@/lib/auth/page-guards"
import { prisma } from "@/lib/db/client"
import { format } from "date-fns"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
<<<<<<< HEAD
import { getTranslations } from "next-intl/server"
import { parseTenantSettings } from "@/lib/tenant/settings"
import Link from "next/link"

export default async function TenantOverviewPage() {
  const actor = await requireTenantPage()
  const t = await getTranslations("overview")
=======

export default async function TenantOverviewPage() {
  const actor = await requireTenantPage()
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User"

<<<<<<< HEAD
  const [userCount, clientCount, tenant] = await Promise.all([
    prisma.tenantUser.count({ where: { tenantId: actor.tenantId } }),
    prisma.client.count({ where: { tenantId: actor.tenantId } }),
    prisma.tenant.findUnique({ where: { id: actor.tenantId }, select: { settingsJson: true } }),
  ])
  const settings = parseTenantSettings(tenant?.settingsJson)

  const steps = [
    { done: Boolean(settings.logoKey), href: "/admin/settings", label: t("stepLogo") },
    { done: userCount > 1, href: "/admin/users/new", label: t("stepInvite") },
    { done: clientCount > 0, href: "/admin/clients/new", label: t("stepClient") },
  ]
=======
  const [userCount] = await Promise.all([
    prisma.tenantUser.count({ where: { tenantId: actor.tenantId } }),
  ])
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-xl font-bold tracking-tight">
<<<<<<< HEAD
            {t("welcome", { name: userName })}
=======
            Hi, welcome back {userName}
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
<<<<<<< HEAD
            <CardDescription>{t("users")}</CardDescription>
=======
            <CardDescription>Workspace users</CardDescription>
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
<<<<<<< HEAD
            <CardDescription>{t("checklist")}</CardDescription>
            <ul className="text-sm space-y-1">
              {steps.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="underline-offset-2 hover:underline">
                    {s.done ? "✓" : "○"} {s.label}
                  </Link>
                </li>
              ))}
            </ul>
=======
            <CardDescription>Next</CardDescription>
            <CardTitle className="text-base font-medium">
              Add your product models, permissions, and nav items. Isolation and auth stay as they are.
            </CardTitle>
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
