export type PlanId = "free" | "pro" | "agency";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  currency: "eur";
  interval: "month";
  domainLimit: number; // Infinity for agency
  stripePriceId: string;
  features: string[];
}

// Placeholders Stripe — a remplir avec les vrais Price IDs
const STRIPE_PRO_URL = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "";
const STRIPE_AGENCY_URL = process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "";

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "eur",
    interval: "month",
    domainLimit: 3,
    stripePriceId: "",
    features: [
      "Surveiller 3 domaines",
      "Alertes email",
      "Dashboard basique",
      "Support communauté",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 15,
    currency: "eur",
    interval: "month",
    domainLimit: 20,
    stripePriceId: STRIPE_PRO_URL,
    features: [
      "Surveiller 20 domaines",
      "Alertes email + Slack / Discord",
      "Rapports PDF automatiques",
      "3 membres d'équipe",
      "Page de statut publique",
      "Support email",
    ],
  },
  agency: {
    id: "agency",
    name: "Agence",
    price: 39,
    currency: "eur",
    interval: "month",
    domainLimit: Infinity,
    stripePriceId: STRIPE_AGENCY_URL,
    features: [
      "Domaines illimités",
      "Toutes les notifications",
      "Rapports PDF + exports CSV",
      "Membres illimités",
      "Page de statut personnalisée",
      "Support prioritaire",
      "Accès API",
    ],
  },
};

export const PLAN_LIST: PlanConfig[] = [PLANS.free, PLANS.pro, PLANS.agency];

/** Resolve a Stripe price ID back to a plan ID */
export function planIdFromPriceId(priceId: string): PlanId | null {
  for (const plan of PLAN_LIST) {
    if (plan.stripePriceId && plan.stripePriceId === priceId) return plan.id;
  }
  return null;
}

/** Get domain limit for a plan. Defaults to Free (3) for unknown/null */
export function getDomainLimit(planId: PlanId | null): number {
  if (!planId) return PLANS.free.domainLimit;
  return PLANS[planId]?.domainLimit ?? PLANS.free.domainLimit;
}
