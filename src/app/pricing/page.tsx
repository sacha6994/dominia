import Image from "next/image";
import Link from "next/link";

// Placeholders Stripe — a remplir avec les vrais liens Checkout
const STRIPE_PRO_URL = "";
const STRIPE_AGENCY_URL = "";

// ── Types ────────────────────────────────────────────────────

type Feature = { text: string; included: boolean };

type Plan = {
  name: string;
  price: number;
  description: string;
  features: Feature[];
  cta: string;
  href: string;
  popular?: boolean;
};

// ── Data ─────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    name: "Free",
    price: 0,
    description: "Pour les projets personnels et les tests.",
    cta: "Commencer gratuitement",
    href: "/register",
    features: [
      { text: "Surveiller 3 domaines", included: true },
      { text: "Alertes email", included: true },
      { text: "Dashboard basique", included: true },
      { text: "Support communaute", included: true },
      { text: "Alertes Slack / Discord", included: false },
      { text: "Rapports PDF", included: false },
      { text: "Membres d'equipe", included: false },
    ],
  },
  {
    name: "Pro",
    price: 15,
    description: "Pour les freelances et petites equipes.",
    cta: "Passer a Pro",
    href: STRIPE_PRO_URL || "/register",
    popular: true,
    features: [
      { text: "Surveiller 20 domaines", included: true },
      { text: "Alertes email + Slack / Discord", included: true },
      { text: "Rapports PDF automatiques", included: true },
      { text: "3 membres d'equipe", included: true },
      { text: "Page de statut publique", included: true },
      { text: "Support email", included: true },
      { text: "Acces API", included: false },
    ],
  },
  {
    name: "Agence",
    price: 39,
    description: "Pour les agences et grandes equipes.",
    cta: "Passer a Agence",
    href: STRIPE_AGENCY_URL || "/register",
    features: [
      { text: "Domaines illimites", included: true },
      { text: "Toutes les notifications", included: true },
      { text: "Rapports PDF + exports CSV", included: true },
      { text: "Membres illimites", included: true },
      { text: "Page de statut personnalisee", included: true },
      { text: "Support prioritaire", included: true },
      { text: "Acces API", included: true },
    ],
  },
];

// ── Icons ────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brand-base">
      {/* ─── Nav ─────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center">
          <Image
            src="/dominia-logo-v2.png"
            alt="Dominia"
            width={160}
            height={45}
            priority
            className="w-auto"
            style={{ minWidth: "160px" }}
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-indigo-400 hover:to-violet-400"
          >
            Essayer gratuitement
          </Link>
        </div>
      </nav>

      {/* ─── Header ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-4 pt-16 sm:pt-20">
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[400px] w-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-indigo-400">Tarifs</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Choisissez votre plan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Commencez gratuitement, evoluez quand vous en avez besoin. Tous les
            plans incluent le monitoring quotidien et les alertes avant
            expiration.
          </p>
        </div>
      </section>

      {/* ─── Plans grid ──────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 transition-all ${
                plan.popular
                  ? "bg-brand-card ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10 lg:scale-105"
                  : "bg-brand-card ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1 text-xs font-semibold text-white">
                  Populaire
                </div>
              )}

              {/* Plan name + price */}
              <div>
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {plan.price}€
                  </span>
                  <span className="text-sm text-slate-400">/mois</span>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-0.5 ${f.included ? "text-indigo-400" : "text-slate-600"}`}>
                      {f.included ? <CheckIcon /> : <CrossIcon />}
                    </span>
                    <span className={f.included ? "text-slate-300" : "text-slate-600"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400"
                    : "text-white ring-1 ring-inset ring-slate-600 hover:bg-white/[0.04]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ teaser ──────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <p className="text-sm text-slate-500">
          Tous les prix sont hors taxes. Vous pouvez changer de plan ou annuler
          a tout moment depuis votre dashboard.
        </p>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center">
            <Image
              src="/dominia-logo-v2.png"
              alt="Dominia"
              width={160}
              height={45}
              className="w-auto"
              style={{ minWidth: "160px" }}
            />
          </Link>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Dominia. Tous droits reserves.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/login" className="transition-colors hover:text-slate-300">
              Connexion
            </Link>
            <Link href="/register" className="transition-colors hover:text-slate-300">
              Inscription
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
