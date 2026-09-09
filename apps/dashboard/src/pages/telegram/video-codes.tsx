import {
  useListVideoCodes,
  useUpdateVideoCode,
  useDeleteVideoCode,
  useImportVideoCode,
  getListVideoCodesQueryKey,
  useListTelegramChannels,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-fetch";
import { getToken } from "@/lib/auth-token";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  CheckCircle,
  XCircle,
  EyeOff,
  Eye,
  Trash2,
  Film,
  RefreshCw,
  Hash,
  AlertCircle,
  Clock,
  Link2,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { VideoCode } from "@workspace/api-client-react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-600/20 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  active: {
    label: "Active",
    color: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle,
  },
  inactive: {
    label: "Inactive",
    color: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
    icon: EyeOff,
  },
} as const;

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const statusLabels = {
    pending: "telegram.videoCodes.statusPending",
    active: "telegram.videoCodes.statusActive",
    inactive: "telegram.videoCodes.statusInactive",
  } as const;
  const label = t(
    statusLabels[status as keyof typeof statusLabels] ?? statusLabels.pending,
  );
  return (
    <Badge className={cn("flex items-center gap-1 w-fit border", cfg.color)}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="font-mono text-lg font-bold tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded">
      {code}
    </span>
  );
}

export default function VideoCodes() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: codesPage, isLoading } = useListVideoCodes();
  const codes = codesPage || [];
  const { data: channels } = useListTelegramChannels();
  const updateCode = useUpdateVideoCode();
  const deleteCode = useDeleteVideoCode();
  const importCode = useImportVideoCode();

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadChannel, setUploadChannel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import (file_id) state
  const [importOpen, setImportOpen] = useState(false);
  const [importFileId, setImportFileId] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importDesc, setImportDesc] = useState("");
  const [importChannel, setImportChannel] = useState("");
  const [importDuration, setImportDuration] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<VideoCode | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListVideoCodesQueryKey() });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error(t("videoCodes.onlyVideoFiles"));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t("videoCodes.fileSizeLimit"));
      return;
    }
    setSelectedFile(file);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      toast.error(t("videoCodes.fileAndTitleRequired"));
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("video", selectedFile);
      form.append("title", uploadTitle.trim());
      if (uploadDesc.trim()) form.append("description", uploadDesc.trim());
      if (uploadChannel) form.append("channelId", uploadChannel);

      // Must NOT use apiFetch here — it forces Content-Type: application/json
      // which breaks multipart/form-data (multer never runs, JSON parser hits size limit).
      const token = getToken();
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/video-codes/upload`, {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? res.statusText);
      }
      const result = (await res.json()) as {
        code: string;
        title: string;
        status: string;
      };

      toast.success(t("videoCodes.uploadSuccess", { code: result.code }));
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDesc("");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message ?? t("videoCodes.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = () => {
    if (!importFileId.trim() || !importTitle.trim()) {
      toast.error(t("videoCodes.fileIdAndTitleRequired"));
      return;
    }
    const durSec = importDuration ? parseInt(importDuration, 10) : undefined;
    importCode.mutate(
      {
        data: {
          telegramFileId: importFileId.trim(),
          title: importTitle.trim(),
          description: importDesc.trim() || undefined,
          channelId: importChannel || undefined,
          duration: durSec && !isNaN(durSec) ? durSec : undefined,
        } as any,
      },
      {
        onSuccess: (res) => {
          toast.success(
            t("videoCodes.importSuccess", { code: res.code ?? "" }),
          );
          setImportOpen(false);
          setImportFileId("");
          setImportTitle("");
          setImportDesc("");
          setImportChannel("");
          setImportDuration("");
          invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleStatusChange = (code: any, status: string) => {
    if (!code.id) return;
    updateCode.mutate(
      {
        id: code.id,
        data: { status: status as "pending" | "active" | "inactive" },
      },
      {
        onSuccess: () => {
          toast.success(t("videoCodes.statusUpdated"));
          invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleDelete = (code: VideoCode) => setDeleteTarget(code);

  const confirmDelete = () => {
    if (!deleteTarget?.id) return;
    deleteCode.mutate(
      { id: deleteTarget.id as string },
      {
        onSuccess: () => {
          toast.success(
            t("videoCodes.codeDeleted", { code: deleteTarget.code || "" }),
          );
          setDeleteTarget(null);
          invalidate();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const pending = codes?.filter((c) => c.status === "pending") ?? [];
  const active = codes?.filter((c) => c.status === "active") ?? [];

  if (isLoading)
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("videoCodes.loading")}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("videoCodes.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("videoCodes.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" /> {t("videoCodes.fileIdImport")}
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> {t("videoCodes.uploadVideo")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: t("videoCodes.pending"),
            count: pending.length,
            color: "text-amber-400",
          },
          {
            label: t("videoCodes.activeCodes"),
            count: active.length,
            color: "text-emerald-400",
          },
          {
            label: t("videoCodes.totalViews"),
            count:
              codes?.reduce(
                (s: number, c: any) => s + (c.viewsCount ?? 0),
                0,
              ) ?? 0,
            color: "text-blue-400",
          },
        ].map(({ label, count, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-3xl font-bold mt-0.5", color)}>{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approval */}
      {pending.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-300">
              <AlertCircle className="h-4 w-4" />{" "}
              {t("videoCodes.awaitingApproval")} ({pending.length})
            </CardTitle>
            <CardDescription className="text-amber-400/70 text-xs">
              {t("videoCodes.awaitingApprovalDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-amber-950/20 border border-amber-500/20"
                >
                  <CodeBadge code={c.code || ""} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                      onClick={() => handleStatusChange(c, "active")}
                      disabled={updateCode.isPending}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />{" "}
                      {t("videoCodes.activate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All codes table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" /> {t("videoCodes.allCodes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!codes?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("videoCodes.noVideosYet")}</p>
              <p className="text-xs mt-1">{t("videoCodes.noVideosDesc")}</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      t("videoCodes.codeHeader"),
                      t("videoCodes.titleHeader"),
                      t("videoCodes.sizeHeader"),
                      t("videoCodes.viewsHeader"),
                      t("videoCodes.statusHeader"),
                      t("videoCodes.actionsHeader"),
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {codes.map((c: any) => (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <CodeBadge code={c.code} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.title}</p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {c.fileSize
                          ? `${(c.fileSize / 1024 / 1024).toFixed(1)} MB`
                          : "—"}
                        {c.duration ? (
                          <>
                            <br />
                            {Math.floor(c.duration / 60)}:
                            {String(c.duration % 60).padStart(2, "0")}
                          </>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {(c.viewsCount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.status !== "active" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-400 hover:bg-emerald-950/30"
                              title={t("videoCodes.activateTooltip")}
                              onClick={() => handleStatusChange(c, "active")}
                              disabled={updateCode.isPending}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {c.status === "active" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-zinc-400 hover:bg-zinc-800"
                              title={t("videoCodes.deactivateTooltip")}
                              onClick={() => handleStatusChange(c, "inactive")}
                              disabled={updateCode.isPending}
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:bg-red-950/30"
                            title={t("videoCodes.deleteTooltip")}
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── File ID Import Dialog ─────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />{" "}
              {t("videoCodes.fileIdImportDialog")}
            </DialogTitle>
            <DialogDescription>
              {t("videoCodes.fileIdImportDesc")}
            </DialogDescription>
          </DialogHeader>

          {/* How to get file_id hint */}
          <div className="flex gap-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 p-3 text-xs text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">
                {t("videoCodes.howToGetFileId")}
              </p>
              <ol className="space-y-0.5 text-blue-300/80 list-decimal list-inside">
                <li>
                  {t("videoCodes.howToGetFileIdStep1")}{" "}
                  <strong>FavoriteKinoBot</strong>
                </li>
                <li>{t("videoCodes.howToGetFileIdStep2")}</li>
                <li>{t("videoCodes.howToGetFileIdStep3")}</li>
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            {/* File ID */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.telegramFileId")}</Label>
              <Input
                value={importFileId}
                onChange={(e) => setImportFileId(e.target.value)}
                placeholder="BQACAgIAAxkBAAI..."
                className="font-mono text-xs"
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.titleLabel")}</Label>
              <Input
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder={t("videoCodes.titlePlaceholder")}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.descriptionLabel")}</Label>
              <Textarea
                value={importDesc}
                onChange={(e) => setImportDesc(e.target.value)}
                placeholder={t("videoCodes.descriptionPlaceholder")}
                className="resize-none h-16"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.durationSeconds")}</Label>
              <Input
                type="number"
                value={importDuration}
                onChange={(e) => setImportDuration(e.target.value)}
                placeholder={t("videoCodes.durationPlaceholder")}
              />
            </div>

            {/* Channel selector */}
            {channels && channels.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t("videoCodes.channel")}</Label>
                <Select value={importChannel} onValueChange={setImportChannel}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("videoCodes.channelPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.channelId}>
                        {ch.title} ({ch.channelId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setImportOpen(false)}
                disabled={importCode.isPending}
              >
                {t("videoCodes.cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !importFileId.trim() ||
                  !importTitle.trim() ||
                  importCode.isPending
                }
                className="gap-2"
              >
                {importCode.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {importCode.isPending
                  ? t("videoCodes.checking")
                  : t("videoCodes.import")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />{" "}
              {t("videoCodes.uploadDialog")}
            </DialogTitle>
            <DialogDescription>{t("videoCodes.uploadDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/50",
                selectedFile && "border-emerald-500/50 bg-emerald-950/10",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
              }}
            >
              {selectedFile ? (
                <>
                  <Film className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  <p className="font-medium text-sm text-emerald-300">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {t("videoCodes.dropFileHere")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("videoCodes.orClickToSelect")}
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            {/* Title */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.titleLabel")}</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={t("videoCodes.titlePlaceholder")}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t("videoCodes.descriptionLabel")}</Label>
              <Textarea
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder={t("videoCodes.descriptionPlaceholder")}
                className="resize-none h-16"
              />
            </div>

            {/* Channel selector */}
            {channels && channels.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t("videoCodes.channel")}</Label>
                <Select value={uploadChannel} onValueChange={setUploadChannel}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("videoCodes.channelPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.channelId}>
                        {ch.title} ({ch.channelId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                {t("videoCodes.cancel")}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadTitle.trim() || uploading}
                className="gap-2"
              >
                {uploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? t("videoCodes.uploading") : t("videoCodes.upload")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("videoCodes.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("videoCodes.deleteConfirmDesc", {
                code: deleteTarget?.code ?? "",
                title: deleteTarget?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("videoCodes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("videoCodes.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
