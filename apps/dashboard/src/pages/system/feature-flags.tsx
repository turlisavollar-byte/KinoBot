import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Trash2, Flag, Percent } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: "enabled" | "disabled" | "rollout";
  rolloutPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS = {
  enabled:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  disabled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  rollout:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function FeatureFlags() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{ key: string; name: string; description: string; status: "enabled" | "disabled" | "rollout"; rolloutPercentage: number }>(
    { key: "", name: "", description: "", status: "disabled", rolloutPercentage: 0 },
  );

  const { data, isLoading } = useQuery<{ data: FeatureFlag[] }>({
    queryKey: ["feature-flags"],
    queryFn: () => apiFetch("/api/feature-flags"),
  });

  const flags = data?.data ?? [];

  const toggleStatus = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiFetch(`/api/feature-flags/${key}/status/${enabled ? "enabled" : "disabled"}`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success(t("system.featureFlags.statusUpdated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createFlag = useMutation({
    mutationFn: (body: typeof form) =>
      apiFetch("/api/feature-flags", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      setCreateOpen(false);
      setForm({ key: "", name: "", description: "", status: "disabled", rolloutPercentage: 0 });
      toast.success(t("system.featureFlags.created"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFlag = useMutation({
    mutationFn: (key: string) => apiFetch(`/api/feature-flags/${key}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success(t("system.featureFlags.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title={t("system.featureFlags.title")} subtitle={t("system.featureFlags.subtitle")}>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> {t("system.featureFlags.add")}
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : flags.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Flag className="h-10 w-10 text-muted-foreground mb-3" />
            <CardTitle className="text-base mb-1">{t("system.featureFlags.noFlags")}</CardTitle>
            <CardDescription>{t("system.featureFlags.createHint")}</CardDescription>
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-1.5" /> {t("system.featureFlags.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <Card key={flag.id} className="transition-all hover:border-border/80">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{flag.name}</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                      {flag.key}
                    </code>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[flag.status]}`}>
                      {flag.status}
                      {flag.status === "rollout" && flag.rolloutPercentage != null && ` · ${flag.rolloutPercentage}%`}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={flag.status === "enabled"}
                    onCheckedChange={(checked) => toggleStatus.mutate({ key: flag.key, enabled: checked })}
                    disabled={toggleStatus.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(t("system.featureFlags.deleteConfirm", { key: flag.key }))) deleteFlag.mutate(flag.key);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("system.featureFlags.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("system.featureFlags.key")}</Label>
              <Input placeholder="new_checkout_flow" value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("system.featureFlags.name")}</Label>
              <Input placeholder="New Checkout Flow" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("system.featureFlags.description")}</Label>
              <Textarea placeholder={t("system.featureFlags.descriptionPlaceholder")} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("system.featureFlags.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof form.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">{t("system.featureFlags.disabled")}</SelectItem>
                    <SelectItem value="enabled">{t("system.featureFlags.enabled")}</SelectItem>
                    <SelectItem value="rollout">{t("system.featureFlags.rollout")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "rollout" && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Percent className="h-3 w-3" /> {t("system.featureFlags.rolloutPercent")}</Label>
                  <Input type="number" min={0} max={100} value={form.rolloutPercentage}
                    onChange={(e) => setForm((f) => ({ ...f, rolloutPercentage: Number(e.target.value) }))} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createFlag.mutate(form)} disabled={!form.key || !form.name || createFlag.isPending}>
              {t("system.featureFlags.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
