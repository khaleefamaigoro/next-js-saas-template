"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  HardDrive,
  Mail,
  Activity,
  Server,
  CreditCard,
  Info,
  CircleOff,
} from "lucide-react";

type CheckState = {
  healthy: boolean;
  configured: boolean;
  latencyMs: number;
};

type HealthResponse = {
  lastChecked: string;
  checks: {
    database: CheckState;
    s3: CheckState;
    smtp: CheckState;
    redis: CheckState;
    app: CheckState;
    paystack: CheckState;
  };
};

const CARDS: {
  id: keyof HealthResponse["checks"];
  title: string;
  icon: typeof Database;
  tone: string;
  helper: string;
  impact: string;
}[] = [
  {
    id: "database",
    title: "Database",
    icon: Database,
    tone: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    helper: "PostgreSQL used for tenants, auth, sessions, and billing history.",
    impact: "If this is down, every login, API, and dashboard query will fail.",
  },
  {
    id: "s3",
    title: "Object storage",
    icon: HardDrive,
    tone: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    helper: "S3 / MinIO for tenant logos and branding uploads. Optional in local dev.",
    impact: "Logos and file uploads fail until a bucket is configured and reachable.",
  },
  {
    id: "smtp",
    title: "SMTP email",
    icon: Mail,
    tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    helper: "Outbound mail for invites, OTP, and password reset.",
    impact: "Users cannot receive invite or reset emails while SMTP is unreachable.",
  },
  {
    id: "redis",
    title: "Redis cache",
    icon: Activity,
    tone: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
    helper: "Upstash Redis for login/OTP rate limits. Unset means limits fail open.",
    impact: "Without Redis, rate limiting is skipped; auth still works.",
  },
  {
    id: "app",
    title: "Application API",
    icon: Server,
    tone: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    helper: "This health endpoint itself. A 200 here means the app process is serving requests.",
    impact: "If this check cannot load, the platform UI and APIs are unavailable.",
  },
  {
    id: "paystack",
    title: "Paystack",
    icon: CreditCard,
    tone: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    helper: "Secret key used to verify billing webhooks. Optional until live payments are enabled.",
    impact: "Webhooks cannot be verified until PAYSTACK_SECRET_KEY is set.",
  },
];

function statusLabel(check: CheckState | undefined, loading: boolean) {
  if (loading || !check) return "Checking";
  if (!check.configured) return "Not configured";
  return check.healthy ? "Healthy" : "Unreachable";
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/health");
      if (!res.ok) throw new Error("Failed to fetch health status");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title="System Health Monitoring" />
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Refresh
          </button>
        </div>
        {data?.lastChecked ? (
          <p className="text-xs text-muted-foreground -mt-4">
            Last checked {new Date(data.lastChecked).toLocaleString()}
          </p>
        ) : null}

        {error ? (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-600 font-medium">Error loading health data: {error}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARDS.map((card) => {
              const Icon = card.icon;
              const check = data?.checks[card.id];
              const label = statusLabel(check, loading);
              return (
                <Card key={card.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${card.tone}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-base">{card.title}</CardTitle>
                      </div>
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
                      ) : !check?.configured ? (
                        <CircleOff className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : check.healthy ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </div>
                    <CardDescription className="pt-2">{card.helper}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{label}</Badge>
                      {typeof check?.latencyMs === "number" && check.configured ? (
                        <span>{check.latencyMs} ms</span>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                            <Info className="size-3.5" />
                            <span className="sr-only">More about this check</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{card.impact}</TooltipContent>
                      </Tooltip>
                    </div>
                    <p>{card.impact}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
