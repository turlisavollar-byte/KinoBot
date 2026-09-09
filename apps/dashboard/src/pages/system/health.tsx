import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Database, Bot, HardDrive, Search, Layers, Zap, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: "ok" | "error";
    bot: "running" | "stopped";
    cache: "ok" | "stub";
    queue: "ok" | "stub";
    storage: "ok" | "stub";
    search: "ok" | "stub";
  };
}

const SERVICE_META: Record<string, { icon: React.ElementType; label: string }> = {
  database:  { icon: Database, label: "PostgreSQL" },
  bot:       { icon: Bot,      label: "Telegram Bot" },
  cache:     { icon: Zap,      label: "Redis Cache" },
  queue:     { icon: Layers,   label: "Job Queue" },
  storage:   { icon: HardDrive, label: "Object Storage" },
  search:    { icon: Search,   label: "Elasticsearch" },
};

function statusColor(s: string) {
  if (s === "ok" || s === "running") return "text-emerald-400";
  if (s === "error" || s === "down") return "text-red-400";
  return "text-amber-400";
}

function statusLabel(s: string) {
  if (s === "ok")      return { text: "Operational", variant: "default" } as const;
  if (s === "running") return { text: "Running",     variant: "default" } as const;
  if (s === "error")   return { text: "Error",       variant: "destructive" } as const;
  if (s === "stub")    return { text: "Stub (dev)",  variant: "secondary" } as const;
  return { text: s, variant: "secondary" } as const;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function SystemHealth() {
  const { t } = useI18n();
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ["system-health"],
    queryFn: () => apiFetch<HealthResponse>("/api/health"),
    refetchInterval: 30_000,
  });

  const overallOk = data?.status === "ok";

  return (
    <div>
      <PageHeader
        title={t("system.health.title")}
        subtitle={t("system.health.subtitle")}
      >
        <span className="text-xs text-muted-foreground">
          {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}
        </span>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      </PageHeader>

      {/* Overall Status Banner */}
      <div className={cn(
        "rounded-xl border p-4 mb-8 flex items-center gap-3",
        overallOk
          ? "bg-emerald-950/30 border-emerald-800/40"
          : "bg-red-950/30 border-red-800/40",
      )}>
        <div className={cn(
          "h-3 w-3 rounded-full animate-pulse",
          overallOk ? "bg-emerald-400" : "bg-red-400",
        )} />
        <div>
          <p className={cn("font-semibold", overallOk ? "text-emerald-300" : "text-red-300")}>
            {isLoading ? t("system.health.checking") : overallOk ? t("system.health.allOperational") : `System ${data?.status?.toUpperCase()}`}
          </p>
          {data && (
            <p className="text-xs text-muted-foreground">
              {t("system.health.version")} {data.version} · {t("system.health.uptime")} {formatUptime(data.uptime)}
            </p>
          )}
        </div>
      </div>

      {/* Service Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : Object.entries(data?.services ?? {}).map(([key, value]) => {
              const meta = SERVICE_META[key] ?? { icon: Server, label: key };
              const Icon = meta.icon;
              const { text, variant } = statusLabel(value);
              return (
                <Card key={key} className="transition-all hover:border-border/80">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-lg bg-muted/60", statusColor(value))}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{meta.label}</p>
                      <Badge variant={variant} className="mt-1 text-xs">{text}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Server Info */}
      {data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" /> {t("system.health.serverInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t("system.health.status"),    value: data.status.toUpperCase() },
                { label: t("system.health.version"),   value: data.version },
                { label: t("system.health.uptime"),    value: formatUptime(data.uptime) },
                { label: t("system.health.checked"),   value: new Date(data.timestamp).toLocaleTimeString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
                  <dd className="font-mono text-sm font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
