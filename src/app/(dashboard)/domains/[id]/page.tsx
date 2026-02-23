"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  Domain,
  AlertSent,
  DomainCheckHistory,
  SslStatus,
  DomainStatus,
} from "@/types";

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
  const config: Record<string, { label: string; cls: string }> = {
    valid: {
      label: "Valide",
      cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    },
    active: {
      label: "Actif",
      cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    },
    expiring_soon: {
      label: "Expire bientôt",
      cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    },
    expired: {
      label: "Expiré",
      cls: "bg-red-500/10 text-red-400 ring-red-500/20",
    },
    error: {
      label: "Erreur",
      cls: "bg-red-500/10 text-red-400 ring-red-500/20",
    },
    unknown: {
      label: "Inconnu",
      cls: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
    },
  };

  const c = config[status] ?? config.unknown;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

function GlobalBadge({ domain }: { domain: Domain }) {
  const sslDays = domain.ssl_expiry_date
    ? daysUntil(domain.ssl_expiry_date)
    : Infinity;
  const domDays = domain.domain_expiry_date
    ? daysUntil(domain.domain_expiry_date)
    : Infinity;
  const minDays = Math.min(sslDays, domDays);

  if (minDays <= 7) {
    return (
      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset bg-red-500/10 text-red-400 ring-red-500/20">
        Critique
      </span>
    );
  }
  if (minDays <= 30) {
    return (
      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset bg-amber-500/10 text-amber-400 ring-amber-500/20">
        Alerte
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">
      Actif
    </span>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Alert type label ────────────────────────────────────────

function alertLabel(type: string): string {
  switch (type) {
    case "ssl_expiry":
      return "Expiration SSL";
    case "domain_expiry":
      return "Expiration Domaine";
    case "ssl_error":
      return "Erreur SSL";
    case "domain_error":
      return "Erreur Domaine";
    default:
      return type;
  }
}

// ── Page ────────────────────────────────────────────────────

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [alerts, setAlerts] = useState<AlertSent[]>([]);
  const [history, setHistory] = useState<DomainCheckHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [domainRes, alertsRes, historyRes] = await Promise.all([
      supabase.from("domains").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("alerts_sent")
        .select("*")
        .eq("domain_id", id)
        .order("sent_at", { ascending: false }),
      supabase
        .from("domain_checks_history")
        .select("*")
        .eq("domain_id", id)
        .order("checked_at", { ascending: false })
        .limit(10),
    ]);

    if (!domainRes.data) {
      router.push("/domains");
      return;
    }

    setDomain(domainRes.data as Domain);
    setAlerts((alertsRes.data as AlertSent[]) ?? []);
    setHistory((historyRes.data as DomainCheckHistory[]) ?? []);
    setLoading(false);
  }, [supabase, id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const res = await fetch("/api/recheck-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: id }),
      });

      if (res.ok) {
        await fetchData();
      }
    } finally {
      setRechecking(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/domains/${id}/public-token`, {
        method: "POST",
      });
      if (res.ok) {
        const { token } = await res.json();
        setDomain((prev) => (prev ? { ...prev, public_token: token } : prev));
      }
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const res = await fetch(`/api/domains/${id}/public-token`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDomain((prev) =>
          prev ? { ...prev, public_token: null } : prev
        );
      }
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyLink = () => {
    if (!domain?.public_token) return;
    const url = `${window.location.origin}/status/${domain.public_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="h-8 w-8 text-blue-400" />
      </div>
    );
  }

  if (!domain) return null;

  const sslDays = domain.ssl_expiry_date
    ? daysUntil(domain.ssl_expiry_date)
    : null;
  const domDays = domain.domain_expiry_date
    ? daysUntil(domain.domain_expiry_date)
    : null;

  return (
    <div>
      {/* Back */}
      <Link
        href="/domains"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Retour aux domaines
      </Link>

      {/* ── 1. Header ───────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">
            {domain.domain_name}
          </h1>
          <GlobalBadge domain={domain} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Dernier check : {domain.last_checked ? formatDateTime(domain.last_checked) : "—"}
          </span>
          <button
            onClick={handleRecheck}
            disabled={rechecking}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {rechecking ? (
              <>
                <Spinner className="h-4 w-4" />
                Vérification...
              </>
            ) : (
              "Re-checker maintenant"
            )}
          </button>
        </div>
      </div>

      {/* ── Share / Revoke public status page ─────────────── */}
      <div className="mt-6 rounded-xl bg-[#0f1729] p-5 ring-1 ring-inset ring-slate-700/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Page de statut publique
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {domain.public_token
                ? "Lien actif — partageable avec vos clients sans connexion."
                : "Generez un lien public pour partager le statut de ce domaine."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {domain.public_token ? (
              <>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Copié !
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                      Copier le lien
                    </>
                  )}
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {revoking ? "Révocation..." : "Révoquer"}
                </button>
              </>
            ) : (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {sharing ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    Génération...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    Partager la page de statut
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {domain.public_token && (
          <div className="mt-3 rounded-lg bg-[#0b1120] px-3 py-2">
            <code className="break-all text-xs text-slate-400">
              {typeof window !== "undefined"
                ? `${window.location.origin}/status/${domain.public_token}`
                : `/status/${domain.public_token}`}
            </code>
          </div>
        )}
      </div>

      {/* ── 2. SSL + Domain cards ───────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* SSL Card */}
        <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Certificat SSL</h2>
            <StatusBadge status={domain.ssl_status} />
          </div>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Date d&apos;expiration
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {formatDate(domain.ssl_expiry_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Jours restants
              </dt>
              <dd className="mt-1">
                {sslDays !== null ? (
                  <span
                    className={`text-2xl font-bold ${
                      sslDays <= 7
                        ? "text-red-400"
                        : sslDays <= 30
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {sslDays}
                    <span className="ml-1 text-sm font-normal text-slate-400">jours</span>
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Autorité de certification
              </dt>
              <dd className="mt-1 text-sm text-slate-300">
                {domain.ssl_issuer || "Non disponible"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Domain Card */}
        <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Nom de domaine</h2>
            <StatusBadge status={domain.domain_status} />
          </div>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Date d&apos;expiration WHOIS
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {formatDate(domain.domain_expiry_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Jours restants
              </dt>
              <dd className="mt-1">
                {domDays !== null ? (
                  <span
                    className={`text-2xl font-bold ${
                      domDays <= 7
                        ? "text-red-400"
                        : domDays <= 30
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {domDays}
                    <span className="ml-1 text-sm font-normal text-slate-400">jours</span>
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Registrar
              </dt>
              <dd className="mt-1 text-sm text-slate-300">
                {domain.domain_registrar || "Non disponible"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── 3. Historique des alertes ────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Historique des alertes</h2>
        <div className="mt-4 overflow-hidden rounded-xl bg-[#0f1729] ring-1 ring-inset ring-slate-700/50">
          {alerts.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              Aucune alerte envoyée pour ce domaine.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Seuil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3 text-slate-300">
                      {formatDateTime(a.sent_at)}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {alertLabel(a.alert_type)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          a.threshold_days <= 1
                            ? "bg-red-500/10 text-red-400 ring-red-500/20"
                            : a.threshold_days <= 7
                              ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                        }`}
                      >
                        ≤ {a.threshold_days}j
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 4. Timeline des checks ──────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">
          Timeline des checks
          <span className="ml-2 text-sm font-normal text-slate-500">
            (10 derniers)
          </span>
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl bg-[#0f1729] ring-1 ring-inset ring-slate-700/50">
          {history.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              Aucun historique. Cliquez sur &quot;Re-checker maintenant&quot; pour lancer un premier check.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">SSL</th>
                  <th className="px-6 py-3 font-medium">Domaine</th>
                  <th className="px-6 py-3 font-medium">Expiration SSL</th>
                  <th className="px-6 py-3 font-medium">Expiration domaine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3 text-slate-400">
                      {formatDateTime(h.checked_at)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={h.ssl_status} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={h.domain_status} />
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {formatDate(h.ssl_expiry_date)}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {formatDate(h.domain_expiry_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
