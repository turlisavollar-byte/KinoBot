import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Lock,
  AlertTriangle,
  CheckCircle,
  Activity,
  UserCheck,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export default function SecurityCenter() {
  const { t, formatDate } = useI18n();
  // Mock data - replace with actual API calls
  const securityStats = {
    totalUsers: 156,
    activeUsers: 142,
    lockedAccounts: 3,
    failedLogins24h: 12,
    successfulLogins24h: 89,
    securityScore: 92,
  };

  const recentSecurityEvents = [
    {
      id: 1,
      type: "failed_login",
      user: "user@example.com",
      ip: "192.168.1.100",
      timestamp: "2024-01-15T14:32:45",
      severity: "high",
    },
    {
      id: 2,
      type: "account_locked",
      user: "admin@example.com",
      ip: "192.168.1.50",
      timestamp: "2024-01-15T14:30:12",
      severity: "critical",
    },
    {
      id: 3,
      type: "successful_login",
      user: "manager@example.com",
      ip: "192.168.1.75",
      timestamp: "2024-01-15T14:28:30",
      severity: "info",
    },
    {
      id: 4,
      type: "password_reset",
      user: "user2@example.com",
      ip: "192.168.1.200",
      timestamp: "2024-01-15T14:25:00",
      severity: "warning",
    },
  ];

  const lockedAccounts = [
    {
      id: 1,
      email: "admin@example.com",
      failedAttempts: 5,
      lockedUntil: "2024-01-15T15:00:00",
      lastFailedLogin: "2024-01-15T14:30:12",
    },
    {
      id: 2,
      email: "user@example.com",
      failedAttempts: 6,
      lockedUntil: "2024-01-15T15:15:00",
      lastFailedLogin: "2024-01-15T14:20:00",
    },
    {
      id: 3,
      email: "test@example.com",
      failedAttempts: 5,
      lockedUntil: "2024-01-15T14:45:00",
      lastFailedLogin: "2024-01-15T14:15:00",
    },
  ];

  const translateEventType = (type: string) => {
    switch (type) {
      case "failed_login":
        return t("security.eventType.failedLogin");
      case "account_locked":
        return t("security.eventType.accountLocked");
      case "successful_login":
        return t("security.eventType.successfulLogin");
      case "password_reset":
        return t("security.eventType.passwordReset");
      default:
        return type;
    }
  };

  const translateSeverity = (severity: string) => {
    switch (severity) {
      case "high":
        return t("security.severity.high");
      case "critical":
        return t("security.severity.critical");
      case "info":
        return t("security.severity.info");
      case "warning":
        return t("security.severity.warning");
      default:
        return severity;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("security.title")}</h1>
          <p className="text-muted-foreground">{t("security.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.score")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.securityScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t("security.scoreDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.activeUsers")}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("security.usersTotal", { count: securityStats.totalUsers })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.lockedAccounts")}
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {securityStats.lockedAccounts}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("security.lockedAccountsAttention")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("security.failedLogins24h")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityStats.failedLogins24h}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityStats.successfulLogins24h}{" "}
              {t("security.successfulLogins")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Locked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("security.lockedAccounts")}
          </CardTitle>
          <CardDescription>
            {t("security.lockedAccountsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("security.email")}</TableHead>
                <TableHead>{t("security.failedAttempts")}</TableHead>
                <TableHead>{t("security.lockedUntil")}</TableHead>
                <TableHead>{t("security.lastFailedLogin")}</TableHead>
                <TableHead>{t("security.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lockedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.email}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {account.failedAttempts}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(account.lockedUntil, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    {formatDate(account.lastFailedLogin, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t("security.unlock")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t("security.recentEvents")}
          </CardTitle>
          <CardDescription>
            {t("security.recentEventsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("security.type")}</TableHead>
                <TableHead>{t("security.user")}</TableHead>
                <TableHead>{t("security.ipAddress")}</TableHead>
                <TableHead>{t("security.timestamp")}</TableHead>
                <TableHead>{t("security.severity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSecurityEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    {translateEventType(event.type)}
                  </TableCell>
                  <TableCell>{event.user}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.ip}
                  </TableCell>
                  <TableCell>
                    {formatDate(event.timestamp, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.severity === "critical"
                          ? "destructive"
                          : event.severity === "high"
                            ? "destructive"
                            : event.severity === "warning"
                              ? "secondary"
                              : "default"
                      }
                    >
                      {translateSeverity(event.severity)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
