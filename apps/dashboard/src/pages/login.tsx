import { useState } from "react";
import {
  useIdentityLogin,
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
import { PlaySquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useIdentityLogin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
          setError(
            responseError.data?.error?.message ?? t("login.invalid"),
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <PlaySquare className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            StreamOps
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50"
              />
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
                className="bg-muted/50"
              />
            </div>
            {error && (
              <div className="text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full font-bold"
              size="lg"
              disabled={login.isPending}
            >
              {login.isPending ? t("login.authenticating") : t("login.signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
