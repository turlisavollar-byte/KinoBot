import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BarChart3,
  Film,
  Tv,
  Tag,
  Users,
  UsersRound,
  CreditCard,
  Receipt,
  Bell,
  Settings,
  Bot,
  Shield,
  Flag,
  Activity,
  Zap,
  PlusCircle,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const NAV_ITEMS = [
  { label: "nav.dashboard" as TranslationKey, href: "/", icon: LayoutDashboard, group: "nav.overview" as TranslationKey },
  {
    label: "nav.analytics" as TranslationKey,
    href: "/analytics",
    icon: BarChart3,
    group: "nav.overview" as TranslationKey,
  },
  {
    label: "nav.movies" as TranslationKey,
    href: "/catalog/movies",
    icon: Film,
    group: "nav.contentLibrary" as TranslationKey,
  },
  {
    label: "nav.series" as TranslationKey,
    href: "/catalog/series",
    icon: Tv,
    group: "nav.contentLibrary" as TranslationKey,
  },
  {
    label: "nav.genres" as TranslationKey,
    href: "/catalog/genres",
    icon: Tag,
    group: "nav.contentLibrary" as TranslationKey,
  },
  {
    label: "nav.actors" as TranslationKey,
    href: "/catalog/actors",
    icon: UsersRound,
    group: "nav.contentLibrary" as TranslationKey,
  },
  { label: "nav.users" as TranslationKey, href: "/users", icon: Users, group: "nav.audience" as TranslationKey },
  {
    label: "nav.adminUsers" as TranslationKey,
    href: "/admin-users",
    icon: Users,
    group: "nav.audience" as TranslationKey,
  },
  {
    label: "nav.subscriptions" as TranslationKey,
    href: "/subscriptions",
    icon: CreditCard,
    group: "nav.audience" as TranslationKey,
  },
  {
    label: "nav.subscriptionPlans" as TranslationKey,
    href: "/subscriptions/plans",
    icon: CreditCard,
    group: "nav.audience" as TranslationKey,
  },
  {
    label: "nav.payments" as TranslationKey,
    href: "/billing/payments",
    icon: Receipt,
    group: "nav.audience" as TranslationKey,
  },
  {
    label: "nav.notifications" as TranslationKey,
    href: "/notifications",
    icon: Bell,
    group: "nav.engagement" as TranslationKey,
  },
  {
    label: "nav.telegramConfig" as TranslationKey,
    href: "/telegram",
    icon: Bot,
    group: "nav.engagement" as TranslationKey,
  },
  {
    label: "nav.healthMonitor" as TranslationKey,
    href: "/system/health",
    icon: Activity,
    group: "nav.system" as TranslationKey,
  },
  {
    label: "nav.featureFlags" as TranslationKey,
    href: "/system/feature-flags",
    icon: Flag,
    group: "nav.system" as TranslationKey,
  },
  {
    label: "nav.auditLogs" as TranslationKey,
    href: "/system/audit-logs",
    icon: Shield,
    group: "nav.system" as TranslationKey,
  },
  { label: "nav.settings" as TranslationKey, href: "/settings", icon: Settings, group: "nav.system" as TranslationKey },
];

const ACTIONS = [
  { label: "shell.addNewMovie" as TranslationKey, href: "/catalog/movies/new", icon: PlusCircle },
  { label: "shell.addNewSeries" as TranslationKey, href: "/catalog/series/new", icon: PlusCircle },
  { label: "shell.searchContent" as TranslationKey, href: "/catalog/movies", icon: Search },
];

const GROUPS = [
  "nav.overview" as TranslationKey,
  "nav.contentLibrary" as TranslationKey,
  "nav.audience" as TranslationKey,
  "nav.engagement" as TranslationKey,
  "nav.system" as TranslationKey,
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useI18n();
  const [, navigate] = useLocation();

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      navigate(href);
    },
    [navigate, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("shell.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("shell.noResults")}</CommandEmpty>

        <CommandGroup heading={t("shell.quickActions")}>
          {ACTIONS.map((a) => (
            <CommandItem
              key={a.href}
              onSelect={() => go(a.href)}
              className="gap-2"
            >
              <a.icon className="h-4 w-4 text-primary" />
              {t(a.label)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          return (
            <CommandGroup key={group} heading={t(group)}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => go(item.href)}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {t(item.label)}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
