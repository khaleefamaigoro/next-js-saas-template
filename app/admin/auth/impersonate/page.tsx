import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { createSession } from "@/lib/auth/session";
import { headers } from "next/headers";

export default async function ImpersonatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/admin/auth/login");

  const grant = await prisma.impersonationGrant.findUnique({ where: { token } });
  if (!grant || grant.usedAt || grant.expiresAt.getTime() < Date.now()) {
    redirect("/admin/auth/login");
  }

  await prisma.impersonationGrant.update({
    where: { id: grant.id },
    data: { usedAt: new Date() },
  });

  const h = await headers();
  await createSession({
    userId: grant.targetUserId,
    userType: "TENANT",
    tenantId: grant.tenantId,
    scope: "FULL",
    impersonatorUserId: grant.platformUserId,
    ip: h.get("x-forwarded-for"),
    userAgent: h.get("user-agent"),
  });

  redirect("/admin");
}
