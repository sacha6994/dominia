import sslChecker from "ssl-checker";
import * as tls from "tls";
import * as whoiser from "whoiser";
import type { SslStatus, DomainStatus } from "@/types";

// ── Types ───────────────────────────────────────────────────

export interface SslCheckResult {
  expiry_date: string | null;
  days_remaining: number | null;
  status: "green" | "orange" | "red" | "error";
  issuer: string | null;
  error?: string;
}

export interface WhoisCheckResult {
  expiry_date: string | null;
  days_remaining: number | null;
  status: "green" | "orange" | "red" | "error";
  registrar: string | null;
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────

export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const now = new Date();
  return Math.floor(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function statusFromDays(days: number): "green" | "orange" | "red" {
  if (days > 30) return "green";
  if (days >= 7) return "orange";
  return "red";
}

export function cleanDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.split("/")[0];
  domain = domain.split(":")[0];
  return domain;
}

/** Map the API traffic-light status to a DB enum value. */
export function mapToSslStatus(
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

export function mapToDomainStatus(
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

// ── SSL issuer via TLS ──────────────────────────────────────

function getSslIssuer(domain: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: domain, port: 443, servername: domain, timeout: 5000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        if (cert && cert.issuer) {
          resolve(cert.issuer.O || cert.issuer.CN || null);
        } else {
          resolve(null);
        }
      }
    );
    socket.on("error", () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

// ── SSL check ───────────────────────────────────────────────

export async function checkSsl(domain: string): Promise<SslCheckResult> {
  try {
    const [result, issuer] = await Promise.all([
      sslChecker(domain, { method: "GET", port: 443 }),
      getSslIssuer(domain),
    ]);

    if (!result.valid) {
      return {
        expiry_date: result.validTo ?? null,
        days_remaining: result.daysRemaining ?? null,
        status: "error",
        issuer,
        error: "SSL certificate is invalid",
      };
    }

    return {
      expiry_date: result.validTo,
      days_remaining: result.daysRemaining,
      status: statusFromDays(result.daysRemaining),
      issuer,
    };
  } catch (err) {
    return {
      expiry_date: null,
      days_remaining: null,
      status: "error",
      issuer: null,
      error: err instanceof Error ? err.message : "SSL check failed",
    };
  }
}

// ── WHOIS check (whoiser — free, no API key) ────────────────

/** Known WHOIS field names for expiry date across registrars */
const EXPIRY_FIELDS = [
  "Expiry Date",
  "Registry Expiry Date",
  "Registrar Registration Expiration Date",
  "paid-till",
  "Expiration Date",
  "expire",
];

function extractExpiryDate(
  whoisData: Record<string, unknown>
): string | null {
  for (const field of EXPIRY_FIELDS) {
    const value = whoisData[field];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function extractRegistrar(
  whoisData: Record<string, unknown>
): string | null {
  const value = whoisData["Registrar"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function checkWhois(domain: string): Promise<WhoisCheckResult> {
  try {
    const raw = await whoiser.whoisDomain(domain, { timeout: 10_000 });
    const result = whoiser.firstResult(raw);

    const expiryRaw = extractExpiryDate(result);
    const registrar = extractRegistrar(result);

    if (!expiryRaw) {
      return {
        expiry_date: null,
        days_remaining: null,
        status: "error",
        registrar,
        error: "No expiry date found in WHOIS data",
      };
    }

    const expiry = new Date(expiryRaw);

    if (isNaN(expiry.getTime())) {
      return {
        expiry_date: null,
        days_remaining: null,
        status: "error",
        registrar,
        error: `Could not parse WHOIS expiry date: ${expiryRaw}`,
      };
    }

    const days = daysUntil(expiry);

    return {
      expiry_date: expiry.toISOString(),
      days_remaining: days,
      status: statusFromDays(days),
      registrar,
    };
  } catch (err) {
    return {
      expiry_date: null,
      days_remaining: null,
      status: "error",
      registrar: null,
      error: err instanceof Error ? err.message : "WHOIS check failed",
    };
  }
}
