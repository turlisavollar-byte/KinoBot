"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@streamx/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Container } from "@/components/common/layout/Container";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { useAuth } from "@/features/auth";
import { routes } from "@/shared/config";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setIsSaving(true);
    try {
      await auth.updatePassword(currentPassword, newPassword);
      await signOut();
      toast.success("Password updated. Please sign in again.");
      router.replace(routes.login);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update password");
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="py-16">
        <Container width="narrow">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Change password</h1>
          <p className="mb-8 text-muted-foreground">
            Choose a unique password with at least 12 characters. You will need to sign in again after changing it.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-secondary/30 p-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
