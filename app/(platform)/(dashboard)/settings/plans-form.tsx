"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformPlan } from "@/lib/platform/plans";

export function PlatformPlansForm({
  initialPlans,
  initialDefaultPlanKey,
  initialTrialDays,
}: {
  initialPlans: PlatformPlan[];
  initialDefaultPlanKey: string;
  initialTrialDays: number;
}) {
  const [plans, setPlans] = useState<PlatformPlan[]>(initialPlans);
  const [defaultPlanKey, setDefaultPlanKey] = useState(initialDefaultPlanKey);
  const [trialDays, setTrialDays] = useState(initialTrialDays);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updatePlan(index: number, patch: Partial<PlatformPlan>) {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await apiPatch("/api/platform/settings", { plans, defaultPlanKey, trialDays });
    setPending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default for new tenants</CardTitle>
          <CardDescription>
            New tenants start on this plan. Trial length applies when the default plan is Trial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="default-plan">Default plan</Label>
            <select
              id="default-plan"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={defaultPlanKey}
              onChange={(e) => setDefaultPlanKey(e.target.value)}
            >
              {plans.filter((p) => p.key).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label || p.key}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="global-trial-days">Trial length (days)</Label>
            <Input
              id="global-trial-days"
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-28"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plans</CardTitle>
          <CardDescription>
            Labels shown on tenant accounts (Trial, Pro, Enterprise by default).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Price (kobo)</TableHead>
              <TableHead>API</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan, i) => (
              <TableRow key={`${plan.key}-${i}`}>
                <TableCell>
                  <Input
                    value={plan.key}
                    onChange={(e) => updatePlan(i, { key: e.target.value.toLowerCase() })}
                    placeholder="pro"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={plan.label}
                    onChange={(e) => updatePlan(i, { label: e.target.value })}
                    placeholder="Pro"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={plan.maxUsers}
                    onChange={(e) => updatePlan(i, { maxUsers: Number(e.target.value) })}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={plan.priceKobo}
                    onChange={(e) => updatePlan(i, { priceKobo: Number(e.target.value) })}
                    className="w-32"
                  />
                </TableCell>
                <TableCell>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={plan.allowApiAccess}
                      onChange={(e) => updatePlan(i, { allowApiAccess: e.target.checked })}
                    />
                    API
                  </label>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={plans.length <= 1}
                    onClick={() => {
                      const next = plans.filter((_, j) => j !== i);
                      setPlans(next);
                      if (!next.some((p) => p.key === defaultPlanKey) && next[0]) {
                        setDefaultPlanKey(next[0].key);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPlans((p) => [...p, { key: "", label: "", maxUsers: 10, allowApiAccess: false, priceKobo: 0 }])}
        >
          Add plan
        </Button>
        </CardContent>
      </Card>

      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save plans"}
      </Button>
      {saved ? <p className="text-xs text-emerald-600">Saved.</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
