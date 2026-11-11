"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Container } from "@/components/common/layout/Container";
import { useSubscription } from "@/features/billing";
import { toast } from "sonner";
import Link from "next/link";
import { routes } from "@/shared/config";
import { formatCurrency } from "@/shared/lib";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending";
  description: string;
}

const mockPaymentMethods: PaymentMethod[] = [
  { id: "1", brand: "Visa", last4: "4242", expiry: "12/26", isDefault: true },
  { id: "2", brand: "Mastercard", last4: "5555", expiry: "08/25", isDefault: false },
];

const mockInvoices: Invoice[] = [
  { id: "INV-001", date: "Jul 1, 2024", amount: 14.99, status: "paid", description: "Standard Plan - Monthly" },
  { id: "INV-002", date: "Jun 1, 2024", amount: 14.99, status: "paid", description: "Standard Plan - Monthly" },
  { id: "INV-003", date: "May 1, 2024", amount: 8.99, status: "paid", description: "Basic Plan - Monthly" },
  { id: "INV-004", date: "Apr 1, 2024", amount: 8.99, status: "paid", description: "Basic Plan - Monthly" },
];

export default function BillingPage() {
  const { subscription, cancel } = useSubscription();
  const [paymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [invoices] = useState<Invoice[]>(mockInvoices);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancel = async () => {
    setIsCanceling(true);
    await cancel();
    setIsCanceling(false);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.info(`Invoice ${invoiceId} download is not available yet`);
  };

  const handleAddPayment = () => {
    toast.info("Adding payment methods is not available yet");
  };

  const handleRemovePayment = (id: string) => {
    toast.info("Removing payment methods is not available yet");
  };

  return (
    <ProtectedRoute>
      <main className="pb-16">
        <Container width="narrow">
          <h1 className="text-3xl font-bold text-foreground mb-8">Billing & Payments</h1>

          <div className="space-y-8">
            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Current Plan</h2>
              {subscription ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-foreground capitalize">{subscription.planId}</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Active subscription</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => toast.info("Plan changes are not available yet")}>
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={handleCancel}
                      disabled={isCanceling}
                    >
                      {isCanceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium text-foreground">No active subscription</p>
                    <p className="text-sm text-muted-foreground">Choose a plan to start watching</p>
                  </div>
                  <Button asChild>
                    <Link href={routes.subscriptions}>View Plans</Link>
                  </Button>
                </div>
              )}
            </section>

            <section className="bg-secondary/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Payment Methods</h2>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleAddPayment}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{method.brand} ending in {method.last4}</p>
                        <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                      </div>
                      {method.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemovePayment(method.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-secondary/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Invoice History</h2>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-foreground text-sm">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          {invoice.status}
                        </Badge>
                        <span className="font-medium text-foreground text-sm">{formatCurrency(invoice.amount)}</span>
                      </div>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => handleDownloadInvoice(invoice.id)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
