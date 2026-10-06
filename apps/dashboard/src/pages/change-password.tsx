import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-fetch";
import {
  isMustChangePasswordRequired,
  setMustChangePasswordRequired,
} from "@/lib/password-change-flow";
import { getIdentityGetMeQueryKey } from "@workspace/api-client-react";
import { getAccessToken } from "@/lib/auth-token";

function getPasswordValidationMessage(password: string): string | null {
  if (password.length < 8) return "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak.";
  if (!/[A-Z]/.test(password)) return "Yangi parolda kamida bitta katta harf bo'lishi kerak.";
  if (!/[a-z]/.test(password)) return "Yangi parolda kamida bitta kichik harf bo'lishi kerak.";
  if (!/[0-9]/.test(password)) return "Yangi parolda kamida bitta raqam bo'lishi kerak.";
  if (!/[!@#$%^&*]/.test(password)) return "Yangi parolda !@#$%^&* belgilaridan kamida bittasi bo'lishi kerak.";
  return null;
}

export default function ChangePassword() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) setLocation("/");
    else if (!isMustChangePasswordRequired()) setLocation("/");
  }, [setLocation]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const strengthError = getPasswordValidationMessage(newPassword);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yangi parol va tasdiqlash paroli mos kelmadi.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Yangi parol joriy paroldan farq qilishi kerak.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/identity/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMustChangePasswordRequired(false);
      queryClient.removeQueries({ queryKey: getIdentityGetMeQueryKey() });
      setLocation("/");
    } catch (requestError) {
      setError((requestError as Error).message || "Parolni o'zgartirib bo'lmadi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle>Parolni o'zgartiring</CardTitle>
          <CardDescription>
            Davom etishdan oldin vaqtinchalik parolni yangisiga almashtiring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="current-password">Joriy parol</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Yangi parol</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby="password-requirements"
              />
              <p id="password-requirements" className="text-xs text-muted-foreground">
                Kamida 8 belgi, katta-kichik harf, raqam va !@#$%^&* belgisidan foydalaning.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Yangi parolni tasdiqlang</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
            >
              {isSubmitting ? "Saqlanmoqda..." : "Parolni yangilash"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
