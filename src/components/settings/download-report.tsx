"use client";

import { useState } from "react";

export default function DownloadReport() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/generate");

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erreur HTTP ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const period =
        res.headers.get("X-Report-Period") || "rapport";
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `dominia-${period}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erreur reseau");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
      <h2 className="text-lg font-medium text-white">Rapport mensuel</h2>
      <p className="mt-1 text-sm text-slate-400">
        Telecharger un rapport PDF avec le recapitulatif de tous vos domaines et
        les alertes du mois en cours.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {downloading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
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
              Generation...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Telecharger le rapport du mois
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
