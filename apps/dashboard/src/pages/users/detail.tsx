import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  getGetUserQueryKey,
  getListSubscriptionPlansQueryKey,
  getListSubscriptionsQueryKey,
  useBlockUser,
  useCancelSubscription,
  useExtendSubscription,
  useGetUser,
  useGrantUserSubscription,
  useListSubscriptionPlans,
  useUpdateUser,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  User as UserIcon,
  CreditCard,
  Gift,
  Gauge,
  UsersRound,
  CalendarPlus,
  Ban,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserDetail } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";

type DialogMode = "grant" | "extend" | null;
type UserDetailWithLimits = UserDetail & {
  weeklyCodeLimit?: number | null;
  weeklyCodeUsed?: number | null;
  monthlyCodeLimit?: number | null;
  monthlyCodeUsed?: number | null;
};

export default function UserDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const userId = params.id as string;
  const queryClient = useQueryClient();
  const { data: userResponse, isLoading } = useGetUser(userId);
  const user = userResponse?.data as UserDetailWithLimits | undefined;
  const { data: plans } = useListSubscriptionPlans();
  const blockUser = useBlockUser();
  const updateUser = useUpdateUser();
  const grantSubscription = useGrantUserSubscription();
  const cancelSubscription = useCancelSubscription();
  const extendSubscription = useExtendSubscription();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [planId, setPlanId] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [rewardTier, setRewardTier] = useState("0");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [accountStatus, setAccountStatus] = useState<"active" | "blocked">(
    "active",
  );

  useEffect(() => {
    if (!user) return;
    setDailyLimit(
      user.dailyCodeLimit === null || user.dailyCodeLimit === undefined
        ? ""
        : String(user.dailyCodeLimit),
    );
    setRewardTier(String(user.referralRewardTier ?? 0));
    setWeeklyLimit(
      user.weeklyCodeLimit === null || user.weeklyCodeLimit === undefined
        ? ""
        : String(user.weeklyCodeLimit),
    );
    setMonthlyLimit(
      user.monthlyCodeLimit === null || user.monthlyCodeLimit === undefined
        ? ""
        : String(user.monthlyCodeLimit),
    );
    setUsername(user.username ?? "");
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setLanguageCode(user.languageCode ?? "en");
    setAccountStatus(user.isBlocked ? "blocked" : "active");
  }, [user]);

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getListSubscriptionPlansQueryKey(),
    });
  };

  const handleBlockToggle = () => {
    if (!user) return;
    blockUser.mutate(
      { id: user.id, data: { blocked: !user.isBlocked } },
      {
        onSuccess: () => {
          refreshUser();
          toast.success(user.isBlocked ? t("users.unblocked") : t("users.blocked"));
        },
        onError: () => toast.error(t("users.statusUpdateFailed")),
      },
    );
  };

  const handleSaveAccess = () => {
    if (!user) return;
    const parsedLimit = dailyLimit.trim() === "" ? null : Number(dailyLimit);
    const parsedWeeklyLimit =
      weeklyLimit.trim() === "" ? null : Number(weeklyLimit);
    const parsedMonthlyLimit =
      monthlyLimit.trim() === "" ? null : Number(monthlyLimit);
    const parsedTier = Number(rewardTier);
    const validLimit = (value: number | null) =>
      value === null || (Number.isInteger(value) && value >= 0);
    if (
      !validLimit(parsedLimit) ||
      !validLimit(parsedWeeklyLimit) ||
      !validLimit(parsedMonthlyLimit) ||
      !Number.isInteger(parsedTier) ||
      parsedTier < 0
    ) {
      toast.error(t("users.invalidNumber"));
      return;
    }

    const payload = {
      username: username.trim() || undefined,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      languageCode: languageCode.trim() || undefined,
      dailyCodeLimit: parsedLimit,
      weeklyCodeLimit: parsedWeeklyLimit,
      monthlyCodeLimit: parsedMonthlyLimit,
      referralRewardTier: parsedTier,
      accountStatus,
    };

    updateUser.mutate(
      { id: user.id, data: payload },
      {
        onSuccess: () => {
          refreshUser();
          toast.success(t("users.profileUpdated"));
        },
        onError: () => toast.error(t("users.profileUpdateFailed")),
      },
    );
  };

  const openGrant = () => {
    setPlanId(
      plans?.find((plan) => plan.price === 0)?.id ?? plans?.[0]?.id ?? "",
    );
    setDurationDays("");
    setAutoRenew(false);
    setDialogMode("grant");
  };

  const openExtend = () => {
    setDurationDays("30");
    setDialogMode("extend");
  };

  const handleSubscriptionAction = () => {
    if (!user || !dialogMode) return;
    const days = durationDays.trim() === "" ? undefined : Number(durationDays);
    if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
      toast.error(t("users.invalidDuration"));
      return;
    }

    if (dialogMode === "grant") {
      if (!planId) {
        toast.error(t("users.choosePlan"));
        return;
      }
      grantSubscription.mutate(
        { id: user.id, data: { planId, durationDays: days, autoRenew } },
        {
          onSuccess: () => {
            refreshUser();
            setDialogMode(null);
            toast.success(t("users.subscriptionGranted"));
          },
          onError: () => toast.error(t("users.grantFailed")),
        },
      );
      return;
    }

    if (
      !user.activeSubscription ||
      days === undefined ||
      !user.activeSubscription.id
    )
      return;
    extendSubscription.mutate(
      { id: user.activeSubscription.id, data: { days } },
      {
        onSuccess: () => {
          refreshUser();
          setDialogMode(null);
          toast.success(t("users.subscriptionExtended", { days }));
        },
        onError: () => toast.error(t("users.extendFailed")),
      },
    );
  };

  const handleCancelSubscription = () => {
    if (
      !user?.activeSubscription ||
      !user.activeSubscription.id ||
      !confirm(t("users.cancelSubscriptionConfirm"))
    )
      return;
    cancelSubscription.mutate(
      { id: user.activeSubscription.id },
      {
        onSuccess: () => {
          refreshUser();
          toast.success(t("users.subscriptionCancelled"));
        },
        onError: () => toast.error(t("users.cancelFailed")),
      },
    );
  };

  if (isLoading)
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("users.loadingUserData")}
      </div>
    );
  if (!user)
    return (
      <div className="text-center py-12 text-destructive">{t("users.userNotFound")}</div>
    );

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || t("users.unnamedUser");
  const activePlan = plans?.find(
    (plan) => plan.id === user.activeSubscription?.planId,
  );
  const isSubscriptionActionPending =
    grantSubscription.isPending || extendSubscription.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            <p className="text-muted-foreground font-mono">
              {user.username
                ? `@${user.username}`
                : `Telegram ID: ${user.telegramId}`}
            </p>
          </div>
        </div>
        <Button
          variant={user.isBlocked ? "outline" : "destructive"}
          onClick={handleBlockToggle}
          disabled={blockUser.isPending}
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          {user.isBlocked ? t("users.unblockUser") : t("users.blockUser")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("users.profileDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <Info label={t("users.telegramId")} value={user.telegramId} mono />
            <Info
              label={t("users.status")}
              value={user.isBlocked ? t("users.blocked") : t("users.active")}
              badge={user.isBlocked ? "destructive" : "success"}
            />
            <Info
              label={t("users.language")}
              value={user.languageCode?.toUpperCase() || t("common.unknown")}
            />
            <Info
              label={t("users.joined")}
              value={new Date(user.createdAt).toLocaleDateString()}
            />
            <Info label={t("users.watchSessions")} value={String(user.watchCount || 0)} />
            <Info
              label={t("users.watchTime")}
              value={`${user.totalWatchMinutes || 0} ${t("users.minutes")}`}
            />
            <Info label={t("users.referralCode")} value={user.referralCode || "—"} mono />
            <Info label={t("users.referredBy")} value={user.referredBy || t("users.organic")} />
            <Info
              label={t("users.acquisition")}
              value={user.acquisitionSource || t("users.organic")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {t("users.subscription")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.activeSubscription ? (
              <div className="space-y-4">
                <Badge
                  variant="outline"
                  className="border-primary text-primary px-3 py-1 text-sm"
                >
                  {user.activeSubscription.planName ||
                    activePlan?.name ||
                    "Premium"}
                </Badge>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t("users.validUntil")}
                  </div>
                  <div className="font-medium">
                    {user.activeSubscription.endDate
                      ? new Date(
                          user.activeSubscription.endDate,
                        ).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t("users.autoRenew")}
                  </div>
                  <div className="font-medium">
                    {user.activeSubscription.autoRenew ? t("users.enabled") : t("users.disabled")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={openExtend}>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    {t("users.extend")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={handleCancelSubscription}
                    disabled={cancelSubscription.isPending}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {t("users.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-muted-foreground">
                  {t("users.noActiveSubscription")}
                </div>
                <Button onClick={openGrant}>
                  <Gift className="w-4 h-4 mr-2" />
                  {t("users.grantFreeAccess")}
                </Button>
              </div>
            )}
            {user.activeSubscription && (
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={openGrant}
              >
                <Gift className="w-4 h-4 mr-2" />
                {t("users.grantAdditionalAccess")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            {t("users.manageAccessProfile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="username">{t("users.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("users.username")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t("users.languageLabel")}</Label>
              <Input
                id="language"
                value={languageCode}
                onChange={(event) =>
                  setLanguageCode(event.target.value.toLowerCase())
                }
                placeholder="en"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-name">{t("users.firstName")}</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder={t("users.firstName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">{t("users.lastName")}</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder={t("users.lastName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-status">{t("users.accountStatus")}</Label>
              <Select
                value={accountStatus}
                onValueChange={(value) =>
                  setAccountStatus(value as "active" | "blocked")
                }
              >
                <SelectTrigger id="account-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("users.active")}</SelectItem>
                  <SelectItem value="blocked">{t("users.blocked")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-limit">{t("users.dailyVideoCodeLimit")}</Label>
              <Input
                id="daily-limit"
                type="number"
                min="0"
                value={dailyLimit}
                onChange={(event) => setDailyLimit(event.target.value)}
                placeholder={t("users.unlimited")}
              />
              <p className="text-xs text-muted-foreground">
                {t("users.usedToday", { count: user.dailyCodeUsed ?? 0 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-limit">{t("users.weeklyVideoCodeLimit")}</Label>
              <Input
                id="weekly-limit"
                type="number"
                min="0"
                value={weeklyLimit}
                onChange={(event) => setWeeklyLimit(event.target.value)}
                placeholder={t("users.unlimited")}
              />
              <p className="text-xs text-muted-foreground">
                {t("users.usedThisWeek", { count: user.weeklyCodeUsed ?? 0 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-limit">{t("users.monthlyVideoCodeLimit")}</Label>
              <Input
                id="monthly-limit"
                type="number"
                min="0"
                value={monthlyLimit}
                onChange={(event) => setMonthlyLimit(event.target.value)}
                placeholder={t("users.unlimited")}
              />
              <p className="text-xs text-muted-foreground">
                {t("users.usedThisMonth", { count: user.monthlyCodeUsed ?? 0 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-tier">{t("users.referralRewardTier")}</Label>
              <Input
                id="reward-tier"
                type="number"
                min="0"
                value={rewardTier}
                onChange={(event) => setRewardTier(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("users.rewardTierDescription")}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveAccess} disabled={updateUser.isPending}>
              {t("users.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-primary" />
            {t("users.referralSummary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-8 text-sm">
          <Info
            label={t("users.rewardTier")}
            value={`Tier ${user.referralRewardTier ?? 0}`}
          />
          <Info
            label={t("users.referralCode")}
            value={user.referralCode || t("users.notAssigned")}
            mono
          />
          <Info label={t("users.source")} value={user.acquisitionSource || t("users.organic")} />
        </CardContent>
      </Card>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "extend"
                ? t("users.extendSubscription")
                : t("users.grantSubscriptionAccess")}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "extend"
                ? t("users.extendDescription")
                : t("users.grantDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {dialogMode === "grant" && (
              <div className="space-y-2">
                <Label>{t("users.plan")}</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("users.choosePlanPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id ?? ""}>
                        {plan.name} ·{" "}
                        {plan.price === 0 || plan.price === undefined
                          ? t("users.free")
                          : `${plan.price.toLocaleString()} ${plan.currency}`}{" "}
                        · {plan.durationDays} {t("users.days")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {dialogMode === "extend"
                  ? t("users.daysToAdd")
                  : t("users.durationOverride")}
              </Label>
              <Input
                type="number"
                min="1"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                placeholder={
                  dialogMode === "extend" ? "30" : t("users.usePlanDefault")
                }
              />
            </div>
            {dialogMode === "grant" && (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(event) => setAutoRenew(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {t("users.enableAutoRenew")}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubscriptionAction}
              disabled={isSubscriptionActionPending}
            >
              {dialogMode === "extend" ? t("users.extendSubscription") : t("users.grantSubscriptionAccess")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: "destructive" | "success";
}) {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </div>
      {badge ? (
        <Badge
          variant={badge === "destructive" ? "destructive" : "default"}
          className={badge === "success" ? "bg-green-600" : ""}
        >
          {value}
        </Badge>
      ) : (
        <div className={mono ? "font-mono text-sm" : "font-medium"}>
          {value}
        </div>
      )}
    </div>
  );
}
