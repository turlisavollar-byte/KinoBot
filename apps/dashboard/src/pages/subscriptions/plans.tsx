import { useState } from "react";
import {
  useListSubscriptionPlans,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  getListSubscriptionPlansQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

export default function PlansList() {
  const { t } = useI18n();
  const { data: plans, isLoading } = useListSubscriptionPlans();
  const planList = Array.isArray(plans)
    ? plans
    : ((plans as { data?: typeof plans } | undefined)?.data ?? []);
  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [name, setName] = useState("");
  const [tier, setTier] = useState("");
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState("UZS");
  const [durationDays, setDurationDays] = useState(30);
  const [maxDevices, setMaxDevices] = useState(1);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openAdd = () => {
    setEditingPlan(null);
    setName("");
    setTier("");
    setPrice(0);
    setCurrency("UZS");
    setDurationDays(30);
    setMaxDevices(1);
    setDescription("");
    setIsActive(true);
    setIsOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setName(plan.name);
    setTier(plan.tier);
    setPrice(plan.price);
    setCurrency(plan.currency);
    setDurationDays(plan.durationDays);
    setMaxDevices(plan.maxDevices || 1);
    setDescription(plan.description || "");
    setIsActive(plan.isActive);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name || !tier) return;

    const payload = {
      name,
      tier,
      price,
      currency,
      durationDays,
      maxDevices,
      description,
    };

    if (editingPlan) {
      updatePlan.mutate(
        { id: editingPlan.id, data: { ...payload, isActive } as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListSubscriptionPlansQueryKey(),
            });
            setIsOpen(false);
          },
        },
      );
    } else {
      createPlan.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListSubscriptionPlansQueryKey(),
            });
            setIsOpen(false);
          },
        },
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("nav.plans")}
          </h1>
          <p className="text-muted-foreground">{t("plans.list")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t("plans.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : planList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
          {t("plans.noPlans")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map((plan: any) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-1 font-mono uppercase text-primary">
                      {plan.tier || ""}
                    </CardDescription>
                  </div>
                  {!plan.isActive && (
                    <Badge variant="secondary">{t("plans.inactive")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold">
                  {plan.price ? plan.price.toLocaleString() : "0"}{" "}
                  <span className="text-lg font-normal text-muted-foreground">
                    {plan.currency || ""}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground h-10">
                  {plan.description || ""}
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.durationDays || 0} {t("plans.days")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("plans.devices", { count: plan.maxDevices || 1 })}
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openEdit(plan)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t("common.edit")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t("plans.edit") : t("plans.add")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("plans.name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("plans.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("plans.tier")}</Label>
                <Input
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  placeholder={t("plans.tierPlaceholder")}
                  disabled={!!editingPlan}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("plans.price")}</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("plans.currency")}</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("plans.duration")}</Label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("plans.maxDevices")}</Label>
                <Input
                  type="number"
                  value={maxDevices}
                  onChange={(e) => setMaxDevices(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("plans.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            {editingPlan && (
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-0.5">
                  <Label>{t("plans.activeStatus")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("plans.activeStatusHint")}
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {editingPlan ? t("common.save") : t("plans.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
