import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import {
  getIdentityGetMeQueryKey,
  useIdentityGetMe,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { clearTokens, getAccessToken } from "@/lib/auth-token";

// ─── Pages ───────────────────────────────────────────────────────────────────
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";

import MoviesList from "@/pages/movies/list";
import NewMovie from "@/pages/movies/new";
import MovieDetail from "@/pages/movies/detail";
import SeriesList from "@/pages/series/list";
import NewSeries from "@/pages/series/new";
import SeriesDetail from "@/pages/series/detail";
import GenresList from "@/pages/genres/list";
import ActorsList from "@/pages/actors/list";

import UsersList from "@/pages/users/list";
import AdminUsersList from "@/pages/users/admin-list";
import UserDetail from "@/pages/users/detail";
import PlansList from "@/pages/subscriptions/plans";
import SubscriptionsList from "@/pages/subscriptions/list";
import PaymentsList from "@/pages/payments/list";

import NotificationsList from "@/pages/notifications/list";
import TelegramConfig from "@/pages/telegram/config";
import VideoCodes from "@/pages/telegram/video-codes";

import SystemHealth from "@/pages/system/health";
import FeatureFlags from "@/pages/system/feature-flags";
import AuditLogs from "@/pages/system/audit-logs";
import Settings from "@/pages/settings/index";

// ─── Query Client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const hasAccessToken = Boolean(getAccessToken());
  const {
    data: user,
    isLoading,
    error,
  } = useIdentityGetMe({
    query: {
      queryKey: getIdentityGetMeQueryKey(),
      enabled: hasAccessToken,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      clearTokens();
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading system…
        </div>
      </div>
    );
  }

  if (error || !user) return <Login />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  const P = (C: React.ComponentType) => () => <ProtectedRoute component={C} />;
  return (
    <Switch>
      {/* Overview */}
      <Route path="/" component={P(Dashboard)} />
      <Route path="/analytics" component={P(Analytics)} />

      {/* Catalog */}
      <Route path="/catalog/movies" component={P(MoviesList)} />
      <Route path="/catalog/movies/new" component={P(NewMovie)} />
      <Route path="/catalog/movies/:id" component={P(MovieDetail)} />
      <Route path="/catalog/series" component={P(SeriesList)} />
      <Route path="/catalog/series/new" component={P(NewSeries)} />
      <Route path="/catalog/series/:id" component={P(SeriesDetail)} />
      <Route path="/catalog/genres" component={P(GenresList)} />
      <Route path="/catalog/actors" component={P(ActorsList)} />

      {/* Audience */}
      <Route path="/users" component={P(UsersList)} />
      <Route path="/admin-users" component={P(AdminUsersList)} />
      <Route path="/users/:id" component={P(UserDetail)} />
      <Route path="/subscriptions/plans" component={P(PlansList)} />
      <Route path="/subscriptions" component={P(SubscriptionsList)} />
      <Route path="/billing/payments" component={P(PaymentsList)} />

      {/* Engagement */}
      <Route path="/notifications" component={P(NotificationsList)} />
      <Route path="/telegram" component={P(TelegramConfig)} />
      <Route path="/telegram/video-codes" component={P(VideoCodes)} />

      {/* System */}
      <Route path="/system/health" component={P(SystemHealth)} />
      <Route path="/system/feature-flags" component={P(FeatureFlags)} />
      <Route path="/system/audit-logs" component={P(AuditLogs)} />

      {/* Settings */}
      <Route path="/settings" component={P(Settings)} />

      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="streamops-theme">
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
