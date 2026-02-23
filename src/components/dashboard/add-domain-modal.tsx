"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SslStatus, DomainStatus } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  domainCount: number;
  domainLimit: number; // -1 = unlimited
}

type Step = "idle" | "checking" | "saving" | "done" | "error";

function mapToSslStatus(
  apiStatus: "green" | "orange" | "red" | "error"
): SslStatus {
  switch (apiStatus) {
    case "green":
      return "valid";
    case "orange":
      return "expiring_soon";
    case "red":
      return "expired";
    default:
      return "error";
  }
}

function mapToDomainStatus(
  apiStatus: "green" | "orange" | "red" | "error"
): DomainStatus {
  switch (apiStatus) {
    case "green":
      return "active";
    case "orange":
      return "expiring_soon";
    case "red":
      return "expired";
    default:
      return "error";
  }
}

export default function AddDomainModal({
  open,
  onClose,
  onAdded,
  domainCount,
  domainLimit,
}: Props) {
  const [domain, setDomain] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const limitReached =
    domainLimit !== -1 && domainCount >= domainLimit;

  useEffect(() => {
    if (open) {
      setDomain("");
      setStep("idle");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = domain.trim();
    if (!trimmed || limitReached) return;

    setError(null);

    setStep("checking");
    let checkData;
    try {
      const res = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Erreur HTTP ${res.status}`);
      }

      checkData = await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le check a échoué");
      setStep("error");
      return;
    }

    setStep("saving");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Non authentifié");
      setStep("error");
      return;
    }

    const { error: insertError } = await supabase.from("domains").insert({
      user_id: user.id,
      domain_name: checkData.domain,
      ssl_expiry_date: checkData.ssl.expiry_date,
      domain_expiry_date: checkData.domain_whois.expiry_date,
      ssl_status: mapToSslStatus(checkData.ssl.status),
      domain_status: mapToDomainStatus(checkData.domain_whois.status),
      last_checked: new Date().toISOString(),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ce domaine est déjà surveillé");
      } else {
        setError(insertError.message);
      }
      setStep("error");
      return;
    }

    setStep("done");
    onAdded();
    setTimeout(() => onClose(), 600);
  };

  if (!open) return null;

  const isWorking = step === "checking" || step === "saving";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-brand-surface p-6 shadow-2xl ring-1 ring-white/[0.06]">
        <h2 className="text-lg font-semibold text-white">
          Ajouter un domaine
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Entrez le nom de domaine à surveiller. Le certificat SSL et
          l&apos;expiration WHOIS seront vérifiés automatiquement.
        </p>

        {/* Limit reached banner */}
        {limitReached && (
          <div className="mt-4 rounded-lg bg-amber-500/10 p-3 ring-1 ring-inset ring-amber-500/20">
            <p className="text-sm font-medium text-amber-400">
              Limite atteinte ({domainCount}/{domainLimit} domaines)
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Passez à un plan supérieur pour surveiller plus de domaines.
            </p>
            <Link
              href="/settings/billing"
              className="mt-2 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              Voir les plans →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="domain-input"
            className="block text-sm font-medium text-slate-300"
          >
            Nom de domaine
          </label>
          <input
            ref={inputRef}
            id="domain-input"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            disabled={isWorking || limitReached}
            className="mt-1.5 block w-full rounded-lg border-0 bg-brand-base px-3 py-2.5 text-white placeholder-slate-500 ring-1 ring-inset ring-white/[0.08] focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 sm:text-sm"
          />

          {step === "checking" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-blue-400">
              <Spinner />
              Vérification du certificat SSL et WHOIS...
            </p>
          )}
          {step === "saving" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-blue-400">
              <Spinner />
              Enregistrement...
            </p>
          )}
          {step === "done" && (
            <p className="mt-3 text-sm text-emerald-400">
              Domaine ajouté avec succès.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isWorking || !domain.trim() || limitReached}
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-150 hover:shadow-indigo-500/30 hover:brightness-110 disabled:opacity-50"
            >
              {isWorking ? "Vérification..." : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
