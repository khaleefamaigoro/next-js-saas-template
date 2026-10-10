import { NextResponse } from "next/server";
import { collectHealthChecks } from "@/lib/platform/health";

export async function GET() {
  const report = await collectHealthChecks();
  const publicChecks = {
    app: report.checks.app.healthy,
    database: report.checks.database.healthy,
    email: report.checks.smtp.healthy,
  };
  const operational = Object.values(publicChecks).every(Boolean);
  return NextResponse.json({
    operational,
    lastChecked: report.lastChecked,
    checks: publicChecks,
  });
}
