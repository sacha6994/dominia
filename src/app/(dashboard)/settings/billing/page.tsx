import { createClient } from "@/lib/supabase/server";
import { PLAN_LIST } from "@/lib/stripe/plans";
import CurrentPlanBanner from "@/components/billing/current-plan-banner";
import PlanCard from "@/components/billing/plan-card";
import type { Subscription } from "@/types";

export default async function BillingPage() {
  const supabase = createClient();

  const [{ data: subscription }, { count: domainCount }] = await Promise.all([
    supabase.from("subscriptions").select("*").maybeSingle(),
    supabase
      .from("domains")
      .select("id", { count: "exact", head: true }),
  ]);

  const hasActiveSubscription =
    !!subscription &&
    subscription.status !== "canceled" &&
    (subscription.status === "active" || subscription.status === "trialing");

  const currentPlanId = hasActiveSubscription
    ? subscription.plan_id
    : "free";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Abonnement</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gerez votre plan et votre facturation
      </p>

      <CurrentPlanBanner
        subscription={subscription as Subscription | null}
        domainCount={domainCount ?? 0}
      />

      <h2 className="mt-8 text-lg font-semibold text-white">
        Choisir un plan
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        {PLAN_LIST.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlanId === plan.id}
            hasSubscription={hasActiveSubscription}
          />
        ))}
      </div>
    </div>
  );
}
