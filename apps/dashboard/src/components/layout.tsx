import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIdentityGetMe, useIdentityLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clearTokens } from "@/lib/auth-token";
import { useI18n } from "@/lib/i18n";
import { Search, LogOut, User, Keyboard, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const BREADCRUMB_MAP: Record<string, string[]> = {
  "/":                       ["Dashboard"],
  "/analytics":              ["Analytics"],
  "/catalog/movies":         ["Catalog", "Movies"],
  "/catalog/series":         ["Catalog", "Series"],
  "/catalog/genres":         ["Catalog", "Genres"],
  "/catalog/actors":         ["Catalog", "Actors"],
  "/users":                  ["Users"],
  "/subscriptions":          ["Subscriptions"],
  "/subscriptions/plans":    ["Subscriptions", "Plans"],
  "/billing/payments":       ["Billing", "Payments"],
  "/notifications":          ["Notifications"],
  "/telegram":               ["Telegram", "Config"],
  "/system/health":          ["System", "Health"],
  "/system/feature-flags":   ["System", "Feature Flags"],
  "/system/audit-logs":      ["System", "Audit Logs"],
  "/settings":               ["Settings"],
};

function getBreadcrumb(location: string): string[] {
  if (BREADCRUMB_MAP[location]) return BREADCRUMB_MAP[location];
  const base = Object.keys(BREADCRUMB_MAP)
    .filter((k) => k !== "/" && location.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return base ? [...(BREADCRUMB_MAP[base] ?? []), "Detail"] : ["—"];
}

function TopHeader() {
  const [location, navigate] = useLocation();
  const { open, setOpen } = useCommandPalette();
  const { data: me } = useIdentityGetMe();
  const logout = useIdentityLogout();
  const queryClient = useQueryClient();
  const { locale, setLocale, t } = useI18n();
  const crumbs = getBreadcrumb(location);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearTokens();
        queryClient.clear();
        navigate("/");
      },
    });
  };

  return (
    <>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
        {/* Left: sidebar trigger + breadcrumb */}
        <SidebarTrigger className="h-7 w-7 shrink-0" />
        <Separator orientation="vertical" className="h-5 opacity-40" />
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-muted-foreground/40 text-xs">/</span>}
              <span className={cn(
                "truncate",
                i === crumbs.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground text-xs",
              )}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-2 text-xs text-muted-foreground hidden sm:flex"
            onClick={() => setOpen(true)}
          >
            <Search className="h-3 w-3" />
            {t("shell.search")}
            <kbd className="pointer-events-none ml-1 inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[9px]">
              <span>⌘K</span>
            </kbd>
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 sm:hidden"
            onClick={() => setOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-2 px-2">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs font-medium hidden md:block">
                  {t(`language.${locale}`)}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setLocale("uz")} className="gap-2 text-xs">
                <span className="w-4 text-center">🇺🇿</span> {t("language.uz")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("ru")} className="gap-2 text-xs">
                <span className="w-4 text-center">🇷🇺</span> {t("language.ru")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")} className="gap-2 text-xs">
                <span className="w-4 text-center">🇬🇧</span> {t("language.en")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-2 px-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {me?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium hidden md:block max-w-28 truncate">
                  {me?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">
                <p className="font-semibold truncate">{me?.email}</p>
                <p className="text-muted-foreground capitalize font-normal">{me?.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 text-xs">
                <User className="h-3.5 w-3.5" /> {t("nav.settings")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpen(true)} className="gap-2 text-xs">
                <Keyboard className="h-3.5 w-3.5" />
                {t("shell.quickActions")}
                <kbd className="ml-auto text-[9px] bg-muted px-1 rounded">⌘K</kbd>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" /> {t("shell.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <main className="flex-1 overflow-auto">
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
