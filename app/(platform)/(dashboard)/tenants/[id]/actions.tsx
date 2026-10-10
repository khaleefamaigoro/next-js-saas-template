"use client";

import { useState } from "react";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Archive, CheckCircle2, PauseCircle, Plus, Minus, RotateCcw } from "lucide-react";

// ── Lifecycle actions (existing) ────────────────────────────────────────────

export function TenantActions({ tenantId, status }: { tenantId: string; status: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function run(action: "suspend" | "archive" | "restore") {
    setPending(action);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action });
    setPending(null);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "SUSPENDED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("suspend")}>
          <PauseCircle className="size-3.5" />
          {pending === "suspend" ? "…" : "Suspend"}
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("archive")}>
          <Archive className="size-3.5" />
          {pending === "archive" ? "…" : "Archive"}
        </Button>
      ) : null}
      {status !== "ACTIVE" ? (
        <Button size="sm" disabled={pending !== null} onClick={() => run("restore")}>
          <CheckCircle2 className="size-3.5" />
          {pending === "restore" ? "…" : "Restore"}
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={pending !== null}
        onClick={async () => {
          setPending("impersonate");
          const res = await apiPost<{ url: string }>(`/api/platform/tenants/${tenantId}/impersonate`, {});
          setPending(null);
          if (res.error) { alert(res.error.message); return; }
          if (res.data?.url) window.open(res.data.url, "_blank");
        }}
      >
        {pending === "impersonate" ? "…" : "Impersonate"}
      </Button>
    </div>
  );
}

// ── Trial controls ──────────────────────────────────────────────────────────

export function TrialControls({
  tenantId,
  trialDays,
  trialStartedAt,
  trialEndsAt,
}: {
  tenantId: string;
  trialDays: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}) {
  const [pending, setPending] = useState<string | null>(null);

  const endsAt = trialEndsAt ? new Date(trialEndsAt) : null;
  const now = new Date();
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  async function extend(extDays: number) {
    setPending(`extend_${extDays}`);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "extend_trial", days: extDays });
    setPending(null);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  const trialBadge = daysLeft === null
    ? <Badge variant="outline" className="text-muted-foreground">Not started</Badge>
    : daysLeft < 0
    ? <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Expired</Badge>
    : daysLeft <= 5
    ? <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Expiring ({daysLeft}d left)</Badge>
    : <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active ({daysLeft}d left)</Badge>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Trial status</span>
        {trialBadge}
      </div>

      {endsAt && (
        <p className="text-xs text-muted-foreground">
          Started: {trialStartedAt ? new Date(trialStartedAt).toLocaleDateString() : "—"} ·
          Ends: {endsAt.toLocaleDateString()}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Global trial length: <span className="font-medium text-foreground">{trialDays} days</span>
        {" "}
        <a href="/settings" className="underline">Change in settings</a>
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center">Extend by:</span>
        {[7, 14, 30].map((d) => (
          <Button key={d} size="sm" variant="outline" disabled={pending !== null} onClick={() => extend(d)}>
            {pending === `extend_${d}` ? "…" : `+${d}d`}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function PlanSelect({
  tenantId,
  currentKey,
  plans,
}: {
  tenantId: string;
  currentKey: string;
  plans: { key: string; label: string }[];
}) {
  const [pending, setPending] = useState(false);

  async function change(planKey: string) {
    if (planKey === currentKey) return;
    setPending(true);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_plan", planKey });
    setPending(false);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="tenant-plan">Plan</Label>
      <select
        id="tenant-plan"
        className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        value={currentKey}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
      >
        {plans.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Platform controls (capacity limits + feature gates) ─────────────────────

export function PlatformControls({
  tenantId,
  settings,
}: {
  tenantId: string;
  settings: {
    maxUsers: number;
    allowApiAccess: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    featureFlags: Record<string, boolean>;
  };
}) {
  const [values, setValues] = useState(settings);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(patch: Partial<typeof values>) {
    const next = { ...values, ...patch };
    setValues(next);
    setPending(true);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_settings", patch });
    setPending(false);
    if (res.error) { setValues(values); alert(res.error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Toggles */}
      <div className="space-y-3">
        {([
          { key: "maintenanceMode", label: "Maintenance Mode", desc: "Lock tenant out with a maintenance message" },
          { key: "allowApiAccess", label: "API Access", desc: "Allow API key generation" },
        ] as const).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={values[key]}
              disabled={pending}
              onCheckedChange={(v) => save({ [key]: v })}
              aria-label={label}
            />
          </div>
        ))}
      </div>

      {values.maintenanceMode && (
        <div className="space-y-1.5">
          <Label className="text-xs">Maintenance message</Label>
          <Textarea
            value={values.maintenanceMessage}
            onChange={(e) => setValues((p) => ({ ...p, maintenanceMessage: e.target.value }))}
            onBlur={() => save({ maintenanceMessage: values.maintenanceMessage })}
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      )}

      {/* Limits */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: "maxUsers", label: "Max Users" },
        ] as const).map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-xs">{label}</Label>
            <Input
              id={key}
              type="number"
              min={1}
              value={values[key]}
              onChange={(e) => setValues((p) => ({ ...p, [key]: Number(e.target.value) }))}
              onBlur={() => save({ [key]: values[key] })}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Feature flags (JSON object of booleans)</Label>
        <Textarea
          rows={3}
          className="font-mono text-xs"
          defaultValue={JSON.stringify(settings.featureFlags ?? {}, null, 2)}
          onBlur={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as Record<string, boolean>;
              void save({ featureFlags: parsed } as Partial<typeof values>);
            } catch {
              alert("Invalid JSON");
            }
          }}
        />
      </div>
      {saved && <p className="text-xs text-emerald-600">Saved ✓</p>}
    </div>
  );
}

// ── Internal notes ──────────────────────────────────────────────────────────

export function TenantNotesEditor({ tenantId, initialNotes }: { tenantId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setStatus("saving");
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_notes", notes });
    if (res.error) { setStatus("idle"); alert(res.error.message); return; }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Internal notes — not visible to the tenant…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        rows={4}
        className="text-sm resize-none"
      />
      <p className="text-xs text-muted-foreground">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Auto-saves on blur"}
      </p>
    </div>
  );
}

// ── Subscription revoke ─────────────────────────────────────────────────────

export function RevokeSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, setPending] = useState(false);

  async function revoke() {
    const reason = prompt("Reason for revocation (optional):");
    if (reason === null) return; // cancelled
    setPending(true);
    const res = await apiPatch(`/api/platform/subscriptions/${subscriptionId}`, { action: "revoke", revokedReason: reason });
    setPending(false);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={pending} onClick={revoke}>
      {pending ? "…" : "Revoke"}
    </Button>
  );
}