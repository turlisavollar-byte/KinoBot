// modules/audit/ui/AuditLogs.tsx

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format as dateFormat, subDays, isWithinInterval } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Shield,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Settings,
  Send,
  AlertCircle,
  Download,
  Upload,
  Filter,
  X,
  Clock,
  User,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  ExternalLink,
  Eye,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// ==================== Types ====================

type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "UPSERT"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "REGISTER"
  | "VERIFY_EMAIL"
  | "RESET_PASSWORD"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_UPDATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "BOT_COMMAND"
  | "CONFIG_CHANGED"
  | "ROLE_CHANGED"
  | "PERMISSION_CHANGED"
  | "EXPORT_DATA"
  | "IMPORT_DATA"
  | "SYSTEM_START"
  | "SYSTEM_STOP"
  | "ERROR"
  | "WARNING"
  | "AUDIT_VIEW"
  | "AUDIT_EXPORT"
  | "SECURITY_ALERT"
  | "COMPLIANCE_CHECK";

type AuditActorType =
  "USER" | "ADMIN" | "SYSTEM" | "BOT" | "API" | "WEBHOOK" | "CRON_JOB";
type AuditTargetType =
  | "USER"
  | "ADMIN"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "CONFIG"
  | "BOT"
  | "AUDIT_LOG"
  | "ROLE"
  | "PERMISSION"
  | "ORGANIZATION"
  | "TEAM"
  | "PROJECT"
  | "DATABASE"
  | "FILE"
  | "UNKNOWN";
type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface AuditLog {
  id: string;
  actorId?: string;
  actorType: AuditActorType;
  actorEmail?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  diff?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  severity?: AuditSeverity;
  tags?: string[];
  createdAt: string;
  createdAtIso: string;
}

interface AuditLogListResponse {
  data: AuditLog[];
  meta: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
    filteredCount?: number;
  };
}

interface AuditStatistics {
  total: number;
  byAction: Record<AuditAction, number>;
  byActorType: Record<AuditActorType, number>;
  byTargetType: Record<AuditTargetType, number>;
  bySeverity?: Record<AuditSeverity, number>;
  period: {
    start: string;
    end: string;
  };
  insights?: {
    topActions: Array<{ action: AuditAction; count: number }>;
    topActors: Array<{ actorId: string; count: number }>;
    anomalyDetected?: boolean;
  };
}

// ==================== Constants ====================

const ACTION_META: Record<
  AuditAction,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    label: string;
    category: "auth" | "crud" | "payment" | "system" | "admin" | "security";
  }
> = {
  LOGIN: {
    icon: LogIn,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    label: "Login",
    category: "auth",
  },
  LOGOUT: {
    icon: LogOut,
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10",
    label: "Logout",
    category: "auth",
  },
  LOGIN_FAILED: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Login Failed",
    category: "auth",
  },
  REGISTER: {
    icon: Plus,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    label: "Register",
    category: "auth",
  },
  VERIFY_EMAIL: {
    icon: Check,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    label: "Verify Email",
    category: "auth",
  },
  RESET_PASSWORD: {
    icon: Settings,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Reset Password",
    category: "auth",
  },
  CREATE: {
    icon: Plus,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    label: "Create",
    category: "crud",
  },
  READ: {
    icon: Eye,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    label: "Read",
    category: "crud",
  },
  UPDATE: {
    icon: Edit,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Update",
    category: "crud",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Delete",
    category: "crud",
  },
  UPSERT: {
    icon: Edit,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    label: "Upsert",
    category: "crud",
  },
  SUBSCRIPTION_CREATED: {
    icon: Plus,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    label: "Subscription Created",
    category: "payment",
  },
  SUBSCRIPTION_CANCELLED: {
    icon: Trash2,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Subscription Cancelled",
    category: "payment",
  },
  SUBSCRIPTION_UPDATED: {
    icon: Edit,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Subscription Updated",
    category: "payment",
  },
  PAYMENT_COMPLETED: {
    icon: Check,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    label: "Payment Completed",
    category: "payment",
  },
  PAYMENT_FAILED: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Payment Failed",
    category: "payment",
  },
  PAYMENT_REFUNDED: {
    icon: LogOut,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Payment Refunded",
    category: "payment",
  },
  BOT_COMMAND: {
    icon: Send,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    label: "Bot Command",
    category: "system",
  },
  CONFIG_CHANGED: {
    icon: Settings,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    label: "Config Changed",
    category: "admin",
  },
  ROLE_CHANGED: {
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    label: "Role Changed",
    category: "admin",
  },
  PERMISSION_CHANGED: {
    icon: Shield,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    label: "Permission Changed",
    category: "admin",
  },
  EXPORT_DATA: {
    icon: Download,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    label: "Export Data",
    category: "admin",
  },
  IMPORT_DATA: {
    icon: Upload,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    label: "Import Data",
    category: "admin",
  },
  SYSTEM_START: {
    icon: Info,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    label: "System Start",
    category: "system",
  },
  SYSTEM_STOP: {
    icon: Info,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "System Stop",
    category: "system",
  },
  ERROR: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Error",
    category: "system",
  },
  WARNING: {
    icon: AlertCircle,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    label: "Warning",
    category: "system",
  },
  AUDIT_VIEW: {
    icon: Eye,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    label: "Audit View",
    category: "security",
  },
  AUDIT_EXPORT: {
    icon: Download,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    label: "Audit Export",
    category: "security",
  },
  SECURITY_ALERT: {
    icon: Shield,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    label: "Security Alert",
    category: "security",
  },
  COMPLIANCE_CHECK: {
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    label: "Compliance Check",
    category: "security",
  },
};

const SEVERITY_COLORS: Record<
  AuditSeverity,
  { bg: string; text: string; border: string }
> = {
  LOW: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  MEDIUM: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  HIGH: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  CRITICAL: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
};

const ACTOR_TYPE_COLORS: Record<AuditActorType, string> = {
  USER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
  SYSTEM: "bg-gray-100 text-gray-700",
  BOT: "bg-cyan-100 text-cyan-700",
  API: "bg-emerald-100 text-emerald-700",
  WEBHOOK: "bg-orange-100 text-orange-700",
  CRON_JOB: "bg-indigo-100 text-indigo-700",
};

// ==================== Helper Functions ====================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 5) return "just now";
  if (minutes < 1) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return dateFormat(new Date(dateStr), "MMM d, yyyy");
}

function dateFormatFn(dateStr: string): string {
  return dateFormat(new Date(dateStr), "MMM d, yyyy HH:mm:ss");
}

function getActionMeta(action: AuditAction) {
  return (
    ACTION_META[action] || {
      icon: Shield,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      label: action.replace(/_/g, " "),
      category: "other" as const,
    }
  );
}

// ==================== Components ====================

// Sub-component: Log Details Dialog
function LogDetailsDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!log) return null;

  const meta = getActionMeta(log.action);
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", meta.color)} />
            <span>{t("system.auditLogs.details")}</span>
            <Badge variant="outline" className="ml-2">
              {log.id.slice(0, 12)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {t("system.auditLogs.detailsDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(80vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Action</p>
                <p className="font-medium">{meta.label}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Severity</p>
                {log.severity ? (
                  <Badge
                    className={cn(
                      SEVERITY_COLORS[log.severity].bg,
                      SEVERITY_COLORS[log.severity].text,
                    )}
                  >
                    {log.severity}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Actor</p>
                <div className="flex items-center gap-2">
                  <Badge className={ACTOR_TYPE_COLORS[log.actorType]}>
                    {log.actorType}
                  </Badge>
                  {log.actorEmail && (
                    <span className="text-sm">{log.actorEmail}</span>
                  )}
                  {log.actorId && (
                    <code className="text-xs bg-muted px-1 rounded">
                      {log.actorId.slice(0, 8)}…
                    </code>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{log.targetType}</Badge>
                  {log.targetName && (
                    <span className="text-sm">{log.targetName}</span>
                  )}
                  {log.targetId && (
                    <code className="text-xs bg-muted px-1 rounded">
                      {log.targetId.slice(0, 8)}…
                    </code>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="text-sm font-mono">
                  {dateFormatFn(log.createdAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Request ID</p>
                {log.requestId ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-1 rounded">
                      {log.requestId.slice(0, 12)}…
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(log.requestId!)}
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </div>
            </div>

            {/* Changes */}
            {(log.oldValue || log.newValue || log.diff) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Changes</h4>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  {log.diff &&
                    Object.entries(log.diff).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="font-medium">{key}</span>
                        <span className="text-red-400 line-through">
                          {String(value.old)}
                        </span>
                        <span className="text-emerald-400">
                          {String(value.new)}
                        </span>
                      </div>
                    ))}
                  {!log.diff && log.oldValue && (
                    <div>
                      <p className="text-sm text-muted-foreground">Old Value</p>
                      <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!log.diff && log.newValue && (
                    <div>
                      <p className="text-sm text-muted-foreground">New Value</p>
                      <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Tags */}
            {log.tags && log.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {log.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Context */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Context</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {log.ipAddress && (
                  <div>
                    <p className="text-muted-foreground">IP Address</p>
                    <p className="font-mono">{log.ipAddress}</p>
                  </div>
                )}
                {log.userAgent && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {log.userAgent}
                    </p>
                  </div>
                )}
                {log.sessionId && (
                  <div>
                    <p className="text-muted-foreground">Session ID</p>
                    <p className="font-mono text-xs">{log.sessionId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component: Statistics Card
function StatisticsCard({ stats }: { stats: AuditStatistics }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("system.auditLogs.totalLogs")}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Shield className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("system.auditLogs.topAction")}</p>
              <p className="text-lg font-semibold">
                {stats.insights?.topActions[0]?.action || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.insights?.topActions[0]?.count || 0} {t("system.auditLogs.events")}
              </p>
            </div>
            <LogIn className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("system.auditLogs.topActor")}</p>
              <p className="text-lg font-semibold">
                {stats.insights?.topActors[0]?.actorId?.slice(0, 8) || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.insights?.topActors[0]?.count || 0} {t("system.auditLogs.events")}
              </p>
            </div>
            <User className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("system.auditLogs.anomalies")}</p>
              <p className="text-lg font-semibold">
                {stats.insights?.anomalyDetected ? "⚠️" : "✅"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.insights?.anomalyDetected ? t("system.auditLogs.detected") : t("system.auditLogs.noneDetected")}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Main Component ====================

export default function AuditLogs() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [actorTypeFilter, setActorTypeFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Query
  const { data, isLoading, isFetching, refetch, error } =
    useQuery<AuditLogListResponse>({
      queryKey: [
        "audit-logs",
        actionFilter,
        actorTypeFilter,
        severityFilter,
        searchQuery,
        dateRange,
        cursor,
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (actionFilter !== "ALL") params.append("action", actionFilter);
        if (actorTypeFilter !== "ALL")
          params.append("actorType", actorTypeFilter);
        if (severityFilter !== "ALL") params.append("severity", severityFilter);
        if (searchQuery) params.append("q", searchQuery);
        if (dateRange.from)
          params.append("startDate", dateRange.from.toISOString());
        if (dateRange.to) params.append("endDate", dateRange.to.toISOString());
        if (cursor) params.append("cursor", cursor);
        params.append("limit", "50");

        const response = (await apiFetch(
          `/api/audit-logs?${params.toString()}`,
        )) as AuditLogListResponse;
        return response;
      },
      refetchInterval: 60000,
      retry: 3,
      staleTime: 30000,
    });

  // Mutations
  const exportMutation = useMutation({
    mutationFn: async (exportFormat: "csv" | "json") => {
      const params = new URLSearchParams();
      params.append("format", exportFormat);
      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (actorTypeFilter !== "ALL")
        params.append("actorType", actorTypeFilter);
      if (dateRange.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) params.append("endDate", dateRange.to.toISOString());
      params.append("limit", "1000");

      const response = await apiFetch(
        `/api/audit-logs/export?${params.toString()}`,
      );
      return response;
    },
    onSuccess: (data, exportFormat) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: exportFormat === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${dateFormat(new Date(), "yyyy-MM-dd")}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: t("system.auditLogs.exportSuccess"),
        description: t("system.auditLogs.exportedAs", { format: exportFormat.toUpperCase() }),
      });
    },
    onError: () => {
      toast({
        title: t("system.auditLogs.exportFailed"),
        description: t("system.auditLogs.exportError"),
        variant: "destructive",
      });
    },
  });

  // Statistics query
  const { data: statsData } = useQuery<{ data: AuditStatistics }>({
    queryKey: ["audit-statistics", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) params.append("endDate", dateRange.to.toISOString());
      params.append("insights", "true");

      return apiFetch(
        `/api/audit-logs/statistics?${params.toString()}`,
      ) as unknown as { data: AuditStatistics };
    },
    enabled: showStats && !!dateRange.from && !!dateRange.to,
    staleTime: 60000,
  });

  // Effects
  useEffect(() => {
    if (data) {
      setLogs((prev) => (cursor ? [...prev, ...data.data] : data.data));
      setHasMore(data.meta.hasMore);
    }
  }, [data]);

  // Handlers
  const handleLoadMore = () => {
    if (data?.meta.nextCursor) {
      setCursor(data.meta.nextCursor);
    }
  };

  const handleResetFilters = () => {
    setActionFilter("ALL");
    setActorTypeFilter("ALL");
    setSeverityFilter("ALL");
    setSearchQuery("");
    setDateRange({});
    setCursor(undefined);
    setLogs([]);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleExport = async (exportFormat: "csv" | "json") => {
    await exportMutation.mutateAsync(exportFormat);
  };

  // Render
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("system.auditLogs.title")}
        subtitle={t("system.auditLogs.subtitle")}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showStats ? t("system.auditLogs.hideStats") : t("system.auditLogs.showStats")}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t("system.auditLogs.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                {t("system.auditLogs.exportJson")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                {t("system.auditLogs.exportCsv")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
            {t("common.refresh")}
          </Button>
        </div>
      </PageHeader>

      {/* Statistics */}
      {showStats && statsData?.data && (
        <StatisticsCard stats={statsData.data} />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-50">
              <Input
                placeholder={t("system.auditLogs.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder={t("system.auditLogs.action")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("system.auditLogs.allActions")}</SelectItem>
                {Object.keys(ACTION_META).map((action) => (
                  <SelectItem key={action} value={action}>
                    {ACTION_META[action as AuditAction].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actorTypeFilter} onValueChange={setActorTypeFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actors</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="BOT">Bot</SelectItem>
                <SelectItem value="API">API</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severity</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={
                dateRange.from ? dateFormat(dateRange.from, "yyyy-MM-dd") : ""
              }
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  from: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
              className="w-40 h-9"
            />
            <Input
              type="date"
              value={dateRange.to ? dateFormat(dateRange.to, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  to: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
              className="w-40 h-9"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Active filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {actionFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1">
                Action:{" "}
                {ACTION_META[actionFilter as AuditAction]?.label ||
                  actionFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setActionFilter("ALL")}
                />
              </Badge>
            )}
            {actorTypeFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1">
                Actor: {actorTypeFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setActorTypeFilter("ALL")}
                />
              </Badge>
            )}
            {severityFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1">
                Severity: {severityFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSeverityFilter("ALL")}
                />
              </Badge>
            )}
            {dateRange.from && (
              <Badge variant="secondary" className="gap-1">
                {dateFormat(dateRange.from, "MMM d")} -{" "}
                {dateRange.to ? dateFormat(dateRange.to, "MMM d") : "now"}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setDateRange({})}
                />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSearchQuery("")}
                />
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {isLoading && logs.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <p className="font-semibold">Failed to load audit logs</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error
                ? error.message
                : "Please try again later"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">No audit logs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or wait for new events
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const meta = getActionMeta(log.action);
            const Icon = meta.icon;

            return (
              <Card
                key={log.id}
                className={cn(
                  "transition-all hover:border-border/80 cursor-pointer",
                  log.severity === "CRITICAL" && "border-red-500/50",
                )}
                onClick={() => handleViewDetails(log)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn("p-2 rounded-lg shrink-0", meta.bgColor)}
                      >
                        <Icon className={cn("h-4 w-4", meta.color)} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {meta.label}
                          </span>

                          {log.severity && (
                            <Badge
                              className={cn(
                                "text-xs",
                                SEVERITY_COLORS[log.severity].bg,
                                SEVERITY_COLORS[log.severity].text,
                                "border-0",
                              )}
                            >
                              {log.severity}
                            </Badge>
                          )}

                          <Badge
                            className={cn(
                              "text-xs",
                              ACTOR_TYPE_COLORS[log.actorType],
                            )}
                          >
                            {log.actorType}
                          </Badge>

                          {log.actorEmail && (
                            <span className="text-xs text-muted-foreground">
                              {log.actorEmail}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {log.targetType}
                          </span>

                          {log.targetName && (
                            <>
                              <span>·</span>
                              <span>{log.targetName}</span>
                            </>
                          )}

                          {log.targetId && (
                            <>
                              <span>·</span>
                              <code className="text-xs bg-muted px-1 rounded">
                                {log.targetId.slice(0, 8)}…
                              </code>
                            </>
                          )}

                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {timeAgo(log.createdAt)}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {dateFormat(
                                    log.createdAt,
                                    "MMM d, yyyy HH:mm:ss",
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                        </div>

                        {log.metadata &&
                          Object.keys(log.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(log.metadata)
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <Badge
                                    key={key}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              {Object.keys(log.metadata).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{Object.keys(log.metadata).length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                        {log.tags && log.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {log.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(log);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isFetching}
                className="gap-2"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <LogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
