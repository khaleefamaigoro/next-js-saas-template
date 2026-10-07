"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  Building,
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printElement, getExportFileBaseName } from "@/components/tables/table-export";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilterField,
} from "@/components/tables";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { getActivityStatus, type ActivityStatus } from "@/lib/activity/status";
import { cn } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  userAgent?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  createdAt: string;
  tenantDisplay?: string | null;
  actorDisplay?: string | null;
  targetDisplay?: string | null;
  status?: ActivityStatus;
};

export type TenantOption = {
  id: string;
  name: string;
  slug: string;
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type ActivityStats = {
  total: number;
  success: number;
  failed: number;
  today: number;
};

const statusColor: Record<ActivityStatus, string> = {
  SUCCESS: "#0d9488",
  FAILED: "#e11d48",
};

function ActivityInsightCards({ stats }: { stats: ActivityStats }) {
  const items = [
    { key: "total", label: "Total Events", value: stats.total, color: "#4f46e5" },
    { key: "success", label: "Successful", value: stats.success, color: statusColor.SUCCESS },
    { key: "failed", label: "Failed", value: stats.failed, color: statusColor.FAILED },
    { key: "today", label: "Today", value: stats.today, color: "#d97706" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="flex min-w-0 items-center gap-2">
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-sm font-semibold text-card-foreground">
                  {item.value.toLocaleString()}
                </span>
                <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-card-foreground">Outcome breakdown</p>
          <div className="grid gap-2">
            {(["SUCCESS", "FAILED"] as ActivityStatus[]).map((status) => {
              const count = status === "SUCCESS" ? stats.success : stats.failed;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: statusColor[status] }}
                    />
                    {status === "SUCCESS" ? "Successful" : "Failed"}
                  </span>
                  <span className="font-mono font-medium text-card-foreground">
                    {count.toLocaleString()} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ActivityTable({
  initialData,
  initialMeta,
  availableTenants = [],
  availableUsers = [],
  moduleContext,
}: {
  initialData: ActivityRow[];
  initialMeta: Record<string, unknown> | null;
  availableTenants?: TenantOption[];
  availableUsers?: UserOption[];
  moduleContext?: "STATION" | "FLEET";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlAction = searchParams.get("action") ?? "";
  const urlDateStr = searchParams.get("date") ?? "";
  const urlUserId = searchParams.get("userId") ?? "";
  const urlTenantId = searchParams.get("tenantId") ?? "";
  const urlStatus = (searchParams.get("status") as ActivityStatus | "") ?? "";

  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!urlDateStr) return undefined;
    const parsed = new Date(urlDateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  });
  const [userId, setUserId] = React.useState(urlUserId);
  const [tenantId, setTenantId] = React.useState(urlTenantId);
  const [action, setAction] = React.useState(urlAction);
  const [status, setStatus] = React.useState<ActivityStatus | "">(urlStatus);
  const [openUser, setOpenUser] = React.useState(false);
  const [openTenant, setOpenTenant] = React.useState(false);
  const [openDate, setOpenDate] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRow | null>(null);

  const [debouncedAction, setDebouncedAction] = React.useState(action);

  // Debounce action search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAction(action);
    }, 350);
    return () => clearTimeout(handler);
  }, [action]);

  // Synchronize filter state into URL parameters
  const isFirstRenderRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedAction.trim()) params.set("action", debouncedAction.trim());
    else params.delete("action");

    if (date) params.set("date", format(date, "yyyy-MM-dd"));
    else params.delete("date");

    if (userId) params.set("userId", userId);
    else params.delete("userId");

    if (tenantId) params.set("tenantId", tenantId);
    else params.delete("tenantId");

    if (status) params.set("status", status);
    else params.delete("status");

    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedAction, date, userId, tenantId, status]);

  const additionalParams = React.useMemo(
    () => ({
      ...(debouncedAction.trim() ? { action: debouncedAction.trim() } : {}),
      ...(date ? { date: format(date, "yyyy-MM-dd") } : {}),
      ...(userId ? { userId } : {}),
      ...(tenantId ? { tenantId } : {}),
      ...(status ? { status } : {}),
      ...(moduleContext ? { module: moduleContext } : {}),
    }),
    [debouncedAction, date, userId, tenantId, status, moduleContext]
  );

  const { data, meta, isLoading, setPage, setPageSize, refresh } =
    usePaginatedQuery<ActivityRow>({
      baseUrl: "/api/platform/activity-logs",
      initialData,
      initialMeta,
      additionalParams,
      syncWithUrl: true,
    });

  const rows = data;

  const stats: ActivityStats = (meta as { stats?: ActivityStats }).stats ?? {
    total: (meta.totalCount as number) ?? initialData.length,
    success: initialData.filter((r) => (r.status ?? getActivityStatus(r.action)) === "SUCCESS").length,
    failed: initialData.filter((r) => (r.status ?? getActivityStatus(r.action)) === "FAILED").length,
    today: initialData.filter((r) => {
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  const selectedUser = availableUsers.find((u) => u.id === userId);
  const selectedTenant =
    tenantId === "PLATFORM"
      ? { id: "PLATFORM", name: "Platform System", slug: "system" }
      : availableTenants.find((t) => t.id === tenantId);

  const isFiltered = Boolean(date || userId || tenantId || action || status);

  const handleReset = () => {
    setDate(undefined);
    setUserId("");
    setTenantId("");
    setAction("");
    setStatus("");
    setDebouncedAction("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.delete("date");
    params.delete("userId");
    params.delete("tenantId");
    params.delete("status");
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const tableEl =
      tableContainerRef.current?.querySelector("table") ||
      document.querySelector('[data-slot="table-container"] table') ||
      document.querySelector("table");
    if (tableEl) {
      printElement(
        tableEl as HTMLElement,
        "Platform Activity Log",
        undefined,
        getExportFileBaseName("platform-activity")
      );
    } else {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const headers = ["Time", "Status", "Tenant", "Actor", "Action", "Target", "IP Address"];
    const csvRows = rows.map((r) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
      r.status ?? getActivityStatus(r.action),
      r.tenantDisplay ?? (r.tenantId === null ? "Platform System" : r.tenantId ?? "—"),
      r.actorDisplay || `${r.actorType}:${r.actorId || "—"}`,
      r.action,
      r.targetDisplay || (r.targetType ? `${r.targetType}:${r.targetId || "—"}` : "—"),
      r.ip || "—",
    ]);

    const escape = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;
    const csvContent = [headers, ...csvRows]
      .map((line) => line.map(escape).join(","))
      .join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `${getExportFileBaseName("platform-activity")}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const headers = ["Time", "Status", "Tenant", "Actor", "Action", "Target", "IP Address"];
    const excelRows = rows.map((r) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
      r.status ?? getActivityStatus(r.action),
      r.tenantDisplay ?? (r.tenantId === null ? "Platform System" : r.tenantId ?? "—"),
      r.actorDisplay || `${r.actorType}:${r.actorId || "—"}`,
      r.action,
      r.targetDisplay || (r.targetType ? `${r.targetType}:${r.targetId || "—"}` : "—"),
      r.ip || "—",
    ]);

    const escapeHtml = (val: string) =>
      (val || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<table border="1">
<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${excelRows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>
</table>
</body>
</html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const filename = `${getExportFileBaseName("platform-activity")}.xls`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = React.useMemo<ColumnDef<ActivityRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
        meta: { label: "Time" },
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-xs text-foreground">
                {format(d, "MMM dd, yyyy")}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                {format(d, "HH:mm:ss")}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (r) => r.status ?? getActivityStatus(r.action),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => {
          const value = (row.original.status ?? getActivityStatus(row.original.action)) as ActivityStatus;
          const isSuccess = value === "SUCCESS";
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
                isSuccess
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="size-3 text-rose-500 shrink-0" />
              )}
              {isSuccess ? "Success" : "Failed"}
            </span>
          );
        },
      },
      {
        id: "tenant",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tenant" />,
        meta: { label: "Tenant" },
        accessorFn: (r) => r.tenantDisplay ?? (r.tenantId === null ? "Platform System" : r.tenantId ?? "—"),
        cell: ({ row }) => {
          const isPlatform = row.original.tenantId === null;
          const display = row.original.tenantDisplay;
          if (isPlatform) {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="size-3 shrink-0 text-indigo-500" />
                Platform System
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="size-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate text-xs font-medium text-foreground">
                {display || row.original.tenantId || "—"}
              </span>
            </div>
          );
        },
      },
      {
        id: "actor",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Actor" />,
        meta: { label: "Actor" },
        accessorFn: (r) => r.actorDisplay ?? `${r.actorType}:${r.actorId ?? "—"}`,
        cell: ({ row }) => {
          const actorType = row.original.actorType;
          const display = row.original.actorDisplay;
          const initial = display ? display.charAt(0).toUpperCase() : actorType.charAt(0);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                {initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-medium text-foreground">
                  {display || "—"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {actorType.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "action",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
        meta: { label: "Action" },
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground border border-border/50">
            {row.original.action}
          </span>
        ),
      },
      {
        id: "target",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
        meta: { label: "Target" },
        accessorFn: (r) =>
          r.targetDisplay ?? (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
        cell: ({ row }) => (
          <span className="truncate text-xs text-foreground font-medium block max-w-[240px]">
            {row.original.targetDisplay ?? (row.original.targetType ? `${row.original.targetType}:${row.original.targetId || "—"}` : "—")}
          </span>
        ),
      },
      {
        accessorKey: "ip",
        header: ({ column }) => <DataTableColumnHeader column={column} title="IP Address" />,
        meta: { label: "IP" },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        meta: { exportable: false },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer no-print"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActivity(row.original);
            }}
            title="View details"
          >
            <Eye className="size-4" />
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-5" ref={tableContainerRef}>
      {/* KPI Stats Cards */}
      <ActivityInsightCards stats={stats} />

      {/* Main Table Container */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-xs">
        {/* Top Controls Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Action Search Input */}
          <div className="relative w-full sm:w-72 md:w-80 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search action keyword..."
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs bg-background/50"
            />
            {action && (
              <button
                type="button"
                onClick={() => setAction("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleReset}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 bg-background/50"
                  onClick={() => refresh()}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh logs</TooltipContent>
            </Tooltip>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs bg-background/50 font-normal"
                >
                  <Download className="size-3.5" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleExportCsv} className="text-xs cursor-pointer">
                  <FileText className="mr-2 size-3.5 text-muted-foreground" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="text-xs cursor-pointer">
                  <FileSpreadsheet className="mr-2 size-3.5 text-muted-foreground" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint} className="text-xs cursor-pointer">
                  <Printer className="mr-2 size-3.5 text-muted-foreground" />
                  Print view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter Bar Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/30">
          {/* Tenant Selector Combobox */}
          <Popover open={openTenant} onOpenChange={setOpenTenant}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openTenant}
                className={cn(
                  "h-8 justify-between font-normal text-xs bg-background/50 min-w-[170px] max-w-[220px]",
                  !tenantId && "text-muted-foreground"
                )}
              >
                <Building2 className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {selectedTenant ? selectedTenant.name : "All Tenants & Platform"}
                </span>
                <ChevronsUpDown className="ml-1.5 size-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search tenant..." className="text-xs" />
                <CommandList>
                  <CommandEmpty>No tenant found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setTenantId("");
                        setOpenTenant(false);
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-3.5",
                          !tenantId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">All Tenants & Platform</span>
                    </CommandItem>
                    <CommandItem
                      value="platform system only"
                      onSelect={() => {
                        setTenantId(tenantId === "PLATFORM" ? "" : "PLATFORM");
                        setOpenTenant(false);
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-3.5",
                          tenantId === "PLATFORM" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <ShieldCheck className="mr-1.5 size-3.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        Platform System Only
                      </span>
                    </CommandItem>
                    {availableTenants.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.name} ${t.slug}`}
                        onSelect={() => {
                          setTenantId(tenantId === t.id ? "" : t.id);
                          setOpenTenant(false);
                        }}
                        className="text-xs"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3.5",
                            tenantId === t.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col truncate">
                          <span className="truncate">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{t.slug}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* User Combobox */}
          <Popover open={openUser} onOpenChange={setOpenUser}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openUser}
                className={cn(
                  "h-8 justify-between font-normal text-xs bg-background/50 min-w-[150px] max-w-[200px]",
                  !userId && "text-muted-foreground"
                )}
              >
                <User className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {selectedUser ? selectedUser.name : "Filter by user..."}
                </span>
                <ChevronsUpDown className="ml-1.5 size-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search user..." className="text-xs" />
                <CommandList>
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-users"
                      onSelect={() => {
                        setUserId("");
                        setOpenUser(false);
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={cn("mr-2 size-3.5", !userId ? "opacity-100" : "opacity-0")}
                      />
                      <span>All Users</span>
                    </CommandItem>
                    {availableUsers.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.name} ${u.email} ${u.role || ""}`}
                        onSelect={() => {
                          setUserId(userId === u.id ? "" : u.id);
                          setOpenUser(false);
                        }}
                        className="text-xs"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3.5",
                            userId === u.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col truncate">
                          <span className="truncate font-medium">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {u.role ? `${u.role} · ` : ""}
                            {u.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Date Picker */}
          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 justify-start text-left font-normal text-xs bg-background/50 min-w-[140px]",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                {date ? format(date, "MMM dd, yyyy") : <span>Filter by date...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(day) => {
                  setDate(day);
                  setOpenDate(false);
                }}
              />
              {date && (
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setDate(undefined);
                      setOpenDate(false);
                    }}
                  >
                    Clear Date Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Status Filter Toggle Pills */}
          <div className="flex items-center rounded-lg border border-border/50 bg-muted/40 p-0.5">
            {(
              [
                { label: "All", value: "" },
                { label: "Success", value: "SUCCESS" },
                { label: "Failed", value: "FAILED" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(status === opt.value ? "" : opt.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  status === opt.value
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          serverPagination={{
            ...meta,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>

      {/* Activity Details Modal */}
      <Dialog
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedActivity && (
            <>
              <DialogHeader className="gap-1 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Activity Details
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
                        (selectedActivity.status ?? getActivityStatus(selectedActivity.action)) === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {(selectedActivity.status ?? getActivityStatus(selectedActivity.action)) === "SUCCESS" ? (
                        <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="size-3 text-rose-500 shrink-0" />
                      )}
                      {(selectedActivity.status ?? getActivityStatus(selectedActivity.action)) === "SUCCESS"
                        ? "Success"
                        : "Failed"}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs bg-muted/40">
                      {selectedActivity.action}
                    </Badge>
                  </div>
                </div>
                <DialogDescription className="text-xs">
                  Logged on {format(new Date(selectedActivity.createdAt), "PPP 'at' pp")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      Actor / User
                    </span>
                    <p className="font-semibold text-foreground">
                      {selectedActivity.actorDisplay || selectedActivity.actorType || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Type: {selectedActivity.actorType} · ID: {selectedActivity.actorId || "—"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      Tenant
                    </span>
                    <p className="font-semibold text-foreground">
                      {selectedActivity.tenantDisplay ??
                        (selectedActivity.tenantId === null ? "Platform System" : selectedActivity.tenantId ?? "—")}
                    </p>
                    {selectedActivity.tenantId && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Tenant ID: {selectedActivity.tenantId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      Target Entity
                    </span>
                    <p className="font-semibold text-foreground">
                      {selectedActivity.targetDisplay || selectedActivity.targetType || "—"}
                    </p>
                    {selectedActivity.targetId && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {selectedActivity.targetType}: {selectedActivity.targetId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      IP Address
                    </span>
                    <p className="font-mono text-foreground">{selectedActivity.ip || "—"}</p>
                  </div>

                  {selectedActivity.userAgent && (
                    <div className="sm:col-span-2 space-y-1">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                        User Agent
                      </span>
                      <p className="font-mono text-[11px] text-muted-foreground break-all bg-muted/30 p-2.5 rounded-md border border-border/40">
                        {selectedActivity.userAgent}
                      </p>
                    </div>
                  )}
                </div>

                {Boolean(selectedActivity.afterJson || selectedActivity.beforeJson) && (
                  <div className="space-y-4 pt-3 border-t border-border/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Payload & Audit Data
                    </h4>

                    {Boolean(selectedActivity.afterJson) && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          New State / Payload:
                        </span>
                        <pre className="p-3 bg-muted/40 rounded-lg text-xs font-mono overflow-x-auto border border-border/40 max-h-60">
                          {JSON.stringify(selectedActivity.afterJson, null, 2)}
                        </pre>
                      </div>
                    )}

                    {Boolean(selectedActivity.beforeJson) && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Previous State:
                        </span>
                        <pre className="p-3 bg-muted/40 rounded-lg text-xs font-mono overflow-x-auto border border-border/40 max-h-60">
                          {JSON.stringify(selectedActivity.beforeJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setSelectedActivity(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
