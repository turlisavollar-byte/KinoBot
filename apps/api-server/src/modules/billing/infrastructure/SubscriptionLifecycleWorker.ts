import { and, eq, inArray, lte, gt } from "drizzle-orm";
import { billingSubscriptionsTable, db } from "@workspace/db";
import { Logger } from "@/shared/utils/logger";

export class SubscriptionLifecycleWorker {
  private readonly logger = Logger.getInstance("SubscriptionLifecycleWorker");

  async processExpiredAndCompletedTrials(now = new Date()): Promise<{
    activatedTrials: number;
    expiredSubscriptions: number;
  }> {
    const activatedTrials = await db
      .update(billingSubscriptionsTable)
      .set({ status: "active", updatedAt: now })
      .where(
        and(
          eq(billingSubscriptionsTable.status, "trialing"),
          lte(billingSubscriptionsTable.trialEnd, now),
          gt(billingSubscriptionsTable.currentPeriodEnd, now),
        ),
      )
      .returning({ id: billingSubscriptionsTable.id });

    const expiredSubscriptions = await db
      .update(billingSubscriptionsTable)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          inArray(billingSubscriptionsTable.status, ["active", "trialing"]),
          lte(billingSubscriptionsTable.currentPeriodEnd, now),
        ),
      )
      .returning({ id: billingSubscriptionsTable.id });

    if (activatedTrials.length || expiredSubscriptions.length) {
      this.logger.info("Subscription lifecycle transitions processed", {
        activatedTrials: activatedTrials.length,
        expiredSubscriptions: expiredSubscriptions.length,
      });
    }

    return {
      activatedTrials: activatedTrials.length,
      expiredSubscriptions: expiredSubscriptions.length,
    };
  }
}
