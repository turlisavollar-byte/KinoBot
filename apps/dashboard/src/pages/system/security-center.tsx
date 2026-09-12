import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Lock, AlertTriangle, CheckCircle, Activity, UserCheck, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityCenter() {
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
      timestamp: "2024-01-15 14:32:45",
      severity: "high",
    },
    {
      id: 2,
      type: "account_locked",
      user: "admin@example.com",
      ip: "192.168.1.50",
      timestamp: "2024-01-15 14:30:12",
      severity: "critical",
    },
    {
      id: 3,
      type: "successful_login",
      user: "manager@example.com",
      ip: "192.168.1.75",
      timestamp: "2024-01-15 14:28:30",
      severity: "info",
    },
    {
      id: 4,
      type: "password_reset",
      user: "user2@example.com",
      ip: "192.168.1.200",
      timestamp: "2024-01-15 14:25:00",
      severity: "warning",
    },
  ];

  const lockedAccounts = [
    {
      id: 1,
      email: "admin@example.com",
      failedAttempts: 5,
      lockedUntil: "2024-01-15 15:00:00",
      lastFailedLogin: "2024-01-15 14:30:12",
    },
    {
      id: 2,
      email: "user@example.com",
      failedAttempts: 6,
      lockedUntil: "2024-01-15 15:15:00",
      lastFailedLogin: "2024-01-15 14:20:00",
    },
    {
      id: 3,
      email: "test@example.com",
      failedAttempts: 5,
      lockedUntil: "2024-01-15 14:45:00",
      lastFailedLogin: "2024-01-15 14:15:00",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">Monitor and manage security events</p>
        </div>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.securityScore}%</div>
            <p className="text-xs text-muted-foreground">Excellent security posture</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">of {securityStats.totalUsers} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{securityStats.lockedAccounts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.failedLogins24h}</div>
            <p className="text-xs text-muted-foreground">{securityStats.successfulLogins24h} successful</p>
          </CardContent>
        </Card>
      </div>

      {/* Locked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Locked Accounts
          </CardTitle>
          <CardDescription>
            Accounts locked due to multiple failed login attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Failed Attempts</TableHead>
                <TableHead>Locked Until</TableHead>
                <TableHead>Last Failed Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lockedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.email}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{account.failedAttempts}</Badge>
                  </TableCell>
                  <TableCell>{account.lockedUntil}</TableCell>
                  <TableCell>{account.lastFailedLogin}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Unlock
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
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Real-time security monitoring and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSecurityEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium capitalize">{event.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{event.user}</TableCell>
                  <TableCell className="font-mono text-xs">{event.ip}</TableCell>
                  <TableCell>{event.timestamp}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.severity === 'critical' ? 'destructive' :
                        event.severity === 'high' ? 'destructive' :
                        event.severity === 'warning' ? 'secondary' :
                        'default'
                      }
                    >
                      {event.severity}
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
