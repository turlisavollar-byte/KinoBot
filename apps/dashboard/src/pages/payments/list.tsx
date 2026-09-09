import { useState } from "react";
import {
  useListPayments,
  useCreateClickPayment,
  useCreatePaymePayment,
  useCreateUzumPayment,
  useCreatePaynetPayment,
  useCreateAnorPayment,
  useCreateNBUPayment,
  useCreateUzcardPayment,
  useCreateOctoPayment,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const PAYMENT_PROVIDERS = [
  { value: "click", label: "Click" },
  { value: "payme", label: "Payme" },
  { value: "uzum", label: "Uzum" },
  { value: "paynet", label: "Paynet" },
  { value: "anor", label: "Anor" },
  { value: "nbu", label: "NBU" },
  { value: "uzcard", label: "Uzcard" },
  { value: "octo", label: "Octo" },
] as const;

export default function PaymentsList() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<string>("payme");
  const [invoiceId, setInvoiceId] = useState<string>("");

  const { data: payments, isLoading } = useListPayments({
    status: status === "all" ? undefined : status,
  });

  const createClickPayment = useCreateClickPayment();
  const createPaymePayment = useCreatePaymePayment();
  const createUzumPayment = useCreateUzumPayment();
  const createPaynetPayment = useCreatePaynetPayment();
  const createAnorPayment = useCreateAnorPayment();
  const createNBUPayment = useCreateNBUPayment();
  const createUzcardPayment = useCreateUzcardPayment();
  const createOctoPayment = useCreateOctoPayment();

  const handleCreatePayment = () => {
    const payload = { invoiceId };

    switch (provider) {
      case "click":
        createClickPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "payme":
        createPaymePayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "uzum":
        createUzumPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "paynet":
        createPaynetPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "anor":
        createAnorPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "nbu":
        createNBUPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "uzcard":
        createUzcardPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
      case "octo":
        createOctoPayment.mutate(
          { data: payload },
          { onSuccess: () => setIsOpen(false) },
        );
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("payments.title")}
          </h1>
          <p className="text-muted-foreground">{t("payments.list")}</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Payment
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("payments.date")}</TableHead>
              <TableHead>{t("payments.amount")}</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead className="text-right">
                {t("payments.status")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : payments?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("payments.noPayments")}
                </TableCell>
              </TableRow>
            ) : (
              payments?.data?.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="font-bold">
                    {payment.amount ? payment.amount.toLocaleString() : "-"}{" "}
                    <span className="text-muted-foreground text-xs">
                      {payment.currency || ""}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">
                    {payment.provider || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {payment.userId ? payment.userId.slice(0, 8) : "-"}...
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "success" && (
                      <Badge className="bg-green-600">Success</Badge>
                    )}
                    {payment.status === "pending" && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {payment.status === "failed" && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Create Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Payment Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice ID</Label>
              <Input
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="Enter invoice ID"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayment}>Create Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
