import {
  useGetTelegramConfig,
  useUpdateTelegramConfig,
  useGetTelegramStatus,
  useListTelegramChannels,
  useCreateTelegramChannel,
  getGetTelegramConfigQueryKey,
  getListTelegramChannelsQueryKey,
  getGetTelegramStatusQueryKey,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Bot,
  Database,
  Save,
  Plus,
  Play,
  Square,
  KeyRound,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Copy,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { TelegramConfig } from "@workspace/api-client-react";

type TelegramConfigWithAccessPolicy = TelegramConfig & {
  defaultDailyCodeLimit?: number | null;
  defaultWeeklyCodeLimit?: number | null;
  defaultMonthlyCodeLimit?: number | null;
};

export default function TelegramConfig() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: rawConfig, isLoading: confLoading } = useGetTelegramConfig();
  const config = rawConfig as TelegramConfigWithAccessPolicy | undefined;
  const {
    data: status,
    isLoading: statLoading,
    refetch: refetchStatus,
  } = useGetTelegramStatus();
  const { data: channels, isLoading: chanLoading } = useListTelegramChannels();
  const updateConfig = useUpdateTelegramConfig();
  const createChannel = useCreateTelegramChannel();

  // Token is kept empty — server never returns the real value.
  // Empty string means "don't change the stored token".
  const [token, setToken] = useState("");
  const [webhook, setWebhook] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [requiredChannelId, setRequiredChannelId] = useState("");
  const [defaultDailyLimit, setDefaultDailyLimit] = useState("");
  const [defaultWeeklyLimit, setDefaultWeeklyLimit] = useState("");
  const [defaultMonthlyLimit, setDefaultMonthlyLimit] = useState("");
  const [botStarting, setBotStarting] = useState(false);
  const [botStopping, setBotStopping] = useState(false);

  const [newChanId, setNewChanId] = useState("");
  const [newChanTitle, setNewChanTitle] = useState("");
  const [detectingChannels, setDetectingChannels] = useState(false);
  const [adminChannels, setAdminChannels] = useState<any[]>([]);
  const [checkChannelId, setCheckChannelId] = useState("");
  const [checkingChannel, setCheckingChannel] = useState(false);

  const tokenIsConfigured = !!config?.botToken; // server returns "***configured***" if set

  useEffect(() => {
    if (config) {
      // Never put "***configured***" into the input — keep it empty
      setToken("");
      setWebhook(config.webhookUrl ?? "");
      setIsActive(config.isActive);
      setRequiredChannelId(config.requiredChannelId ?? "");
      setDefaultDailyLimit(
        config.defaultDailyCodeLimit == null
          ? ""
          : String(config.defaultDailyCodeLimit),
      );
      setDefaultWeeklyLimit(
        config.defaultWeeklyCodeLimit == null
          ? ""
          : String(config.defaultWeeklyCodeLimit),
      );
      setDefaultMonthlyLimit(
        config.defaultMonthlyCodeLimit == null
          ? ""
          : String(config.defaultMonthlyCodeLimit),
      );
    }
  }, [config]);

  const handleSaveConfig = () => {
    // Build patch body — only include botToken if user actually typed something
    type PatchBody = {
      isActive?: boolean;
      webhookUrl?: string;
      botToken?: string;
      requiredChannelId?: string | null;
      defaultDailyCodeLimit?: number | null;
      defaultWeeklyCodeLimit?: number | null;
      defaultMonthlyCodeLimit?: number | null;
    };
    const parseLimit = (value: string) =>
      value.trim() === "" ? null : Number(value);
    const defaultDailyCodeLimit = parseLimit(defaultDailyLimit);
    const defaultWeeklyCodeLimit = parseLimit(defaultWeeklyLimit);
    const defaultMonthlyCodeLimit = parseLimit(defaultMonthlyLimit);
    if (
      [
        defaultDailyCodeLimit,
        defaultWeeklyCodeLimit,
        defaultMonthlyCodeLimit,
      ].some(
        (value) => value !== null && (!Number.isInteger(value) || value < 0),
      )
    ) {
      toast.error(t("telegram.config.limitsError"));
      return;
    }
    const body: PatchBody = {
      webhookUrl: webhook,
      requiredChannelId: requiredChannelId.trim() || null,
      defaultDailyCodeLimit,
      defaultWeeklyCodeLimit,
      defaultMonthlyCodeLimit,
    };

    // Only include isActive if it was explicitly changed from the config value
    if (isActive !== config?.isActive) {
      body.isActive = isActive;
    }

    if (token.trim()) {
      body.botToken = token.trim();
    }

    updateConfig.mutate(
      { data: body },
      {
        onSuccess: () => {
          toast.success(t("telegram.config.saved"));
          queryClient.invalidateQueries({
            queryKey: getGetTelegramConfigQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetTelegramStatusQueryKey(),
          });
          setToken(""); // clear — token is now stored
        },
        onError: (e: Error) =>
          toast.error(e.message ?? t("telegram.config.saveError")),
      },
    );
  };

  const handleStartBot = async () => {
    setBotStarting(true);
    try {
      const res = await apiFetch<{ running: boolean }>(
        "/api/telegram/bot/start",
        { method: "POST" },
      );
      if (res.running) {
        toast.success(t("telegram.config.botStarted"));
      } else {
        toast.error(
          t("telegram.config.botStartError"),
        );
      }
      queryClient.invalidateQueries({
        queryKey: getGetTelegramStatusQueryKey(),
      });
      refetchStatus();
    } catch (e) {
      toast.error((e as Error).message ?? t("telegram.config.startBotError"));
    } finally {
      setBotStarting(false);
    }
  };

  const handleStopBot = async () => {
    setBotStopping(true);
    try {
      await apiFetch("/api/telegram/bot/stop", { method: "POST" });
      toast.success(t("telegram.config.botStopped"));
      queryClient.invalidateQueries({
        queryKey: getGetTelegramStatusQueryKey(),
      });
      refetchStatus();
    } catch (e) {
      toast.error((e as Error).message ?? t("telegram.config.stopBotError"));
    } finally {
      setBotStopping(false);
    }
  };

  const handleAddChannel = () => {
    if (!newChanId || !newChanTitle) return;
    createChannel.mutate(
      { data: { channelId: newChanId, title: newChanTitle, type: "storage" } },
      {
        onSuccess: () => {
          setNewChanId("");
          setNewChanTitle("");
          toast.success(t("telegram.config.channelAdded"));
          queryClient.invalidateQueries({
            queryKey: getListTelegramChannelsQueryKey(),
          });
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleDetectChannels = async () => {
    if (!tokenIsConfigured) {
      toast.error(t("telegram.botTokenNotConfigured"));
      return;
    }

    setDetectingChannels(true);
    try {
      const result = await apiFetch<{
        botId: number;
        botUsername: string;
        adminChannels: any[];
        totalChannels: number;
        message?: string;
      }>(`/api/telegram/admin-channels?t=${Date.now()}`); // Cache-busting

      setAdminChannels(result.adminChannels);

      if (result.message) {
        toast.info(result.message);
      } else {
        toast.success(t("telegram.foundAdminChannels", { count: result.totalChannels }));
      }
    } catch (e) {
      toast.error((e as Error).message ?? t("telegram.failedDetectChannels"));
    } finally {
      setDetectingChannels(false);
    }
  };

  const handleAddDetectedChannel = (channel: any) => {
    createChannel.mutate(
      {
        data: {
          channelId: channel.channelId,
          title: channel.title,
          type: "storage",
        },
      },
      {
        onSuccess: () => {
          toast.success(t("telegram.addedChannel", { title: channel.title }));
          queryClient.invalidateQueries({
            queryKey: getListTelegramChannelsQueryKey(),
          });
          setAdminChannels(
            adminChannels.filter((c) => c.channelId !== channel.channelId),
          );
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleCheckChannel = async () => {
    if (!checkChannelId.trim()) {
      toast.error(t("telegram.channelIdRequired"));
      return;
    }

    setCheckingChannel(true);
    try {
      const result = await apiFetch<{
        isAdmin: boolean;
        channelId: string;
        title: string;
        botId: number;
      }>(
        `/api/telegram/check-channel-admin?channelId=${encodeURIComponent(checkChannelId.trim())}`,
      );

      if (result.isAdmin) {
        // Check if already in adminChannels list
        if (!adminChannels.find((c) => c.channelId === result.channelId)) {
          setAdminChannels([
            ...adminChannels,
            {
              channelId: result.channelId,
              title: result.title,
              type: "storage",
              isActive: true,
              filesCount: 0,
              isBotAdmin: true,
            },
          ]);
          toast.success(t("telegram.botIsAdmin", { title: result.title }));
        } else {
          toast.info(t("telegram.channelAlreadyInList"));
        }
      } else {
        toast.error(t("telegram.botNotAdmin"));
      }
    } catch (e) {
      toast.error((e as Error).message ?? t("telegram.failedCheckChannel"));
    } finally {
      setCheckingChannel(false);
    }
  };

  if (confLoading || statLoading || chanLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("telegram.loadingConfig")}
      </div>
    );
  }

  const isOnline = status?.isOnline;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("telegram.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t("telegram.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              refetchStatus();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {isOnline ? (
            <Badge className="bg-emerald-600 px-3 py-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {t("telegram.botOnline")}
            </Badge>
          ) : (
            <Badge
              variant="destructive"
              className="px-3 py-1 flex items-center gap-1.5"
            >
              <Bot className="h-3 w-3" /> {t("telegram.botOffline")}
            </Badge>
          )}
        </div>
      </div>

      {/* Setup guide alert when not configured */}
      {!tokenIsConfigured && (
        <Alert className="border-amber-500/30 bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200 text-sm">
            <strong>{t("telegram.setupRequired")}</strong> {t("telegram.setupRequiredText")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Config card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> {t("telegram.botConfiguration")}
            </CardTitle>
            <CardDescription>
              {t("telegram.botConfigDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Token field */}
            <div className="space-y-1.5">
              <Label>{t("telegram.botToken")}</Label>
              <div className="relative">
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    tokenIsConfigured
                      ? t("telegram.tokenConfigured")
                      : t("telegram.tokenPlaceholder")
                  }
                  className="pr-32"
                />
                {tokenIsConfigured && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> {t("telegram.configured")}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("telegram.tokenHelp")}
              </p>
            </div>

            {/* Required Channel */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {t("telegram.requiredChannels")}
                <Badge variant="secondary" className="text-xs font-normal">
                  {t("telegram.optional")}
                </Badge>
              </Label>
              <Input
                value={requiredChannelId}
                onChange={(e) => setRequiredChannelId(e.target.value)}
                placeholder={t("telegram.requiredChannelsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("telegram.requiredChannelsHelp")}
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-1.5">
              <Label>{t("telegram.webhookUrl")}</Label>
              <Input
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder={t("telegram.webhookPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("telegram.webhookHelp")}
              </p>
            </div>

            {/* Enable switch */}
            <div
              className={cn(
                "flex items-center justify-between p-4 border rounded-lg transition-colors",
                isActive
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-border",
              )}
            >
              <div>
                <Label className="text-sm font-medium">
                  {t("telegram.enableBotIntegration")}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("telegram.enableBotHelp")}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfig.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateConfig.isPending ? t("telegram.saving") : t("telegram.saveSettings")}
              </Button>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <Label>{t("telegram.defaultFreeAccessLimits")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("telegram.defaultFreeAccessHelp")}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  type="number"
                  min="0"
                  value={defaultDailyLimit}
                  onChange={(event) => setDefaultDailyLimit(event.target.value)}
                  placeholder={t("telegram.dailyCodes")}
                  aria-label="Default daily code limit"
                />
                <Input
                  type="number"
                  min="0"
                  value={defaultWeeklyLimit}
                  onChange={(event) =>
                    setDefaultWeeklyLimit(event.target.value)
                  }
                  placeholder={t("telegram.weeklyCodes")}
                  aria-label="Default weekly code limit"
                />
                <Input
                  type="number"
                  min="0"
                  value={defaultMonthlyLimit}
                  onChange={(event) =>
                    setDefaultMonthlyLimit(event.target.value)
                  }
                  placeholder={t("telegram.monthlyCodes")}
                  aria-label="Default monthly code limit"
                />
              </div>
            </div>

            <Separator />

            {/* Bot controls */}
            <div>
              <p className="text-sm font-medium mb-3">{t("telegram.botControls")}</p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleStartBot}
                  disabled={botStarting || isOnline || !tokenIsConfigured}
                  className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30 disabled:opacity-40"
                >
                  {botStarting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {botStarting ? t("telegram.starting") : t("telegram.startBot")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStopBot}
                  disabled={botStopping || !isOnline}
                  className="border-red-500/40 text-red-400 hover:bg-red-950/30 disabled:opacity-40"
                >
                  {botStopping ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {botStopping ? t("telegram.stopping") : t("telegram.stopBot")}
                </Button>
                {!tokenIsConfigured && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {t("telegram.saveTokenFirst")}
                  </p>
                )}
                {tokenIsConfigured && !isActive && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {t("telegram.enableSwitchFirst")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> {t("telegram.botStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                isOnline
                  ? "bg-emerald-950/40 text-emerald-300"
                  : "bg-zinc-800/60 text-zinc-400",
              )}
            >
              {isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />{" "}
                  {t("telegram.online")}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-zinc-500" /> {t("telegram.offline")}
                </>
              )}
            </div>

            {[
              {
                label: t("telegram.username"),
                value: status?.botUsername ? `@${status.botUsername}` : "—",
              },
              {
                label: t("telegram.totalUsers"),
                value: (status?.totalUsers ?? 0).toLocaleString(),
              },
              {
                label: t("telegram.messagesProcessed"),
                value: (status?.totalMessages ?? 0).toLocaleString(),
              },
              {
                label: t("telegram.storedFiles"),
                value: (status?.storageFilesCount ?? 0).toLocaleString(),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold text-lg leading-tight mt-0.5">
                  {value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Storage Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" /> {t("telegram.storageChannels")}
          </CardTitle>
          <CardDescription>
            {t("telegram.storageChannelsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Auto-detect guide */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" /> {t("telegram.autoConnect")}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDetectChannels}
                disabled={detectingChannels || !tokenIsConfigured}
                className="h-7 text-xs"
              >
                {detectingChannels ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />{" "}
                    {t("telegram.detecting")}
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-1.5" /> {t("telegram.detectAdminChannels")}
                  </>
                )}
              </Button>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
              <li className="flex items-start gap-2">
                <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                  1
                </span>
                <span>
                  {t("telegram.autoConnectStep1")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                  2
                </span>
                <span>
                  {t("telegram.autoConnectStep2")}{" "}
                  <button
                    className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        status?.botUsername
                          ? `@${status.botUsername}`
                          : "@FavoriteKinoBot",
                      );
                      toast.success(t("telegram.copied"));
                    }}
                  >
                    @{status?.botUsername ?? "FavoriteKinoBot"}
                  </button>{" "}
                  {t("telegram.autoConnectStep2End")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                  3
                </span>
                <span>
                  <strong className="text-foreground">
                    {t("telegram.detectAdminChannels")}
                  </strong>{" "}
                  {t("telegram.autoConnectStep3End")}
                </span>
              </li>
            </ol>

            {/* Channel ID check */}
            <div className="pt-2 border-t border-primary/10">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("telegram.orCheckChannelId")}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={checkChannelId}
                  onChange={(e) => setCheckChannelId(e.target.value)}
                  placeholder={t("telegram.checkChannelIdPlaceholder")}
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckChannel}
                  disabled={checkingChannel || !checkChannelId.trim()}
                  className="h-8 text-xs"
                >
                  {checkingChannel ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />{" "}
                      {t("telegram.checking")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1.5" /> {t("telegram.check")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Detected channels */}
          {adminChannels.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" /> {t("telegram.detectedAdminChannels")} (
                {adminChannels.length})
              </div>
              <div className="space-y-2">
                {adminChannels.map((channel) => (
                  <div
                    key={channel.channelId}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {channel.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {channel.channelId}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddDetectedChannel(channel)}
                      disabled={createChannel.isPending}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" /> {t("telegram.add")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual add form */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {t("telegram.orAddManually")}
            </p>
            <div className="flex items-end gap-3 max-w-2xl">
              <div className="flex-1 space-y-1.5">
                <Label>{t("telegram.channelTitle")}</Label>
                <Input
                  value={newChanTitle}
                  onChange={(e) => setNewChanTitle(e.target.value)}
                  placeholder={t("telegram.channelTitlePlaceholder")}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>{t("telegram.channelIdLabel")}</Label>
                <Input
                  value={newChanId}
                  onChange={(e) => setNewChanId(e.target.value)}
                  placeholder={t("telegram.manualChannelIdPlaceholder")}
                />
              </div>
              <Button
                onClick={handleAddChannel}
                disabled={
                  createChannel.isPending || !newChanId || !newChanTitle
                }
              >
                <Plus className="h-4 w-4 mr-1.5" /> {t("telegram.add")}
              </Button>
            </div>
          </div>

          {/* Channels table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[t("telegram.titleHeader"), t("telegram.channelIdHeader"), t("telegram.filesHeader"), t("telegram.statusHeader")].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {!channels?.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-muted-foreground text-sm"
                    >
                      {t("telegram.noStorageChannels")}
                    </td>
                  </tr>
                ) : (
                  channels.map((ch) => (
                    <tr
                      key={ch.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{ch.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {ch.channelId}
                      </td>
                      <td className="px-4 py-3">{ch.filesCount ?? 0}</td>
                      <td className="px-4 py-3">
                        {ch.isActive ? (
                          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                            {t("telegram.active")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t("telegram.inactive")}</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
