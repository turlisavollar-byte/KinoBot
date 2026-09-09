import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useGetAnalyticsOverview,
  useGetRevenueTrend,
  useGetTopContent,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  CreditCard,
  Film,
  Tv,
  Play,
  Bot,
  PlusCircle,
  Bell,
  Activity,
  Flag,
  Shield,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthResp {
  status: "ok" | "degraded" | "down";
  services: {
    database: string;
    bot: string;
    cache: string;
    queue: string;
    storage: string;
    search: string;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  subtitle?: string;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  subtitle,
  loading,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md hover:border-border/80">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {title}
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={cn("p-2.5 rounded-xl bg-muted/50", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  label: TranslationKey;
  description: TranslationKey;
  icon: React.ElementType;
  href: string;
  variant?: "default" | "outline";
}

function QuickAction({
  label,
  icon: Icon,
  href,
  description,
}: QuickActionProps) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate(href)}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left w-full"
    >
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{t(label)}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {t(description)}
          </p>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
    </button>
  );
}

const QUICK_ACTIONS: QuickActionProps[] = [
  {
    label: "dashboard.addMovie",
    description: "dashboard.uploadFilm",
    icon: Film,
    href: "/catalog/movies/new",
  },
  {
    label: "dashboard.addSeries",
    description: "dashboard.createTvShow",
    icon: Tv,
    href: "/catalog/series/new",
  },
  {
    label: "dashboard.broadcast",
    description: "dashboard.messageAllUsers",
    icon: Bell,
    href: "/notifications",
  },
  {
    label: "dashboard.healthMonitor",
    description: "dashboard.checkServices",
    icon: Activity,
    href: "/system/health",
  },
  {
    label: "dashboard.featureFlags",
    description: "dashboard.toggleFeatures",
    icon: Flag,
    href: "/system/feature-flags",
  },
  {
    label: "dashboard.auditLogs",
    description: "dashboard.reviewActions",
    icon: Shield,
    href: "/system/audit-logs",
  },
];

export default function Dashboard() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useGetAnalyticsOverview();
  const { data: revenue, error: revenueError } = useGetRevenueTrend({
    period: "7d",
  });
  const { data: topContent, error: topContentError } = useGetTopContent({
    limit: 5,
    period: "7d",
  });
  const { data: health, error: healthError } = useQuery<HealthResp>({
    queryKey: ["system-health-mini"],
    queryFn: () => apiFetch<HealthResp>("/api/health"),
    refetchInterval: 60_000,
  });

  const hasError = statsError || revenueError || topContentError || healthError;

  // Extract data from new API response format
  const statsData = stats?.data;
  const revenueData = revenue?.data?.data || [];
  const topItems = topContent?.data?.items || [];
  const maxViewCount = Math.max(...topItems.map((t) => t.viewsCount || 0), 1);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const healthOk = health?.status === "ok";
  const serviceCount = Object.values(health?.services ?? {}).length;
  const serviceOkCount = Object.values(health?.services ?? {}).filter(
    (s) => s === "ok" || s === "running",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/catalog/movies/new")}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> {t("dashboard.addMovie")}
          </Button>
          <Button size="sm" onClick={() => navigate("/catalog/series/new")}>
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> {t("dashboard.addSeries")}
          </Button>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalRevenue")}
          value={`$${(statsData?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-emerald-400"
          subtitle={t("dashboard.allTime")}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.activeUsers")}
          value={(statsData?.activeUsers ?? 0).toLocaleString()}
          icon={Users}
          iconColor="text-blue-400"
          subtitle={`${(statsData?.totalUsers ?? 0).toLocaleString()} ${t("dashboard.total")}`}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.newToday")}
          value={(statsData?.newUsersToday ?? 0).toLocaleString()}
          icon={TrendingUp}
          iconColor="text-violet-400"
          subtitle={t("dashboard.newUsersRegistered")}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.subscribers")}
          value={(statsData?.activeSubscriptions ?? 0).toLocaleString()}
          icon={CreditCard}
          iconColor="text-amber-400"
          subtitle={t("dashboard.activePlans")}
          loading={statsLoading}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("movies.title")}
          value={(statsData?.totalMovies ?? 0).toLocaleString()}
          icon={Film}
          iconColor="text-rose-400"
          subtitle={t("dashboard.inCatalog")}
          loading={statsLoading}
        />
        <StatCard
          title={t("series.title")}
          value={(statsData?.totalSeries ?? 0).toLocaleString()}
          icon={Tv}
          iconColor="text-cyan-400"
          subtitle={t("dashboard.tvShows")}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.watchSessions")}
          value={(statsData?.totalWatchSessions ?? 0).toLocaleString()}
          icon={Play}
          iconColor="text-indigo-400"
          subtitle={t("dashboard.allTime")}
          loading={statsLoading}
        />
        {/* Bot Status Card */}
        <Card className="relative overflow-hidden transition-all hover:shadow-md hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Telegram Bot
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      health?.services?.bot === "running"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-zinc-500",
                    )}
                  />
                  <p className="text-lg font-bold capitalize">
                    {health?.services?.bot ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/telegram")}
                  className="text-xs text-primary hover:underline mt-1 block"
                >
                  {t("dashboard.configure")} →
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/50 text-sky-400">
                <Bot className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t("dashboard.revenueTrend")}</CardTitle>
                <CardDescription>{t("dashboard.last7Days")}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate("/analytics")}
              >
                {t("dashboard.fullAnalytics")} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(346.8 77.2% 49.8%)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(346.8 77.2% 49.8%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    labelFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(v: number) => [
                      `$${v.toLocaleString()}`,
                      t("dashboard.revenue"),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(346.8 77.2% 49.8%)"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-45 flex items-center justify-center text-muted-foreground text-sm">
                {t("dashboard.noRevenue")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.topContent")}</CardTitle>
            <CardDescription>{t("dashboard.byViewCount")}</CardDescription>
          </CardHeader>
          <CardContent>
            {topItems.length > 0 ? (
              <div className="space-y-3">
                {topItems.map((item, i) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium truncate">
                          {item.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] shrink-0 capitalize"
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {(item.viewsCount || 0).toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={((item.viewsCount || 0) / maxViewCount) * 100}
                      className="h-1"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-45 flex items-center justify-center text-muted-foreground text-sm text-center">
                <div>
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {t("dashboard.noContent")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.frequentlyUsed")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <QuickAction key={action.href} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health Mini */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t("dashboard.systemStatus")}</CardTitle>
                <CardDescription>{t("dashboard.serviceHealth")}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={() => navigate("/system/health")}
              >
                {t("dashboard.viewHealth")} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-2.5">
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg",
                    healthOk
                      ? "bg-emerald-950/40 text-emerald-300"
                      : "bg-red-950/40 text-red-300",
                  )}
                >
                  {healthOk ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {healthOk
                    ? t("dashboard.allSystemsOperational")
                    : `${t("dashboard.system")} ${health.status}`}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {serviceOkCount}/{serviceCount} {t("dashboard.servicesOperational")}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(health.services).map(([key, val]) => {
                    const ok = val === "ok" || val === "running";
                    const stub = val === "stub";
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            ok
                              ? "bg-emerald-400"
                              : stub
                                ? "bg-amber-400"
                                : "bg-red-400",
                          )}
                        />
                        <span className="capitalize truncate">{key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
