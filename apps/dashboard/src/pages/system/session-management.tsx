import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Smartphone, Globe, Clock, Shield, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

export default function SessionManagement() {
  const { t } = useI18n();
  // Mock data - replace with actual API calls
  const [sessions, setSessions] = useState([
    {
      id: 1,
      deviceType: "desktop",
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      sessionNameKey: "office",
      lastUsedAt: "2024-01-15 14:32:45",
      createdAt: "2024-01-15 09:00:00",
      expiresAt: "2024-01-22 09:00:00",
      isCurrent: true,
    },
    {
      id: 2,
      deviceType: "mobile",
      ip: "192.168.1.75",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      sessionNameKey: "personal",
      lastUsedAt: "2024-01-15 12:15:30",
      createdAt: "2024-01-14 18:30:00",
      expiresAt: "2024-01-21 18:30:00",
      isCurrent: false,
    },
    {
      id: 3,
      deviceType: "tablet",
      ip: "192.168.1.50",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
      sessionNameKey: "home",
      lastUsedAt: "2024-01-15 10:45:00",
      createdAt: "2024-01-13 15:00:00",
      expiresAt: "2024-01-20 15:00:00",
      isCurrent: false,
    },
  ]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Globe className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case "desktop": return t("session.deviceType.desktop");
      case "mobile": return t("session.deviceType.mobile");
      case "tablet": return t("session.deviceType.tablet");
      default: return deviceType;
    }
  };

  const getSessionName = (sessionNameKey: string) => {
    switch (sessionNameKey) {
      case "office": return t("session.sampleSession.office");
      case "personal": return t("session.sampleSession.personal");
      case "home": return t("session.sampleSession.home");
      default: return sessionNameKey;
    }
  };

  const handleRevokeSession = (sessionId: number) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const handleRevokeAll = () => {
    setSessions(sessions.filter(s => s.isCurrent));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("session.title")}</h1>
          <p className="text-muted-foreground">{t("session.subtitle")}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              {t("session.revokeOtherSessions")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("session.revokeOtherSessionsTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("session.revokeOtherSessionsDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevokeAll}>{t("session.revokeAll")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Session Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("session.activeSessions")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">{t("session.acrossDeviceTypes", { count: new Set(sessions.map(s => s.deviceType)).size })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("session.desktopSessions")}</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter(s => s.deviceType === 'desktop').length}</div>
            <p className="text-xs text-muted-foreground">{t("session.desktopSessionsDescription")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("session.mobileSessions")}</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter(s => s.deviceType === 'mobile' || s.deviceType === 'tablet').length}</div>
            <p className="text-xs text-muted-foreground">{t("session.mobileSessionsDescription")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("session.activeSessions")}
          </CardTitle>
          <CardDescription>
            {t("session.tableDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("session.device")}</TableHead>
                <TableHead>{t("session.ipAddress")}</TableHead>
                <TableHead>{t("session.sessionName")}</TableHead>
                <TableHead>{t("session.lastUsed")}</TableHead>
                <TableHead>{t("session.expires")}</TableHead>
                <TableHead>{t("session.status")}</TableHead>
                <TableHead>{t("session.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.deviceType)}
                      <div>
                        <div className="font-medium">{getDeviceTypeLabel(session.deviceType)}</div>
                        <div className="text-xs text-muted-foreground">{getDeviceTypeLabel(session.deviceType).toLocaleLowerCase()}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{session.ip}</TableCell>
                  <TableCell>{getSessionName(session.sessionNameKey)}</TableCell>
                  <TableCell>{session.lastUsedAt}</TableCell>
                  <TableCell>{session.expiresAt}</TableCell>
                  <TableCell>
                    {session.isCurrent ? (
                      <Badge variant="default">{t("session.status.current")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("session.status.active")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!session.isCurrent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("session.revokeSessionTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("session.revokeSessionDescription", { sessionName: getSessionName(session.sessionNameKey) })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevokeSession(session.id)}>
                              {t("session.revoke")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
