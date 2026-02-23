"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDomainLimit, type PlanId } from "@/lib/stripe/plans";
import type { Domain, SslStatus, DomainStatus } from "@/types";
import AddDomainModal from "@/components/dashboard/add-domain-modal";

function daysUntil(date: string): number {
  return Math.floor(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// ── Status badge ────────────────────────────────────────────

function StatusBadge({ status }: { status: SslStatus | DomainStatus }) {
  const config: Record<string, { label: string; cls: string; dotCls: string }> = {
    valid: {
      label: "Valide",
      cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
      dotCls: "bg-emerald-400 animate-pulse-dot",
    },
    active: {
      label: "Actif",
      cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
      dotCls: "bg-emerald-400 animate-pulse-dot",
    },
    expiring_soon: {
      label: "Expire bientôt",
      cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
      dotCls: "bg-amber-400",
    },
    expired: {
      label: "Expiré",
      cls: "bg-red-500/10 text-red-400 ring-red-500/20",
      dotCls: "bg-red-400",
    },
    error: {
      label: "Erreur",
      cls: "bg-red-500/10 text-red-400 ring-red-500/20",
      dotCls: "bg-red-400",
    },
    unknown: {
      label: "Inconnu",
      cls: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
      dotCls: "bg-slate-400",
    },
  };

  const c = config[status] ?? config.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${c.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dotCls}`} />
      {c.label}
    </span>
  );
}

// ── Expiry badge ────────────────────────────────────────────

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-slate-500/10 text-slate-400 ring-slate-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Inconnu
      </span>
    );
  }

  const days = daysUntil(date);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-red-500/10 text-red-400 ring-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Expiré
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-red-500/10 text-red-400 ring-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Critique
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-amber-500/10 text-amber-400 ring-amber-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Expire bientôt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
      Actif
    </span>
  );
}

// ── Spinner ─────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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

// ── Format date ─────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Summary card ────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: "blue" | "amber" | "red";
  icon: React.ReactNode;
}) {
  const borderColor = {
    blue: "border-indigo-500/30",
    amber: "border-amber-500/30",
    red: "border-red-500/30",
  }[accent];

  const iconBg = {
    blue: "bg-indigo-500/10 text-indigo-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
  }[accent];

  const valueColor = {
    blue: "text-indigo-300",
    amber: "text-amber-300",
    red: "text-red-300",
  }[accent];

  return (
    <div
      className={`rounded-xl border-b-2 bg-brand-card p-5 ring-1 ring-inset ring-white/[0.06] ${borderColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <p className="text-sm font-normal text-slate-400">{label}</p>
      </div>
      <p className={`mt-3 text-4xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState<string | null>(null);
  const [domainLimit, setDomainLimit] = useState<number>(3); // Free plan default

  const supabase = createClient();

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("domains")
      .select("*")
      .order("created_at", { ascending: false });
    setDomains(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchLimit = useCallback(async () => {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .maybeSingle();

    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      const limit = getDomainLimit(sub.plan_id as PlanId);
      setDomainLimit(limit === Infinity ? -1 : limit);
    } else {
      // No active subscription → Free plan (3 domains)
      setDomainLimit(getDomainLimit("free"));
    }
  }, [supabase]);

  useEffect(() => {
    fetchDomains();
    fetchLimit();
  }, [fetchDomains, fetchLimit]);

  // ── Computed stats ──

  const total = domains.length;

  const expiringSoon = domains.filter((d) => {
    const sslDays = d.ssl_expiry_date ? daysUntil(d.ssl_expiry_date) : Infinity;
    const domDays = d.domain_expiry_date
      ? daysUntil(d.domain_expiry_date)
      : Infinity;
    const minDays = Math.min(sslDays, domDays);
    return minDays > 0 && minDays <= 30;
  }).length;

  const critical = domains.filter((d) => {
    const sslDays = d.ssl_expiry_date ? daysUntil(d.ssl_expiry_date) : Infinity;
    const domDays = d.domain_expiry_date
      ? daysUntil(d.domain_expiry_date)
      : Infinity;
    return Math.min(sslDays, domDays) <= 7;
  }).length;

  // ── Delete handler ──

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("domains").delete().eq("id", id);
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  };

  const handleRecheck = async (id: string) => {
    setRechecking(id);
    try {
      const res = await fetch("/api/recheck-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: id }),
      });

      if (!res.ok) return;

      const data = await res.json();

      setDomains((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                ssl_expiry_date: data.ssl_expiry_date,
                domain_expiry_date: data.domain_expiry_date,
                ssl_status: data.ssl_status,
                domain_status: data.domain_status,
                last_checked: data.last_checked,
              }
            : d
        )
      );
    } finally {
      setRechecking(null);
    }
  };

  // ── Render ──

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1.5 text-sm font-normal text-slate-500">
            Vue d&apos;ensemble de vos domaines et certificats
            <span className="mt-1 block text-slate-600 md:ml-2 md:mt-0 md:inline">
              ({total}/{domainLimit === -1 ? "∞" : domainLimit} domaines)
            </span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-150 hover:shadow-indigo-500/30 hover:brightness-110"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter un domaine
        </button>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Domaines surveillés"
          value={total}
          accent="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
        />
        <SummaryCard
          label="Expirent sous 30 jours"
          value={expiringSoon}
          accent="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <SummaryCard
          label="Alertes critiques (< 7j)"
          value={critical}
          accent="red"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          }
        />
      </div>

      {/* Table section */}
      <div className="mt-8">
        {/* Section header */}
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Domaines surveillés</h2>
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
            {total}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl bg-brand-card ring-1 ring-inset ring-white/[0.06]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg
                className="h-6 w-6 animate-spin text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </div>
          ) : domains.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20">
                <svg
                  className="h-8 w-8 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Aucun domaine surveillé</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Commencez par ajouter votre premier domaine pour surveiller son certificat SSL.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-150 hover:shadow-indigo-500/30 hover:brightness-110"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Ajouter un domaine
              </button>
            </div>
          ) : (
            <>
            {/* Mobile card view */}
            <div className="divide-y divide-white/[0.04] md:hidden">
              {domains.map((d) => {
                const sslDays = d.ssl_expiry_date ? daysUntil(d.ssl_expiry_date) : Infinity;
                const domDays = d.domain_expiry_date ? daysUntil(d.domain_expiry_date) : Infinity;
                const sslDateColor =
                  sslDays <= 7 ? "text-red-400" : sslDays <= 30 ? "text-amber-400" : "text-slate-300";
                const domDateColor =
                  domDays <= 7 ? "text-red-400" : domDays <= 30 ? "text-amber-400" : "text-slate-300";

                return (
                  <div key={d.id} className={`space-y-3 p-4 ${rechecking === d.id ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium text-white">{d.domain_name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleRecheck(d.id)}
                          disabled={rechecking === d.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
                        >
                          {rechecking === d.id ? <Spinner /> : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={deleting === d.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        >
                          {deleting === d.id ? <Spinner /> : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">SSL</p>
                        <StatusBadge status={d.ssl_status} />
                        <p className={`mt-1.5 text-xs ${sslDateColor}`}>{formatDate(d.ssl_expiry_date)}</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">Domaine</p>
                        <StatusBadge status={d.domain_status} />
                        <p className={`mt-1.5 text-xs ${domDateColor}`}>{formatDate(d.domain_expiry_date)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Dernier check : {formatDate(d.last_checked)}</p>
                  </div>
                );
              })}
            </div>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Domaine</th>
                  <th className="px-6 py-3 font-medium">SSL</th>
                  <th className="px-6 py-3 font-medium">Expiration SSL</th>
                  <th className="px-6 py-3 font-medium">Domaine</th>
                  <th className="px-6 py-3 font-medium">Expiration domaine</th>
                  <th className="px-6 py-3 font-medium">Dernier check</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {domains.map((d) => {
                  const sslDays = d.ssl_expiry_date ? daysUntil(d.ssl_expiry_date) : Infinity;
                  const domDays = d.domain_expiry_date ? daysUntil(d.domain_expiry_date) : Infinity;

                  const sslDateColor =
                    sslDays <= 7 ? "text-red-400" : sslDays <= 30 ? "text-amber-400" : "text-slate-300";
                  const domDateColor =
                    domDays <= 7 ? "text-red-400" : domDays <= 30 ? "text-amber-400" : "text-slate-300";

                  return (
                    <tr
                      key={d.id}
                      className={`transition-colors duration-150 hover:bg-white/[0.02] ${rechecking === d.id ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {d.domain_name}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={d.ssl_status} />
                      </td>
                      <td className="px-6 py-4">
                        <ExpiryBadge date={d.ssl_expiry_date} />
                        <span className={`ml-2 ${sslDateColor}`}>{formatDate(d.ssl_expiry_date)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={d.domain_status} />
                      </td>
                      <td className="px-6 py-4">
                        <ExpiryBadge date={d.domain_expiry_date} />
                        <span className={`ml-2 ${domDateColor}`}>{formatDate(d.domain_expiry_date)}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(d.last_checked)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <div className="tooltip-wrapper">
                            <button
                              onClick={() => handleRecheck(d.id)}
                              disabled={rechecking === d.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
                            >
                              {rechecking === d.id ? (
                                <Spinner />
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                                </svg>
                              )}
                            </button>
                            <span className="tooltip-text">Re-checker</span>
                          </div>

                          <div className="tooltip-wrapper">
                            <button
                              onClick={() => handleDelete(d.id)}
                              disabled={deleting === d.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            >
                              {deleting === d.id ? (
                                <Spinner />
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              )}
                            </button>
                            <span className="tooltip-text">Supprimer</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      <AddDomainModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => {
          fetchDomains();
          fetchLimit();
        }}
        domainCount={total}
        domainLimit={domainLimit}
      />
    </div>
  );
}
