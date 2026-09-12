import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Shield, Globe, Info, Lock, Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const { t } = useI18n();
  const { data: me } = useIdentityGetMe();
  const [showPass, setShowPass] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);

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
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
        }),
      });
      toast.success(t("settings.passwordChanged"));
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.error((e as Error).message ?? t("settings.passwordFailed"));
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
              {((me as any)?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{(me as any)?.email || "Admin"}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  <Shield className="h-3 w-3 mr-1" />{" "}
                  {(me as any)?.role || "admin"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("settings.memberSince")}{" "}
                  {(me as any)?.createdAt
                    ? new Date((me as any).createdAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium mt-0.5">{(me as any)?.email || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("settings.role")}
              </span>
              <p className="font-medium mt-0.5 capitalize">
                {(me as any)?.role || "admin"}
              </p>
            </div>
          </div>
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
              { label: t("settings.platform"), value: "StreamOps Admin" },
              {
                label: t("settings.apiBase"),
                value: `${window.location.origin}/api`,
              },
              {
                label: t("settings.market"),
                value: "Uzbekistan / Central Asia (UZ/RU)",
              },
              {
                label: t("settings.stack"),
                value: "Node.js · Express · PostgreSQL · Drizzle ORM",
              },
              {
                label: t("settings.auth"),
                value: "Bearer token · 7-day session · SHA-256 hash",
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
