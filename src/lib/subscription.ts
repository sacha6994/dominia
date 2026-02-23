import { createAdminClient } from "@/lib/supabase/admin";
import { getDomainLimit, type PlanId } from "@/lib/stripe/plans";

export interface UserSubscription {
  plan_id: PlanId;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

function isActiveStatus(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "plan_id, status, current_period_end, cancel_at_period_end, stripe_customer_id"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // No subscription or inactive → Free plan by default
  if (!data || !isActiveStatus(data.status)) {
    return {
      plan_id: "free",
      status: data?.status ?? null,
      current_period_end: null,
      cancel_at_period_end: false,
      stripe_customer_id: data?.stripe_customer_id ?? null,
    };
  }

  return {
    plan_id: (data.plan_id as PlanId) ?? "free",
    status: data.status,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    stripe_customer_id: data.stripe_customer_id,
  };
}

export async function getUserDomainLimit(userId: string): Promise<number> {
  const sub = await getUserSubscription(userId);
  return getDomainLimit(sub.plan_id);
}

export async function canUserAddDomain(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = createAdminClient();

  const [limit, countResult] = await Promise.all([
    getUserDomainLimit(userId),
    supabase
      .from("domains")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const current = countResult.count ?? 0;

  return {
    allowed: limit === Infinity ? true : current < limit,
    current,
    limit: limit === Infinity ? -1 : limit,
  };
}
