import { useState } from "react";
import {
  useIdentityLogin,
  useIdentityRegister,
  getIdentityGetMeQueryKey,
} from "@workspace/api-client-react";
import { setTokens } from "@/lib/auth-token";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaySquare, Sun, Moon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export default function Login() {
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const login = useIdentityLogin();
  const register = useIdentityRegister();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      login.mutate(
        { data: { email, password } },
        {
          onSuccess: (data) => {
            // Store JWT tokens in-memory (+ best-effort localStorage)
            setTokens(data.accessToken, data.refreshToken);
            // Populate /identity/auth/me cache directly so ProtectedRoute re-renders
            // immediately — no second round-trip needed.
            queryClient.setQueryData(getIdentityGetMeQueryKey(), data.user);
            setLocation("/");
          },
          onError: (error: unknown) => {
            const responseError = error as {
              data?: { error?: { message?: string } };
            };
            setError(responseError.data?.error?.message ?? t("login.invalid"));
          },
        },
      );
    } else {
      const passwordErrors = [
        password.length < 8 && "Password must be at least 8 characters",
        !/[A-Z]/.test(password) && "one uppercase letter",
        !/[a-z]/.test(password) && "one lowercase letter",
        !/[0-9]/.test(password) && "one number",
        !/[!@#$%^&*]/.test(password) && "one special character (!@#$%^&*)",
      ].filter(Boolean);
      if (passwordErrors.length > 0) {
        setError(`Password must contain ${passwordErrors.join(", ")}.`);
        return;
      }

      register.mutate(
        { data: { email, password, name } },
        {
          onSuccess: (data) => {
            // Store JWT tokens in-memory (+ best-effort localStorage)
            setTokens(data.accessToken, data.refreshToken);
            // Populate /identity/auth/me cache directly so ProtectedRoute re-renders
            // immediately — no second round-trip needed.
            queryClient.setQueryData(getIdentityGetMeQueryKey(), data.user);
            setLocation("/");
          },
          onError: (error: unknown) => {
            const responseError = error as {
              data?: { error?: { message?: string } };
            };
            setError(
              responseError.data?.error?.message ?? "Registration failed",
            );
          },
        },
      );
    }
  };

  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
      <section className="relative flex min-h-screen items-center justify-center px-5 py-16 sm:px-8 lg:px-12">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-5 top-5 h-9 w-9 sm:right-8 sm:top-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
          title={theme === "dark" ? t("theme.light") : t("theme.dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <PlaySquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">StreamOps</p>
              <p className="text-xs text-muted-foreground">{t("app.adminPanel")}</p>
            </div>
          </div>
          <Card className="border-border/70 shadow-xl shadow-black/5">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold">
                {isLogin ? t("login.signIn") : t("login.register")}
              </CardTitle>
              <CardDescription>{t("login.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">{t("login.name")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("login.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Use 8+ characters with uppercase, lowercase, number, and
                  special character.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.password")}</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            {error && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full font-semibold shadow-sm"
              size="lg"
              disabled={login.isPending || register.isPending}
            >
              {login.isPending || register.isPending
                ? t("login.authenticating")
                : isLogin
                  ? t("login.signIn")
                  : t("login.register")}
            </Button>
              </form>

              <div className="mt-6 border-t border-border pt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {isLogin ? t("login.toggleToRegister") : t("login.toggleToLogin")}
            </button>
              </div>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("app.version")}
          </p>
        </div>
      </section>
      <aside className="relative hidden min-h-screen overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(190,24,93,0.38),transparent_48%),linear-gradient(315deg,rgba(39,39,42,0.8),rgba(9,9,11,0.98))]" />
        <div className="absolute inset-0 bg-size-[48px_48px] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] opacity-20" />
        <div className="relative flex items-center gap-3 text-sm font-medium text-white/75">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          StreamOps · Central Asia
        </div>
        <div className="relative max-w-xl py-16">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-sm">
            <PlaySquare className="h-10 w-10 text-rose-300" />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase text-rose-300">{t("login.brandEyebrow")}</p>
          <h1 className="text-5xl font-bold leading-[1.08]">{t("login.brandHeadline")}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/65">
            {t("login.description")}
          </p>
        </div>
        <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/50">
          <span>StreamOps</span>
          <span>{t("app.version")}</span>
        </div>
      </aside>
    </main>
  );
}
