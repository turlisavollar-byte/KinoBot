import { useEffect, useState } from "react";
import { useIdentityGetMe } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  User,
  Shield,
  Globe,
  Info,
  Lock,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";

export default function Settings() {
  const { t, formatDate } = useI18n();
  const { data: me } = useIdentityGetMe();
  const [trialDurationDays, setTrialDurationDays] = useState(30);
  const [trialLoading, setTrialLoading] = useState(true);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialLoadError, setTrialLoadError] = useState(false);
  const [trialSaveError, setTrialSaveError] = useState(false);
  const [resetDays, setResetDays] = useState(30);
  const [onlyExpiredTrials, setOnlyExpiredTrials] = useState(true);
  const [resetPreview, setResetPreview] = useState<{
    affectedCount: number;
    days: number;
    onlyExpired: boolean;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resetApplying, setResetApplying] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{
      success: boolean;
      data: Record<string, unknown>;
    }>("/api/settings")
      .then((response) => {
        const trialDays = Number(response.data.trial_duration_days);
        if (
          active &&
          Number.isInteger(trialDays) &&
          trialDays >= 0 &&
          trialDays <= 365
        ) {
          setTrialDurationDays(trialDays);
        }
      })
      .catch(() => {
        if (active) setTrialLoadError(true);
      })
      .finally(() => {
        if (active) setTrialLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSaveTrialDuration = async () => {
    if (
      !Number.isInteger(trialDurationDays) ||
      trialDurationDays < 0 ||
      trialDurationDays > 365
    ) {
      setTrialSaveError(true);
      return;
    }

    setTrialSaving(true);
    setTrialSaveError(false);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ trial_duration_days: trialDurationDays }),
      });
      toast.success(t("settings.trialSaved"));
    } catch {
      setTrialSaveError(true);
      toast.error(t("settings.trialSaveFailed"));
    } finally {
      setTrialSaving(false);
    }
  };

  const resetDaysValid =
    Number.isInteger(resetDays) && resetDays >= 1 && resetDays <= 365;
  const previewMatchesCurrentOptions =
    resetPreview?.days === resetDays &&
    resetPreview.onlyExpired === onlyExpiredTrials;

  const handlePreviewTrialReset = async () => {
    if (!resetDaysValid) return;

    setPreviewLoading(true);
    setResetPreview(null);
    try {
      const response = await apiFetch<{
        data: { affectedCount: number };
      }>("/api/settings/reset-all-trials", {
        method: "POST",
        body: JSON.stringify({
          days: resetDays,
          onlyExpired: onlyExpiredTrials,
          preview: true,
        }),
      });
      setResetPreview({
        affectedCount: response.data.affectedCount,
        days: resetDays,
        onlyExpired: onlyExpiredTrials,
      });
    } catch {
      toast.error(t("settings.resetAllTrialsFailed"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyTrialReset = async () => {
    if (!previewMatchesCurrentOptions || !resetPreview) return;

    setResetApplying(true);
    try {
      const response = await apiFetch<{
        data: { affectedCount: number };
      }>("/api/settings/reset-all-trials", {
        method: "POST",
        body: JSON.stringify({
          days: resetDays,
          onlyExpired: onlyExpiredTrials,
          preview: false,
        }),
      });
      toast.success(
        `${response.data.affectedCount} ${t("settings.resetAllTrialsSuccess")}`,
      );
      setResetPreview(null);
      setConfirmResetOpen(false);
    } catch {
      toast.error(t("settings.resetAllTrialsFailed"));
    } finally {
      setResetApplying(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    if (pwForm.next.length < 6) {
      toast.error(t("settings.passwordMin"));
      return;
    }
    setPwLoading(true);
    try {
      await apiFetch("/api/identity/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
        }),
      });
      toast.success(t("settings.passwordChanged"));
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.error(t("settings.passwordFailed"));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {/* Admin Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />{" "}
            {t("settings.adminProfile")}
          </CardTitle>
          <CardDescription>{t("settings.accountInformation")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              {((me as any)?.email || t("settings.admin"))
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">
                {(me as any)?.email || t("settings.admin")}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  <Shield className="h-3 w-3 mr-1" />{" "}
                  {(me as any)?.role
                    ? t(
                        `settings.roleName.${(me as any).role}` as
                          | "settings.roleName.admin"
                          | "settings.roleName.superadmin"
                          | "settings.roleName.manager"
                          | "settings.roleName.moderator"
                          | "settings.roleName.viewer",
                      )
                    : t("settings.roleName.admin")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("settings.memberSince")}{" "}
                  {(me as any)?.createdAt
                    ? formatDate((me as any).createdAt, { dateStyle: "medium" })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">
                {t("settings.email")}
              </span>
              <p className="font-medium mt-0.5">{(me as any)?.email || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("settings.role")}
              </span>
              <p className="font-medium mt-0.5 capitalize">
                {(me as any)?.role
                  ? t(
                      `settings.roleName.${(me as any).role}` as
                        | "settings.roleName.admin"
                        | "settings.roleName.superadmin"
                        | "settings.roleName.manager"
                        | "settings.roleName.moderator"
                        | "settings.roleName.viewer",
                    )
                  : t("settings.roleName.admin")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {t("settings.trialTitle")}
          </CardTitle>
          <CardDescription>{t("settings.trialDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="trial-duration-days">
              {t("settings.trialDurationDays")}
            </Label>
            <Input
              id="trial-duration-days"
              type="number"
              min={0}
              max={365}
              step={1}
              value={trialDurationDays}
              disabled={trialLoading || trialSaving}
              onChange={(event) => {
                setTrialDurationDays(Number(event.target.value));
                setTrialSaveError(false);
              }}
            />
          </div>
          {trialLoading && (
            <p className="text-sm text-muted-foreground">
              {t("settings.trialLoading")}
            </p>
          )}
          {trialLoadError && (
            <p role="alert" className="text-sm text-destructive">
              {t("settings.trialLoadFailed")}
            </p>
          )}
          {trialSaveError && (
            <p role="alert" className="text-sm text-destructive">
              {trialDurationDays < 0 ||
              trialDurationDays > 365 ||
              !Number.isInteger(trialDurationDays)
                ? t("settings.trialInvalid")
                : t("settings.trialSaveFailed")}
            </p>
          )}
          <Button
            onClick={() => void handleSaveTrialDuration()}
            disabled={trialLoading || trialSaving}
          >
            {trialSaving ? t("settings.saving") : t("settings.trialSave")}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("settings.resetAllTrials")}
          </CardTitle>
          <CardDescription>
            {t("settings.resetAllTrialsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-trials-days">
              {t("settings.resetAllTrialsDays")}
            </Label>
            <Input
              id="reset-trials-days"
              type="number"
              min={1}
              max={365}
              step={1}
              value={resetDays}
              disabled={previewLoading || resetApplying}
              onChange={(event) => {
                setResetDays(Number(event.target.value));
                setResetPreview(null);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="reset-only-expired"
              checked={onlyExpiredTrials}
              disabled={previewLoading || resetApplying}
              onCheckedChange={(checked) => {
                setOnlyExpiredTrials(checked === true);
                setResetPreview(null);
              }}
            />
            <Label htmlFor="reset-only-expired">
              {t("settings.resetAllTrialsOnlyExpired")}
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void handlePreviewTrialReset()}
              disabled={!resetDaysValid || previewLoading || resetApplying}
            >
              {previewLoading
                ? t("settings.saving")
                : t("settings.resetAllTrialsPreview")}
            </Button>
            {resetPreview && previewMatchesCurrentOptions && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {resetPreview.affectedCount}{" "}
                {t("settings.resetAllTrialsAffected")}
              </p>
            )}
          </div>
          <AlertDialog
            open={confirmResetOpen}
            onOpenChange={setConfirmResetOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!previewMatchesCurrentOptions || resetApplying}
              >
                {t("settings.resetAllTrialsButton")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("settings.resetAllTrialsConfirm")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {resetPreview?.affectedCount}{" "}
                  {t("settings.resetAllTrialsAffected")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetApplying}>
                  {t("common.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={resetApplying}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleApplyTrialReset();
                  }}
                >
                  {resetApplying
                    ? t("settings.saving")
                    : t("settings.resetAllTrialsButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />{" "}
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription>
            {t("settings.updatePasswordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("settings.currentPassword")}</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={pwForm.current}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, current: e.target.value }))
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={
                  showPass
                    ? t("settings.hidePassword")
                    : t("settings.showPassword")
                }
                title={
                  showPass
                    ? t("settings.hidePassword")
                    : t("settings.showPassword")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.newPassword")}</Label>
            <Input
              type={showPass ? "text" : "password"}
              value={pwForm.next}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, next: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.confirmNewPassword")}</Label>
            <Input
              type={showPass ? "text" : "password"}
              value={pwForm.confirm}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, confirm: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={!pwForm.current || !pwForm.next || pwLoading}
          >
            {pwLoading ? t("settings.saving") : t("settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />{" "}
            {t("settings.platformInformation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {[
              {
                label: t("settings.platform"),
                value: t("settings.platformName"),
              },
              {
                label: t("settings.apiBase"),
                value: `${window.location.origin}/api`,
              },
              {
                label: t("settings.market"),
                value: t("settings.marketValue"),
              },
              {
                label: t("settings.stack"),
                value: t("settings.stackValue"),
              },
              {
                label: t("settings.auth"),
                value: t("settings.authValue"),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0"
              >
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> {label}
                </dt>
                <dd className="font-medium text-right font-mono text-xs">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
