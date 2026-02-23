import Image from "next/image";
import Link from "next/link";
import { PLAN_LIST } from "@/lib/stripe/plans";

// ── Icons (inline SVG for zero dependencies) ────────────────

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ── Feature card ────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50 transition-all hover:ring-blue-500/30">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 transition-colors group-hover:bg-blue-600/20">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ── Pricing card ────────────────────────────────────────────

function PricingCard({
  name,
  price,
  features,
  popular,
}: {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-[#0f1729] p-8 ring-1 ring-inset transition-all ${
        popular
          ? "ring-blue-500 shadow-lg shadow-blue-500/10"
          : "ring-slate-700/50 hover:ring-slate-600"
      }`}
    >
      {popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
          Le plus populaire
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-white">
            {price}€
          </span>
          <span className="text-sm text-slate-400">/mois</span>
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 text-blue-400">
              <CheckIcon />
            </span>
            <span className="text-slate-300">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
          popular
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "text-white ring-1 ring-inset ring-slate-600 hover:bg-slate-800"
        }`}
      >
        Commencer
      </Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* ─── Nav ─────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center">
          <Image
            src="/dominia-logo-v2.png"
            alt="Dominia"
            width={160}
            height={45}
            priority
            className="w-auto"
            style={{ minWidth: "160px" }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Essayer gratuitement
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[500px] w-[800px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1.5 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Monitoring 24/7
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ne laissez plus votre site
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {" "}
              tomber par surprise
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            Surveillez vos certificats SSL et noms de domaine en temps réel.
            Recevez des alertes avant qu&apos;il ne soit trop tard.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30"
            >
              Essayer gratuitement
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl px-8 py-3.5 text-sm font-semibold text-slate-300 ring-1 ring-inset ring-slate-700 transition-colors hover:bg-slate-800"
            >
              Voir les tarifs
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Aucune carte bancaire requise — Configurez en 2 minutes
          </p>
        </div>

        {/* ── Dashboard preview ── */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl bg-[#0f1729] p-4 ring-1 ring-inset ring-slate-700/50 sm:p-6">
            {/* Fake toolbar */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <div className="ml-3 h-5 flex-1 rounded bg-slate-800" />
            </div>
            {/* Fake cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#0b1120] p-4 ring-1 ring-inset ring-blue-500/20">
                <p className="text-xs text-slate-500">Domaines surveillés</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">12</p>
              </div>
              <div className="rounded-xl bg-[#0b1120] p-4 ring-1 ring-inset ring-amber-500/20">
                <p className="text-xs text-slate-500">Expirent bientôt</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">2</p>
              </div>
              <div className="rounded-xl bg-[#0b1120] p-4 ring-1 ring-inset ring-emerald-500/20">
                <p className="text-xs text-slate-500">Certificats valides</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">10</p>
              </div>
            </div>
            {/* Fake table */}
            <div className="mt-4 overflow-hidden rounded-xl bg-[#0b1120] ring-1 ring-inset ring-slate-700/30">
              {["example.com", "mon-saas.fr", "api.startup.io"].map(
                (domain, i) => (
                  <div
                    key={domain}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i < 2 ? "border-b border-slate-700/30" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-white">
                      {domain}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        i === 1
                          ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                      }`}
                    >
                      {i === 1 ? "Expire dans 12j" : "Valide"}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
          {/* Bottom gradient fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1120]" />
        </div>
      </section>

      {/* ─── Social proof ────────────────────────────────── */}
      <section className="border-y border-slate-800/60 px-6 py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-slate-500">
          <span>
            <span className="font-semibold text-white">500+</span> domaines
            surveillés
          </span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span>
            <span className="font-semibold text-white">99.9%</span> uptime
          </span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span>
            <span className="font-semibold text-white">2 min</span> pour
            configurer
          </span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span>
            Alertes en{" "}
            <span className="font-semibold text-white">temps réel</span>
          </span>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-400">Fonctionnalités</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Tout ce qu&apos;il faut pour dormir tranquille
            </h2>
            <p className="mt-4 text-base text-slate-400">
              Dominia surveille vos certificats SSL et domaines 24h/24 et
              vous prévient au bon moment.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<ShieldIcon />}
              title="Monitoring SSL"
              description="Vérification automatique de vos certificats SSL chaque jour. Détection des certificats invalides, expirés ou sur le point d'expirer."
            />
            <FeatureCard
              icon={<ClockIcon />}
              title="Expiration domaine"
              description="Suivi de la date d'expiration de vos noms de domaine via WHOIS. Ne perdez plus jamais un domaine par oubli."
            />
            <FeatureCard
              icon={<ChartIcon />}
              title="Dashboard instantané"
              description="Vue d'ensemble en temps réel de tous vos domaines et certificats. Statuts, dates, alertes — tout en un coup d'œil."
            />
            <FeatureCard
              icon={<BellIcon />}
              title="Alertes email"
              description="Notifications automatiques à 30, 14, 7 et 1 jour avant expiration. Alertes critiques quand c'est urgent."
            />
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────── */}
      <section className="border-y border-slate-800/60 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold text-blue-400">Simple</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              3 étapes, 2 minutes
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Créez votre compte",
                desc: "Inscription gratuite en 30 secondes. Aucune carte bancaire requise.",
              },
              {
                step: "2",
                title: "Ajoutez vos domaines",
                desc: "Entrez vos noms de domaine. Dominia vérifie automatiquement le SSL et le WHOIS.",
              },
              {
                step: "3",
                title: "Dormez tranquille",
                desc: "Recevez des alertes email avant chaque expiration. Plus aucune surprise.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-lg font-bold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-400">Tarifs</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Un plan pour chaque besoin
            </h2>
            <p className="mt-4 text-base text-slate-400">
              Commencez petit, évoluez avec votre activité. Tous les plans
              incluent le monitoring quotidien et les alertes email.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {PLAN_LIST.map((plan) => (
              <PricingCard
                key={plan.id}
                name={plan.name}
                price={plan.price}
                features={plan.features}
                popular={plan.id === "pro"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────── */}
      <section className="px-6 pb-20 pt-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-600/10 px-8 py-16 text-center ring-1 ring-inset ring-blue-500/20 sm:px-16">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Prêt à sécuriser vos domaines ?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-slate-400">
            Rejoignez les entreprises qui font confiance à Dominia pour ne
            plus jamais rater une expiration.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30"
          >
            Commencer maintenant
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center">
            <Image
              src="/dominia-logo-v2.png"
              alt="Dominia"
              width={160}
              height={45}
              className="w-auto"
              style={{ minWidth: "160px" }}
            />
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Dominia. Tous droits réservés.
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
