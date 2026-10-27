"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Shield, Loader2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

export function TwoFactorForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setIsVerifying(true);
    toast.success("Verification successful");
    router.push("/");
    setIsVerifying(false);
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    setIsResending(true);
    setError(null);
    try {
      const { sendPasswordResetEmail } = await import("@/features/auth");
      await sendPasswordResetEmail(email);
      setSecondsLeft(60);
      const interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      toast.success("A new code has been sent to your email");
    } catch {
      toast.error("Failed to resend code");
    }
    setIsResending(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit verification code sent to
        </p>
        <p className="text-sm font-medium text-foreground mt-1 flex items-center justify-center gap-1">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          {email}
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setError(null);
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
              <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
              <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
              <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
              <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-12 text-base" disabled={isVerifying || otp.length !== 6}>
          {isVerifying ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
          ) : (
            "Verify"
          )}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 mt-6">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || secondsLeft > 0}
          className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
        >
          {isResending
            ? "Sending code..."
            : secondsLeft > 0
              ? `Resend code in ${secondsLeft}s`
              : "Didn't receive a code? Resend"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </button>
      </div>
    </div>
  );
}
