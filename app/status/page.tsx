import { collectHealthChecks } from "@/lib/platform/health";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const report = await collectHealthChecks();
  const rows = [
    { name: "Application", ok: report.checks.app.healthy },
    { name: "Database", ok: report.checks.database.healthy },
    { name: "Email", ok: report.checks.smtp.healthy },
  ];
  const operational = rows.every((r) => r.ok);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-2xl font-semibold">System status</h1>
      <p className={operational ? "text-emerald-700" : "text-destructive"}>
        {operational ? "All systems operational" : "Some systems are degraded"}
      </p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between rounded-md border px-3 py-2 text-sm">
            <span>{r.name}</span>
            <span>{r.ok ? "Up" : "Down"}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Checked {new Date(report.lastChecked).toLocaleString()}</p>
    </main>
  );
}
