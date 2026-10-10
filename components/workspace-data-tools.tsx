"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";

export function WorkspaceDataTools({ isOwner }: { isOwner: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOwner) return null;

  async function requestDeletion() {
    if (!confirm("Request deletion of this workspace? The platform team will review it.")) return;
    const res = await apiPost("/api/tenant/deletion-request", {});
    setMsg(res.error ? res.error.message : "Deletion request sent.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" asChild>
        <a href="/api/tenant/export">Export workspace JSON</a>
      </Button>
      <Button size="sm" variant="destructive" onClick={requestDeletion}>
        Request deletion
      </Button>
      {msg ? <p className="w-full text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
