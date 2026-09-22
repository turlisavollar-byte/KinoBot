"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTABanner() {
  return (
    <section className="relative mx-4 sm:mx-6 lg:mx-8 rounded-3xl overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Premium streaming"
          fill
          className="object-cover"
          quality={80}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      <div className="relative px-6 py-10 lg:px-12 lg:py-14 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Premium</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Unlock 4K Ultra HD & ad-free streaming
          </h2>
          <p className="text-muted-foreground mb-6">
            Upgrade to Premium and watch on 4 devices simultaneously. Early access to new releases, unlimited downloads, and HDR support.
          </p>
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <Button size="lg" className="gap-2 h-12 px-8" asChild>
              <Link href="/subscriptions">
                <Play className="w-4 h-4 fill-current" />
                Start Free Trial
              </Link>
            </Button>
            <Button size="lg" variant="secondary" className="h-12 px-6" asChild>
              <Link href="/browse">Browse Content</Link>
            </Button>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-3 gap-3">
          {["4K HDR", "No Ads", "4 Devices"].map((badge) => (
            <div
              key={badge}
              className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center"
            >
              <span className="text-sm font-semibold text-foreground">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
