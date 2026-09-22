"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  CreditCard,
  LogOut,
  Camera,
  Loader2,
} from "lucide-react";
import { useAuth, updateProfile } from "@/features/auth";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Container } from "@/components/common/layout/Container";
import { toast } from "sonner";
import { routes } from "@/shared/config";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    recommendations: true,
    marketing: false,
  });

  const [preferences, setPreferences] = useState({
    autoplay: true,
    subtitles: false,
  });

  useEffect(() => {
    if (profile?.fullName) {
      setFullName(profile.fullName);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile({ fullName });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save changes");
    }
    setIsSaving(false);
  };

  const handleSignOutAll = async () => {
    await signOut();
    toast.success("Signed out from all devices");
    router.push(routes.login);
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion is not available. Please contact support.");
  };

  const handleChangePassword = () => {
    router.push(routes.forgotPassword);
  };

  const handleManagePayments = () => {
    router.push(routes.billing);
  };

  const handleTwoFactor = () => {
    toast.info("Two-factor authentication is not available yet");
  };

  const displayName = profile?.fullName || user?.email || "Guest";
  const avatarUrl = profile?.avatarUrl ?? `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200`;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <main className="pb-16">
        <Container width="narrow">
          <h1 className="text-3xl font-bold text-foreground mb-8">Account Settings</h1>

          <div className="space-y-8">
            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </h2>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden relative">
                    <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="96px" />
                  </div>
                  <Button size="icon" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full" onClick={() => toast.info("Avatar upload is not available yet")}>
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 grid gap-4 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email ?? ""} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive push notifications</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Recommendations</p>
                    <p className="text-sm text-muted-foreground">Personalized content suggestions</p>
                  </div>
                  <Switch
                    checked={notifications.recommendations}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, recommendations: checked })}
                  />
                </div>
              </div>
            </section>

            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Playback Preferences
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Autoplay Next Episode</p>
                    <p className="text-sm text-muted-foreground">Automatically play next episode</p>
                  </div>
                  <Switch
                    checked={preferences.autoplay}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, autoplay: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Default Subtitles</p>
                    <p className="text-sm text-muted-foreground">Show subtitles by default</p>
                  </div>
                  <Switch
                    checked={preferences.subtitles}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, subtitles: checked })}
                  />
                </div>
              </div>
            </section>

            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security
              </h2>

              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleChangePassword}>
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleTwoFactor}>
                  <Shield className="w-4 h-4" />
                  Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleManagePayments}>
                  <CreditCard className="w-4 h-4" />
                  Manage Payment Methods
                </Button>
              </div>
            </section>

            <section className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={handleSignOutAll}>
                  <LogOut className="w-4 h-4" />
                  Sign Out of All Devices
                </Button>
                <Button variant="destructive" className="gap-2" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
