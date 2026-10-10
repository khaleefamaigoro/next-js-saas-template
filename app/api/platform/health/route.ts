import { NextResponse } from "next/server";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { collectHealthChecks } from "@/lib/platform/health";

export async function GET() {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);
    return NextResponse.json(await collectHealthChecks());
  } catch (error: unknown) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
