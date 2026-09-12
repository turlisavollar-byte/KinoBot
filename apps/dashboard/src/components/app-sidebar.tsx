import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  BarChart3,
  Film,
  Tv,
  Tag,
  UsersRound,
  Users,
  CreditCard,
  Layers,
  Receipt,
  Bell,
  Bot,
  Activity,
  Flag,
  Shield,
  Settings,
  PlaySquare,
  Hash,
  Monitor,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const NAV = [
  {
    group: "nav.overview" as TranslationKey,
    items: [
      { label: "nav.dashboard" as TranslationKey, href: "/", icon: LayoutDashboard },
      { label: "nav.analytics" as TranslationKey, href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "nav.contentLibrary" as TranslationKey,
    items: [
      { label: "nav.movies" as TranslationKey, href: "/catalog/movies", icon: Film },
      { label: "nav.series" as TranslationKey, href: "/catalog/series", icon: Tv },
      { label: "nav.genres" as TranslationKey, href: "/catalog/genres", icon: Tag },
      { label: "nav.actors" as TranslationKey, href: "/catalog/actors", icon: UsersRound },
    ],
  },
  {
    group: "nav.audience" as TranslationKey,
    items: [
      { label: "nav.users" as TranslationKey, href: "/users", icon: Users },
      { label: "nav.adminUsers" as TranslationKey, href: "/admin-users", icon: Shield },
      { label: "nav.subscriptions" as TranslationKey, href: "/subscriptions", icon: CreditCard },
      { label: "nav.plans" as TranslationKey, href: "/subscriptions/plans", icon: Layers },
      { label: "nav.payments" as TranslationKey, href: "/billing/payments", icon: Receipt },
    ],
  },
  {
    group: "nav.engagement" as TranslationKey,
    items: [
      { label: "nav.notifications" as TranslationKey, href: "/notifications", icon: Bell },
      { label: "nav.telegramBot" as TranslationKey, href: "/telegram", icon: Bot },
      { label: "nav.videoCodes" as TranslationKey, href: "/telegram/video-codes", icon: Hash },
    ],
  },
  {
    group: "nav.system" as TranslationKey,
    items: [
      { label: "nav.healthMonitor" as TranslationKey, href: "/system/health", icon: Activity },
      { label: "nav.securityCenter" as TranslationKey, href: "/system/security-center", icon: Shield },
      { label: "nav.sessionManagement" as TranslationKey, href: "/system/session-management", icon: Monitor },
      { label: "nav.featureFlags" as TranslationKey, href: "/system/feature-flags", icon: Flag },
      { label: "nav.auditLogs" as TranslationKey, href: "/system/audit-logs", icon: Shield },
    ],
  },
];

function isActive(location: string, href: string) {
  if (href === "/") return location === "/";
  return location.startsWith(href);
}

export function AppSidebar() {
  const { t } = useI18n();
  const [location, navigate] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/50 py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PlaySquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">StreamOps</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {t("app.adminPanel")}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map(({ group, items }, gi) => (
          <SidebarGroup key={group}>
            {gi > 0 && <SidebarSeparator className="mb-1" />}
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3">
              {t(group)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ label, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(location, href)}
                      className="gap-2.5 h-8 text-sm"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2"
                        onClick={() => navigate(href)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{t(label)}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(location, "/settings")}
              className="gap-2.5 h-8 text-sm"
            >
              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>{t("nav.settings")}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
          {t("app.version")}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
