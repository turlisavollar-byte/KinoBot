import { useState } from "react";
import {
  useListSubscriptions,
  useCancelSubscription,
  getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export default function SubscriptionsList() {
  const { t, formatDate } = useI18n();
  const [status, setStatus] = useState<string>("all");
  const { data: subs, isLoading } = useListSubscriptions({
    status: status === "all" ? undefined : status,
  } as any);
  const cancelSub = useCancelSubscription();
  const queryClient = useQueryClient();

  const handleCancel = (id: string) => {
    if (confirm(t("subscriptions.cancelConfirm"))) {
      cancelSub.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListSubscriptionsQueryKey(),
            });
            toast.success(t("subscriptions.cancelledToast"));
          },
          onError: () => toast.error(t("subscriptions.cancelError")),
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("nav.subscriptions")}
          </h1>
          <p className="text-muted-foreground">{t("subscriptions.list")}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder={t("subscriptions.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("subscriptions.allStatuses")}
            </SelectItem>
            <SelectItem value="active">{t("subscriptions.active")}</SelectItem>
            <SelectItem value="expired">
              {t("subscriptions.expired")}
            </SelectItem>
            <SelectItem value="cancelled">
              {t("subscriptions.cancelled")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subscriptions.userId")}</TableHead>
              <TableHead>{t("subscriptions.plan")}</TableHead>
              <TableHead>{t("subscriptions.status")}</TableHead>
              <TableHead>{t("subscriptions.period")}</TableHead>
              <TableHead className="text-right">{t("common.edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : subs?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("subscriptions.noSubscriptions")}
                </TableCell>
              </TableRow>
            ) : (
              subs?.data?.map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-sm">
                    {sub.userId ? sub.userId.slice(0, 8) : "—"}...
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {sub.planName || t("subscriptions.customPlan")}
                  </TableCell>
                  <TableCell>
                    {sub.status === "active" && (
                      <Badge className="bg-green-600">
                        {t("subscriptions.active")}
                      </Badge>
                    )}
                    {sub.status === "expired" && (
                      <Badge variant="secondary">
                        {t("subscriptions.expired")}
                      </Badge>
                    )}
                    {sub.status === "cancelled" && (
                      <Badge variant="destructive">
                        {t("subscriptions.cancelled")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {sub.startDate
                      ? formatDate(sub.startDate, { dateStyle: "medium" })
                      : "—"}{" "}
                    &rarr; <br />
                    {sub.endDate
                      ? formatDate(sub.endDate, { dateStyle: "medium" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {sub.status === "active" && sub.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleCancel(sub.id)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {t("subscriptions.cancel")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
