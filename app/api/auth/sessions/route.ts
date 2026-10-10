import { prisma } from "@/lib/db/client";
import { getSession, readSessionToken, revokeSession } from "@/lib/auth/session";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { z } from "zod";

async function current() {
  for (const type of ["TENANT", "PLATFORM", "CLIENT"] as const) {
    const session = await getSession(await readSessionToken(type));
    if (session) return session;
  }
  throw new DomainError(401, "unauthorized", "Not signed in.");
}

export async function GET() {
  try {
    const session = await current();
    const rows = await prisma.session.findMany({
      where: {
        userType: session.userType,
        userId: session.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        issuedAt: true,
        expiresAt: true,
        ip: true,
        userAgent: true,
        impersonatorUserId: true,
      },
    });
    return ok({
      currentId: session.id,
      sessions: rows.map((r) => ({
        ...r,
        current: r.id === session.id,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

const DeleteBody = z.object({
  sessionId: z.string().min(1).optional(),
  others: z.boolean().optional(),
});

export async function DELETE(request: Request) {
  try {
    await requireCsrf(request);
    const session = await current();
    const body = DeleteBody.parse(await request.json().catch(() => ({})));
    if (body.others) {
      await prisma.session.updateMany({
        where: {
          userType: session.userType,
          userId: session.userId,
          revokedAt: null,
          id: { not: session.id },
        },
        data: { revokedAt: new Date() },
      });
      return ok({ revoked: "others" });
    }
    if (!body.sessionId) throw new DomainError(400, "validation_error", "sessionId required.");
    if (body.sessionId === session.id) throw new DomainError(400, "current_session", "Sign out to end this session.");
    const target = await prisma.session.findUnique({ where: { id: body.sessionId } });
    if (!target || target.userId !== session.userId || target.userType !== session.userType) {
      throw new DomainError(404, "not_found", "Session not found.");
    }
    await revokeSession(body.sessionId);
    return ok({ revoked: body.sessionId });
  } catch (e) {
    return handleError(e);
  }
}
