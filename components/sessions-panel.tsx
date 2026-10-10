"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet } from "@/lib/client/api";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  issuedAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
};

export function SessionsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiGet<{ sessions: Row[] }>("/api/auth/sessions");
    if (res.error) setError(res.error.message);
    else setRows(res.data?.sessions ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function revoke(sessionId?: string, others?: boolean) {
    const res = await apiDelete("/api/auth/sessions", others ? { others: true } : { sessionId });
    if (res.error) setError(res.error.message);
    else await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Active sessions</h2>
        <Button size="sm" variant="outline" onClick={() => revoke(undefined, true)}>
          Sign out other devices
        </Button>
      </div>
      {rows.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate">{s.userAgent ?? "Unknown device"}{s.current ? " · this device" : ""}</p>
            <p className="text-xs text-muted-foreground">{s.ip ?? "—"} · {new Date(s.issuedAt).toLocaleString()}</p>
          </div>
          {!s.current ? (
            <Button size="sm" variant="outline" onClick={() => revoke(s.id)}>Revoke</Button>
          ) : null}
        </div>
      ))}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
