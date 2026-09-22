"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Sparkles, Monitor, Download, Users, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { plans, subscriptionFaqs, useSubscription } from "@/features/billing";
import { formatPrice } from "@/features/billing";
import { useAuth } from "@/features/auth";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";

const features = [
  { icon: Monitor, title: "Watch Everywhere", description: "Stream on any device, anytime" },
  { icon: Download, title: "Download & Go", description: "Watch offline without internet" },
  { icon: Users, title: "Share Profiles", description: "Create up to 5 profiles" },
  { icon: Shield, title: "Secure & Private", description: "Your data is always protected" },
];

function renderCell(value: string | boolean) {
  if (value === true) return <Check className="w-5 h-5 text-primary mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-foreground">{value}</span>;
}

export default function SubscriptionsPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, subscribe, cancel } = useSubscription();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: "basic" | "standard" | "premium") => {
    setPendingPlan(planId);
    await subscribe(planId, billingCycle);
    setPendingPlan(null);
  };

  const handleCancel = async () => {
    setPendingPlan("cancel");
    await cancel();
    setPendingPlan(null);
  };

  return (
    <main className="pb-16">
      <Container width="wide">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Special Offer
          </Badge>
          {subscription && !subLoading && (
            <div className="mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <Crown className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-100">
                You&apos;re currently on the <strong className="capitalize">{subscription.planId}</strong> plan ({subscription.billingCycle}).
              </p>
            </div>
          )}
          {!user && !authLoading && (
            <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-100">
                Sign in to manage your subscription.{" "}
                <Link href={routes.login} className="underline font-medium">Sign in</Link>
              </p>
            </div>
          )}
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your entertainment journey today. Cancel anytime.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="relative w-14 h-7 rounded-full bg-secondary transition-colors"
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-primary transition-transform ${
                  billingCycle === "yearly" ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span className={billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}>
              Yearly
              <Badge variant="secondary" className="ml-2 text-emerald-400 border-emerald-400/20">
                Save 20%
              </Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 transition-all ${
                plan.popular
                  ? "bg-gradient-to-b from-primary/20 to-background border-2 border-primary shadow-lg shadow-primary/10"
                  : "bg-secondary/30 border border-white/5 hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <span className="text-5xl font-bold text-foreground">
                  ${formatPrice(plan.price, billingCycle)}
                </span>
                <span className="text-muted-foreground">/{billingCycle === "yearly" ? "mo" : "month"}</span>
                {billingCycle === "yearly" && (
                  <p className="text-xs text-muted-foreground mt-1">Billed annually</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {subscription?.planId === plan.id ? (
                <div className="space-y-2">
                  <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled>
                    <Check className="w-4 h-4 mr-2" />
                    Current Plan
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-destructive hover:text-destructive text-sm"
                    onClick={handleCancel}
                    disabled={pendingPlan === "cancel"}
                  >
                    {pendingPlan === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel subscription"}
                  </Button>
                </div>
              ) : (
                <Button
                  className={`w-full h-12 ${plan.popular ? "" : "bg-secondary hover:bg-secondary/80"}`}
                  variant={plan.popular ? "default" : "secondary"}
                  onClick={() => handleSubscribe(plan.id as "basic" | "standard" | "premium")}
                  disabled={pendingPlan === plan.id || subLoading}
                >
                  {pendingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : subscription ? (
                    "Switch to " + plan.name
                  ) : plan.popular ? (
                    "Get Started"
                  ) : (
                    "Choose Plan"
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why Choose StreamX?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl bg-secondary/30">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {subscriptionFaqs.map((faq, index) => (
              <details key={index} className="group bg-secondary/30 rounded-xl p-4 cursor-pointer">
                <summary className="flex items-center justify-between font-medium text-foreground">
                  {faq.question}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mb-16 overflow-x-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Compare Plans</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Features</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Basic</th>
                <th className="text-center py-4 px-4 font-semibold text-primary">Standard</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Premium</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Video quality", basic: "HD", standard: "Full HD", premium: "4K + HDR" },
                { label: "Resolution", basic: "720p", standard: "1080p", premium: "2160p" },
                { label: "Devices", basic: "1", standard: "2", premium: "4" },
                { label: "Downloads", basic: false, standard: "2 devices", premium: "Unlimited" },
                { label: "Ads", basic: false, standard: true, premium: true },
                { label: "Early access", basic: false, standard: false, premium: true },
              ].map((row) => (
                <tr key={row.label} className="border-b border-white/5">
                  <td className="py-4 px-4 text-muted-foreground">{row.label}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.basic)}</td>
                  <td className="text-center py-4 px-4 bg-primary/5">{renderCell(row.standard)}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Questions? <Link href="/help" className="text-primary hover:text-primary/80">Contact our support team</Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
