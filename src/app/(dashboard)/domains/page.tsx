"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDomainLimit, type PlanId } from "@/lib/stripe/plans";
import type { Domain, SslStatus, DomainStatus } from "@/types";
import AddDomainModal from "@/components/dashboard/add-domain-modal";

// ── Sorting types ────────────────────────────────────────────
type SortKey = "domain_name" | "ssl_expiry_date" | "domain_expiry_date";
type SortDir = "asc" | "desc";

function daysUntil(date: string): number {
  return Math.floor(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = daysUntil(dateStr);
  if (d < 0) return "(expiré)";
  return `(${d}j)`;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState<string | null>(null);
  const [domainLimit, setDomainLimit] = useState<number>(3); // Free plan default

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("domain_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filters
  const [search, setSearch] = useState("");
  const [sslFilter, setSslFilter] = useState<SslStatus | "all">("all");
  const [domainFilter, setDomainFilter] = useState<DomainStatus | "all">("all");

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

  const total = domains.length;

  // ── Filtered + sorted list ──────────────────────────────────
  const filteredDomains = useMemo(() => {
    let list = domains;

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.domain_name.toLowerCase().includes(q));
    }

    // SSL status filter
    if (sslFilter !== "all") {
      list = list.filter((d) => d.ssl_status === sslFilter);
    }

    // Domain status filter
    if (domainFilter !== "all") {
      list = list.filter((d) => d.domain_status === domainFilter);
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "domain_name") {
        return a.domain_name.localeCompare(b.domain_name);
      }
      // For date columns: null → pushed to end
      const dateA = a[sortKey];
      const dateB = b[sortKey];
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    if (sortDir === "desc") sorted.reverse();

    return sorted;
  }, [domains, search, sslFilter, domainFilter, sortKey, sortDir]);

  // ── Toggle sort on column click ─────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 text-slate-600">↕</span>;
    return (
      <span className="ml-1 text-indigo-400">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // ── CSV export ──────────────────────────────────────────────
  const exportCsv = () => {
    const header = [
      "Domaine",
      "Statut SSL",
      "Date expiration SSL",
      "Jours restants SSL",
      "Statut domaine",
      "Date expiration domaine",
      "Jours restants domaine",
      "Dernier check",
    ];

    const rows = filteredDomains.map((d) => [
      d.domain_name,
      d.ssl_status,
      d.ssl_expiry_date ? new Date(d.ssl_expiry_date).toISOString().slice(0, 10) : "",
      d.ssl_expiry_date ? String(daysUntil(d.ssl_expiry_date)) : "",
      d.domain_status,
      d.domain_expiry_date ? new Date(d.domain_expiry_date).toISOString().slice(0, 10) : "",
      d.domain_expiry_date ? String(daysUntil(d.domain_expiry_date)) : "",
      d.last_checked ? new Date(d.last_checked).toISOString().slice(0, 10) : "",
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((c) => `"${c}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dominia-domains-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Domaines</h1>
          <p className="mt-1.5 text-sm font-normal text-slate-500">
            Gerez vos domaines et certificats SSL
            <span className="ml-2 text-slate-600">
              ({total}/{domainLimit === -1 ? "∞" : domainLimit} domaines)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={filteredDomains.length === 0}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-slate-300 transition-colors duration-150 hover:bg-white/[0.04] disabled:opacity-40"
          >
            Exporter CSV
          </button>
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
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un domaine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-white/[0.08] bg-brand-card px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={sslFilter}
          onChange={(e) => setSslFilter(e.target.value as SslStatus | "all")}
          className="rounded-lg border border-white/[0.08] bg-brand-card px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">Statut SSL : Tous</option>
          <option value="valid">Valide</option>
          <option value="expiring_soon">Expire bientôt</option>
          <option value="expired">Expiré</option>
          <option value="error">Erreur</option>
        </select>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value as DomainStatus | "all")}
          className="rounded-lg border border-white/[0.08] bg-brand-card px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">Statut domaine : Tous</option>
          <option value="active">Actif</option>
          <option value="expiring_soon">Expire bientôt</option>
          <option value="expired">Expiré</option>
          <option value="error">Erreur</option>
        </select>
        {(search || sslFilter !== "all" || domainFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setSslFilter("all");
              setDomainFilter("all");
            }}
            className="text-sm text-slate-400 transition-colors duration-150 hover:text-white"
          >
            Réinitialiser
          </button>
        )}
        {!loading && filteredDomains.length !== domains.length && (
          <span className="text-xs text-slate-500">
            {filteredDomains.length} / {domains.length} domaine(s)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl bg-brand-card ring-1 ring-inset ring-white/[0.06]">
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
        ) : filteredDomains.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">
              Aucun domaine ne correspond aux filtres.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSslFilter("all");
                setDomainFilter("all");
              }}
              className="mt-2 text-sm font-medium text-indigo-400 transition-colors duration-150 hover:text-indigo-300"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500">
                <th
                  className="cursor-pointer select-none px-6 py-3 font-medium transition-colors hover:text-slate-300"
                  onClick={() => toggleSort("domain_name")}
                >
                  Domaine
                  <SortArrow col="domain_name" />
                </th>
                <th className="px-6 py-3 font-medium">SSL</th>
                <th
                  className="cursor-pointer select-none px-6 py-3 font-medium transition-colors hover:text-slate-300"
                  onClick={() => toggleSort("ssl_expiry_date")}
                >
                  Expiration SSL
                  <SortArrow col="ssl_expiry_date" />
                </th>
                <th className="px-6 py-3 font-medium">Domaine</th>
                <th
                  className="cursor-pointer select-none px-6 py-3 font-medium transition-colors hover:text-slate-300"
                  onClick={() => toggleSort("domain_expiry_date")}
                >
                  Expiration domaine
                  <SortArrow col="domain_expiry_date" />
                </th>
                <th className="px-6 py-3 font-medium">Dernier check</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredDomains.map((d) => {
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
                      <span className={`ml-2 ${sslDateColor}`}>
                        {formatDate(d.ssl_expiry_date)}{" "}
                        <span className="text-slate-500">
                          {daysLabel(d.ssl_expiry_date)}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.domain_status} />
                    </td>
                    <td className="px-6 py-4">
                      <ExpiryBadge date={d.domain_expiry_date} />
                      <span className={`ml-2 ${domDateColor}`}>
                        {formatDate(d.domain_expiry_date)}{" "}
                        <span className="text-slate-500">
                          {daysLabel(d.domain_expiry_date)}
                        </span>
                      </span>
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
                          <Link
                            href={`/domains/${d.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-indigo-500/10 hover:text-indigo-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </Link>
                          <span className="tooltip-text">Détails</span>
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
        )}
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
