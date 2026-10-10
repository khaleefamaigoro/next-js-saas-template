import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { UnauthorizedToast } from "@/components/unauthorized-toast";
import { getPlatformSettings } from "@/lib/platform/settings";
import { isTrialPlan, planLabel, trialDaysRemaining } from "@/lib/platform/plans";

const ADMIN_NAV = [
  {
    href: "/admin",
    title: "Overview",
    icon: "DashboardSquare01Icon",
    permission: PERMISSIONS.TENANT_USERS_READ.key,
  },
  {
    href: "/admin/users",
    title: "Users",
    icon: "UserAccountIcon",
    permission: PERMISSIONS.TENANT_USERS_READ.key,
  },
  {
    href: "/admin/clients",
    title: "Clients",
    icon: "UserGroupIcon",
    permission: PERMISSIONS.TENANT_CLIENTS_READ.key,
  },
  {
    href: "/admin/role-templates",
    title: "Roles",
    icon: "Shield01Icon",
    permission: PERMISSIONS.TENANT_ROLES_READ.key,
  },
  {
    href: "/admin/activity",
    title: "Activity",
    icon: "Activity01Icon",
    permission: PERMISSIONS.TENANT_ACTIVITY_READ.key,
  },
  {
    href: "/admin/notifications",
    title: "Notifications",
    icon: "IconBell",
    permission: PERMISSIONS.TENANT_NOTIFICATIONS_READ.key,
  },
  {
    href: "/admin/billing",
    title: "Billing",
    icon: "IconSettings",
    permission: PERMISSIONS.TENANT_SETTINGS_READ.key,
  },
  {
    href: "/admin/settings",
    title: "Settings",
    icon: "IconSettings",
    permission: PERMISSIONS.TENANT_SETTINGS_READ.key,
  },
];

export default async function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireTenantPage();

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { email: true, firstName: true, lastName: true, fleetPermissions: true, stationPermissions: true },
  });
  if (!user) redirect("/admin/auth/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: {
      name: true,
      slug: true,
      status: true,
      settingsJson: true,
      companyEmail: true,
      companyPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
      planKey: true,
      trialEndsAt: true,
    },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  const platformSettings = await getPlatformSettings();
  const resolvedPlanLabel = planLabel(platformSettings.plans, tenant.planKey);
  const daysRemaining = isTrialPlan(tenant.planKey) ? trialDaysRemaining(tenant.trialEndsAt) : null;

  const settings = parseTenantSettings(tenant.settingsJson);

  const logoUrl =
    settings.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings.logoKey && s3Configured()
        ? publicUrlForKey(settings.logoKey)
        : null;

  const permSet = new Set([...user.fleetPermissions, ...user.stationPermissions]);
  const canSeeNav = (permission: string | null | undefined) => {
    if (!permission) return true;
    if (actor.isOwner) return true;
    return permSet.has(permission);
  };

  const nav = ADMIN_NAV.filter((n) => canSeeNav(n.permission)).map((n) => ({
    href: n.href,
    title: n.title,
    icon: n.icon,
  }));

  const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  return (
    <DashboardLayoutShell
      title={tenant.name ?? "Tenant"}
      logoUrl={logoUrl}
      navItems={nav}
      user={{ name: label, email: user.email }}
      roleLabel={actor.isOwner ? "Owner" : "Admin"}
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/admin/auth/login"
      logoutContext="tenant-admin"
      enabledModules={settings.enabledModules}
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: logoUrl,
        email: tenant.companyEmail,
        phone: tenant.companyPhone,
        address:
          [tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.region]
            .filter(Boolean)
            .join(", ") || null,
      }}
      profileHref="/admin/profile"
      planBadge={{ key: tenant.planKey, label: resolvedPlanLabel }}
      trialDaysRemaining={daysRemaining}
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}
