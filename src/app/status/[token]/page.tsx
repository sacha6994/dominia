import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Domain, SslStatus, DomainStatus } from "@/types";

// ── Helpers ─────────────────────────────────────────────────

function daysUntil(date: string): number {
  return Math.floor(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Badges ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: SslStatus | DomainStatus }) {
  const config: Record<string, { label: string; bg: string; text: string; ring: string }> = {
    valid: { label: "Valide", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
    active: { label: "Actif", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
    expiring_soon: { label: "Expire bientôt", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20" },
    expired: { label: "Expiré", bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/20" },
    error: { label: "Erreur", bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/20" },
    unknown: { label: "Inconnu", bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-500/20" },
  };

  const c = config[status] ?? config.unknown;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}
    >
      {c.label}
    </span>
  );
}

function DaysIndicator({ date }: { date: string | null }) {
  if (!date) return <span className="text-gray-400">—</span>;

  const days = daysUntil(date);

  if (days < 0) {
    return (
      <span className="text-2xl font-bold text-red-600">
        Expiré
      </span>
    );
  }

  return (
    <span
      className={`text-2xl font-bold ${
        days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-emerald-600"
      }`}
    >
      {days}
      <span className="ml-1 text-sm font-normal text-gray-500">jours</span>
    </span>
  );
}

// ── Global status banner ────────────────────────────────────

function StatusBanner({ domain }: { domain: Domain }) {
  const sslDays = domain.ssl_expiry_date ? daysUntil(domain.ssl_expiry_date) : Infinity;
  const domDays = domain.domain_expiry_date ? daysUntil(domain.domain_expiry_date) : Infinity;
  const minDays = Math.min(sslDays, domDays);

  if (minDays < 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#9888;&#65039;</span>
          <div>
            <p className="font-semibold text-red-800">
              Attention : expiration detectee
            </p>
            <p className="mt-0.5 text-sm text-red-600">
              Un certificat ou nom de domaine a expire. Contactez l&apos;administrateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (minDays <= 7) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#9888;&#65039;</span>
          <div>
            <p className="font-semibold text-red-800">
              Expiration critique dans {minDays} jour{minDays > 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-sm text-red-600">
              Un renouvellement est necessaire sous peu.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (minDays <= 30) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#9888;&#65039;</span>
          <div>
            <p className="font-semibold text-amber-800">
              Expiration dans {minDays} jours
            </p>
            <p className="mt-0.5 text-sm text-amber-600">
              Un renouvellement est a prevoir prochainement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#9989;</span>
        <div>
          <p className="font-semibold text-emerald-800">
            Tout est operationnel
          </p>
          <p className="mt-0.5 text-sm text-emerald-600">
            Le certificat SSL et le nom de domaine sont valides.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function PublicStatusPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createAdminClient();

  // Lookup domain by public_token (bypasses RLS via admin client)
  const { data: domain } = await supabase
    .from("domains")
    .select("*")
    .eq("public_token", params.token)
    .maybeSingle();

  if (!domain) {
    notFound();
  }

  const d = domain as Domain;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span className="text-lg font-bold text-gray-900">Dominia</span>
          </div>
          <span className="text-xs text-gray-400">Page de statut publique</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Domain name */}
        <h1 className="text-3xl font-bold text-gray-900">{d.domain_name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dernier check : {d.last_checked ? formatDateTime(d.last_checked) : "Aucun"}
        </p>

        {/* Status banner */}
        <div className="mt-6">
          <StatusBanner domain={d} />
        </div>

        {/* Cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* SSL Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Certificat SSL
              </h2>
              <StatusBadge status={d.ssl_status} />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Expiration
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {formatDate(d.ssl_expiry_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Jours restants
                </p>
                <div className="mt-1">
                  <DaysIndicator date={d.ssl_expiry_date} />
                </div>
              </div>
              {d.ssl_issuer && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Autorite de certification
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{d.ssl_issuer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Domain Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Nom de domaine
              </h2>
              <StatusBadge status={d.domain_status} />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Expiration WHOIS
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {formatDate(d.domain_expiry_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Jours restants
                </p>
                <div className="mt-1">
                  <DaysIndicator date={d.domain_expiry_date} />
                </div>
              </div>
              {d.domain_registrar && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Registrar
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {d.domain_registrar}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Surveille par{" "}
            <span className="font-medium text-gray-500">Dominia</span>
            {" — "}Monitoring SSL &amp; Domaines
          </p>
        </div>
      </main>
    </div>
  );
}
