ALTER TABLE "billing_invoices" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_payments_provider_payment_id_unique" ON "billing_payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_idempotency_key_unique" UNIQUE("idempotency_key");