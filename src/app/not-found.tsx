import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-base px-6">
      <Image
        src="/dominia-logo-v2.png"
        alt="Dominia"
        width={200}
        height={56}
        priority
        className="w-auto"
        style={{ minWidth: "200px" }}
      />
      <h1 className="mt-8 text-6xl font-bold tracking-tight text-white">404</h1>
      <p className="mt-3 text-lg text-slate-400">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
      >
        Retour au dashboard
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
