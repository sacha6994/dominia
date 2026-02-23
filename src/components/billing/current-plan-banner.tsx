"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import type { Subscription } from "@/types";

interface Props {
  subscription: Subscription | null;
  domainCount: number;
}

export default function CurrentPlanBanner({
  subscription,
  domainCount,
}: Props) {
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setPortalLoading(false);
    }
  };

  const isFreePlan =
    !subscription ||
    subscription.status === "canceled" ||
    subscription.plan_id === "free";

  // Free plan (no Stripe subscription or canceled)
  if (isFreePlan) {
    const freePlan = PLANS.free;
    const limit = freePlan.domainLimit;
    const percentage = Math.min((domainCount / limit) * 100, 100);

    return (
      <div className="mt-6 rounded-xl bg-brand-card p-6 ring-1 ring-inset ring-white/[0.06]">
        <div>
          <p className="text-sm font-medium text-slate-400">Plan actuel</p>
          <p className="mt-1 text-lg font-semibold text-white">
            Free — 0€/mois
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Passez a un plan superieur pour surveiller plus de domaines.
          </p>
        </div>

        {/* Usage bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Domaines utilises</span>
            <span className="font-medium text-white">
              {domainCount} / {limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 100
                  ? "bg-red-500"
                  : percentage >= 80
                    ? "bg-amber-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const plan = PLANS[subscription.plan_id as PlanId];
  const limit = plan?.domainLimit ?? 0;
  const isUnlimited = limit === Infinity;
  const percentage = isUnlimited
    ? 0
    : limit > 0
      ? Math.min((domainCount / limit) * 100, 100)
      : 0;

  const renewDate = new Date(
    subscription.current_period_end
  ).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-6 rounded-xl bg-brand-card p-6 ring-1 ring-inset ring-white/[0.06]">
      {/* Past due warning */}
      {subscription.status === "past_due" && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 ring-1 ring-inset ring-red-500/20">
          Votre paiement a echoue. Mettez a jour votre moyen de paiement pour
          eviter une interruption de service.
        </div>
      )}

      {/* Cancellation notice */}
      {subscription.cancel_at_period_end && (
        <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400 ring-1 ring-inset ring-amber-500/20">
          Votre abonnement sera annule le {renewDate}. Vous conservez
          l&apos;acces jusqu&apos;a cette date.
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">Plan actuel</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {plan?.name ?? subscription.plan_id} — {plan?.price ?? "?"}€/mois
          </p>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-inset ring-slate-600 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {portalLoading ? "..." : "Gerer la facturation"}
        </button>
      </div>

      {/* Usage bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Domaines utilises</span>
          <span className="font-medium text-white">
            {domainCount} / {isUnlimited ? "∞" : limit}
          </span>
        </div>
        {!isUnlimited && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 100
                  ? "bg-red-500"
                  : percentage >= 80
                    ? "bg-amber-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      {!subscription.cancel_at_period_end && (
        <p className="mt-3 text-xs text-slate-500">
          Prochain renouvellement le {renewDate}
        </p>
      )}
    </div>
  );
}
