"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/features/billing";
import { useAuth } from "@/features/auth";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";
import { subscriptions as subscriptionsApi } from "@streamx/api-client";
import { useQuery } from "@tanstack/react-query";

export default function SubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionsApi.listPlans,
  });

  return (
    <main className="pb-16">
      <Container width="wide">
        <div className="text-center mb-12">
          <Badge className="mb-4">Subscription catalog</Badge>
          {subscription && (
            <div className="mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <Crown className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-100">
                You&apos;re currently on the{" "}
                <strong className="capitalize">{subscription.planId}</strong>{" "}
                plan.
                {subscription.expiresAt && (
                  <>
                    {" "}
                    Access until{" "}
                    {new Date(subscription.expiresAt).toLocaleDateString()}.
                  </>
                )}
              </p>
            </div>
          )}
          {!user && !authLoading && (
            <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-100">
                Sign in to manage your subscription.{" "}
                <Link href={routes.login} className="underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          )}
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Available Plans
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Plan details come from the KinoBot API. Checkout is not enabled yet.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            Prices and durations are loaded from the KinoBot subscription
            catalog.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 transition-all ${
                plan.tier.toLowerCase() === "premium"
                  ? "bg-gradient-to-b from-primary/20 to-background border-2 border-primary shadow-lg shadow-primary/10"
                  : "bg-secondary/30 border border-white/5 hover:border-white/10"
              }`}
            >
              {plan.tier.toLowerCase() === "premium" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description || `${plan.durationDays} days`}
                </p>
              </div>

              <div className="text-center mb-6">
                <span className="text-5xl font-bold text-foreground">
                  {Number(plan.price).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="text-muted-foreground">
                  {plan.currency} / {plan.durationDays} days
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                <li>Tier: {plan.tier}</li>
                <li>Duration: {plan.durationDays} days</li>
              </ul>

              {subscription?.planId === plan.tier ? (
                <Button className="w-full h-12" disabled>
                  <Check className="w-4 h-4 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full h-12" variant="secondary" disabled>
                  Checkout unavailable
                </Button>
              )}
            </div>
          ))}
        </div>

        {plansLoading && (
          <p className="mb-12 text-center text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Loading plans
          </p>
        )}
        {!plansLoading && plans.length === 0 && (
          <p className="mb-12 text-center text-muted-foreground">
            No active plans are available.
          </p>
        )}

        <div className="mx-auto max-w-2xl rounded-lg border border-border p-5 text-sm text-muted-foreground">
          Premium playback is enforced by the API. Only titles ingested into
          configured S3-compatible storage can stream in Web; payment checkout
          and automatic renewals are not yet enabled.
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Questions?{" "}
            <Link href="/help" className="text-primary hover:text-primary/80">
              Contact our support team
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
