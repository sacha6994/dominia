"use client";

import { useState } from "react";
import type { PlanConfig } from "@/lib/stripe/plans";

interface Props {
  plan: PlanConfig;
  isCurrentPlan: boolean;
  hasSubscription: boolean;
}

export default function PlanCard({
  plan,
  isCurrentPlan,
  hasSubscription,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    // Free plan has no Stripe checkout
    if (plan.id === "free") return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Impossible de contacter le serveur");
      setLoading(false);
    }
  };

  const isPopular = plan.id === "pro";
  const isFree = plan.id === "free";

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-brand-card p-6 ring-1 ring-inset ${
        isCurrentPlan
          ? "ring-indigo-500"
          : isPopular
            ? "ring-indigo-500/50"
            : "ring-white/[0.06]"
      }`}
    >
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-xs font-medium text-white">
          Populaire
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white">
          Plan actuel
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">
            {plan.price === 0 ? "0" : plan.price}€
          </span>
          <span className="text-sm text-slate-400">/mois</span>
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {isCurrentPlan ? (
        <button
          disabled
          className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400"
        >
          Plan actuel
        </button>
      ) : isFree ? (
        <button
          disabled
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 ring-1 ring-inset ring-slate-700"
        >
          Commencer gratuitement
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            isPopular
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400"
              : "text-white ring-1 ring-inset ring-slate-600 hover:bg-white/[0.04]"
          }`}
        >
          {loading
            ? "Redirection..."
            : hasSubscription
              ? "Changer de plan"
              : "Commencer"}
        </button>
      )}
    </div>
  );
}
