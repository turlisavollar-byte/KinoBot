CREATE INDEX "billing_payments_user_idx" ON "billing_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_payments_invoice_idx" ON "billing_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_user_status_period_end_idx" ON "billing_subscriptions" USING btree ("user_id","status","current_period_end");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_end_date_idx" ON "subscriptions" USING btree ("user_id","status","end_date");