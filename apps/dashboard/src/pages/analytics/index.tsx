import {
  useGetAnalyticsOverview,
  useGetRevenueTrend,
  useGetTopContent,
  useGetSubscriptionTrend,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Film,
  Tv,
  CreditCard,
  Eye,
  Code2,
  TrendingUp,
  Star,
  Instagram,
  Copy,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const BOT_USERNAME = "FavoriteKinoBot";

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organik (to'g'ridan-to'g'ri)",
  instagram: "Instagram",
};

function InstagramDeeplinkCard() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const link = code.trim()
    ? `https://t.me/${BOT_USERNAME}?start=ig_${code.trim().toUpperCase()}`
    : `https://t.me/${BOT_USERNAME}?start=ig`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-4 h-4 text-pink-500" /> {t("analytics.instagramLinkGenerator")}
        </CardTitle>
        <CardDescription>
          {t("analytics.instagramLinkDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {t("analytics.videoCodeLabel")}
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("analytics.videoCodePlaceholder")}
            className="font-mono uppercase"
          />
        </div>
        <div className="flex gap-2">
          <Input value={link} readOnly className="font-mono text-xs" />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUzs(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M so'm`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K so'm`;
  return `${amount.toLocaleString()} so'm`;
}

function formatDate(v: string, period: string) {
  const d = new Date(v);
  if (period === "1y") return d.toLocaleDateString("uz-UZ", { month: "short" });
  return d.toLocaleDateString("uz-UZ", { month: "short", day: "numeric" });
}

function parseRating(r: any) {
  if (r == null) return 0;
  if (typeof r === "number") return r;
  if (typeof r === "string") {
    const n = Number(r);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof r === "object") {
    if (r.value != null) return Number(r.value) || 0;
    if (r.avg != null) return Number(r.avg) || 0;
    if (r.rating != null) return Number(r.rating) || 0;
    return 0;
  }
  return 0;
}

export default function Analytics() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { data: stats } = useGetAnalyticsOverview();
  const { data: revenueStats } = useGetRevenueTrend({ period });
  const { data: trendStats } = useGetSubscriptionTrend({
    period: period as any,
  });
  const { data: topContent } = useGetTopContent({ limit: 10, period });

  const statsData = stats?.data;
  const revenueData = revenueStats?.data?.data || [];
  const trendData = trendStats?.data?.data || [];
  const topContentData = topContent?.data?.items || [];

  const overviewCards = [
    {
      label: t("analytics.totalUsers"),
      value: statsData?.totalUsers?.toLocaleString() ?? "0",
      sub: t("analytics.newUsersToday", { count: statsData?.newUsersToday ?? 0 }),
      icon: <Users className="w-4 h-4" />,
      color: "text-blue-500",
    },
    {
      label: t("analytics.activeSubscriptions"),
      value: statsData?.activeSubscriptions?.toLocaleString() ?? "0",
      sub: t("analytics.activeUsers", { count: statsData?.activeUsers ?? 0 }),
      icon: <CreditCard className="w-4 h-4" />,
      color: "text-green-500",
    },
    {
      label: t("analytics.monthlyRevenue"),
      value: formatUzs(statsData?.monthlyRevenue ?? 0),
      sub: t("analytics.totalRevenue", { value: formatUzs(statsData?.totalRevenue ?? 0) }),
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-amber-500",
    },
    {
      label: t("analytics.videoCodes"),
      value: statsData?.activeVideoCodes?.toLocaleString() ?? "0",
      sub: t("analytics.totalViews", { count: statsData?.totalCodeViews ?? 0 }),
      icon: <Code2 className="w-4 h-4" />,
      color: "text-purple-500",
    },
    {
      label: t("analytics.movies"),
      value: statsData?.totalMovies?.toLocaleString() ?? "0",
      sub: t("analytics.seriesAndEpisodes", { series: statsData?.totalSeries ?? 0, episodes: statsData?.totalEpisodes ?? 0 }),
      icon: <Film className="w-4 h-4" />,
      color: "text-rose-500",
    },
    {
      label: t("analytics.watchSessions"),
      value: statsData?.totalWatchSessions?.toLocaleString() ?? "0",
      sub: t("analytics.totalViewsLabel"),
      icon: <Eye className="w-4 h-4" />,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
          <p className="text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("analytics.last7Days")}</SelectItem>
            <SelectItem value="30d">{t("analytics.last30Days")}</SelectItem>
            <SelectItem value="90d">{t("analytics.last90Days")}</SelectItem>
            <SelectItem value="1y">{t("analytics.lastYear")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <div className={`${card.color} mb-1`}>{card.icon}</div>
              <CardDescription className="text-xs">
                {card.label}
              </CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.revenueDynamics")}</CardTitle>
            <CardDescription>
              {t("analytics.revenueDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-70">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatDate(v, period)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(v: number) => [
                      `${v.toLocaleString()} so'm`,
                      t("analytics.revenue"),
                    ]}
                    labelFormatter={(l) => formatDate(l, period)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmt)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("analytics.noPaymentData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.subscriptionGrowth")}</CardTitle>
            <CardDescription>{t("analytics.subscriptionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="h-70">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatDate(v, period)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [v, t("analytics.newSubscription")]}
                    labelFormatter={(l) => formatDate(l, period)}
                  />
                  <Bar
                    dataKey="newSubscriptions"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("analytics.noSubscriptionData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.topContent")}</CardTitle>
          <CardDescription>{t("analytics.topContentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {topContentData.length > 0 ? (
            <div className="space-y-3">
              {topContentData.slice(0, 8).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      className="w-9 h-12 object-cover rounded shadow-sm shrink-0"
                      alt={item.title}
                    />
                  ) : (
                    <div className="w-9 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                      {item.type === "movie" ? (
                        <Film className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Tv className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs py-0 h-4">
                        {item.type === "movie" ? t("analytics.movie") : t("analytics.series")}
                      </Badge>
                      {(() => {
                        const ratingNum = parseRating(item.rating ?? 0);
                        return ratingNum > 0 ? (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {ratingNum.toFixed(1)}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">
                      {(item.viewsCount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("analytics.views")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t("analytics.noContent")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instagram deeplink generator */}
      <InstagramDeeplinkCard />
    </div>
  );
}
