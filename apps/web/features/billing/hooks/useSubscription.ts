"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import {
  subscriptions as subsApi,
  type Subscription,
  type PlanId,
  type BillingCycle,
} from "@streamx/api-client";

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription = null, isLoading } = useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: () => subsApi.get(),
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) =>
      subsApi.upsert(planId, billingCycle),
    onSuccess: (sub) => {
      queryClient.setQueryData(["subscription"], sub);
      toast.success("Subscription updated");
    },
    onError: () => toast.error("Failed to update subscription"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => subsApi.cancel(),
    onSuccess: () => {
      queryClient.setQueryData(["subscription"], null);
      toast.success("Subscription cancelled");
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });

  const subscribe = (planId: PlanId, billingCycle: BillingCycle) => {
    if (!user) {
      toast.error("Sign in to subscribe");
      return Promise.resolve({ error: "Not signed in" });
    }
    return subscribeMutation
      .mutateAsync({ planId, billingCycle })
      .then(() => ({ error: null }))
      .catch(() => ({ error: "Failed" }));
  };

  const cancel = () => cancelMutation.mutateAsync().catch(() => {});

  return {
    subscription,
    loading: authLoading || isLoading,
    subscribe,
    cancel,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  };
}
