import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSsl,
  checkWhois,
  daysUntil,
  mapToSslStatus,
  mapToDomainStatus,
} from "@/lib/domain-checker";
import {
  buildAlertEmailHtml,
  buildAlertEmailSubject,
} from "@/lib/email-templates";
import { sendWebhook } from "@/lib/webhook";
import type { Domain, AlertType, UserSettings } from "@/types";

// Alert thresholds in days (ascending order for correct matching)
const ALERT_THRESHOLDS = [1, 7, 14, 30];

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Auth guard ──────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// ── Find matching alert threshold ───────────────────────────

/**
 * Returns the tightest threshold the domain qualifies for.
 * e.g. 6 days → 7, 25 days → 30, 0 days → 1, 35 days → null
 */
function findThreshold(days: number): number | null {
  if (days < 0) return 1; // already expired, treat as critical
  for (const t of ALERT_THRESHOLDS) {
    if (days <= t) return t;
  }
  return null; // > 30 days, no alert
}

// ── Today's date as YYYY-MM-DD ──────────────────────────────

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Lookup user email ───────────────────────────────────────

async function getUserEmail(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(userId);
  return user?.email ?? null;
}

// ── Send one alert ──────────────────────────────────────────

async function sendAlertIfNeeded(
  supabase: ReturnType<typeof createAdminClient>,
  domain: Domain,
  type: "ssl" | "domain",
  expiryDate: string,
  userEmail: string,
  userSettings: UserSettings | null,
  dashboardUrl: string,
  log: string[]
): Promise<void> {
  const days = daysUntil(expiryDate);
  const threshold = findThreshold(days);

  if (threshold === null) return; // > 30 days, no alert needed

  const alertType: AlertType =
    type === "ssl" ? "ssl_expiry" : "domain_expiry";
  const expiryLabel = type === "ssl" ? "SSL" : "Domaine";
  const today = todayDate();

  // Check if this exact alert was already sent today
  const { data: existing } = await supabase
    .from("alerts_sent")
    .select("id")
    .eq("domain_id", domain.id)
    .eq("alert_type", alertType)
    .eq("threshold_days", threshold)
    .eq("sent_date", today)
    .maybeSingle();

  if (existing) {
    log.push(
      `[SKIP] ${domain.domain_name} — ${expiryLabel} ${threshold}j déjà envoyé aujourd'hui`
    );
    return;
  }

  // Send the email
  const subject = buildAlertEmailSubject(
    domain.domain_name,
    expiryLabel,
    days
  );
  const html = buildAlertEmailHtml({
    domainName: domain.domain_name,
    expiryType: expiryLabel,
    daysRemaining: days,
    expiryDate,
    dashboardUrl,
  });

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Dominia <alerts@dominia.app>",
    to: [userEmail],
    subject,
    html,
  });

  if (emailError) {
    log.push(
      `[ERROR] Email échoué pour ${domain.domain_name} (${expiryLabel}, ${threshold}j): ${emailError.message}`
    );
  }

  // Send webhook if configured and enabled
  if (userSettings?.webhook_enabled && userSettings.webhook_url) {
    const webhookResult = await sendWebhook(userSettings.webhook_url, {
      domainName: domain.domain_name,
      expiryType: expiryLabel as "SSL" | "Domaine",
      daysRemaining: days,
      expiryDate,
      dashboardUrl,
    });

    if (webhookResult.ok) {
      log.push(
        `[WEBHOOK] ${domain.domain_name} — ${expiryLabel} webhook envoyé`
      );
    } else {
      log.push(
        `[ERROR] Webhook échoué pour ${domain.domain_name}: ${webhookResult.error}`
      );
    }
  }

  // If email failed and no webhook, skip logging
  if (emailError && !(userSettings?.webhook_enabled && userSettings.webhook_url)) {
    return;
  }

  // Log in alerts_sent table
  const { error: insertError } = await supabase.from("alerts_sent").insert({
    user_id: domain.user_id,
    domain_id: domain.id,
    alert_type: alertType,
    threshold_days: threshold,
    sent_date: today,
  });

  if (insertError && insertError.code !== "23505") {
    log.push(
      `[ERROR] Insert alerts_sent échoué pour ${domain.domain_name}: ${insertError.message}`
    );
    return;
  }

  log.push(
    `[SENT] ${domain.domain_name} — ${expiryLabel} expire dans ${days}j (seuil: ${threshold}j) → ${userEmail}`
  );
}

// ── Main handler ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];
  const dashboardUrl =
    (process.env.NEXT_PUBLIC_APP_URL || "https://dominia.app") + "/dashboard";

  // 1 — Fetch all domains
  const { data: domains, error: fetchError } = await supabase
    .from("domains")
    .select("*");

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch domains", details: fetchError.message },
      { status: 500 }
    );
  }

  if (!domains || domains.length === 0) {
    return NextResponse.json({ message: "No domains to check", log });
  }

  log.push(`[START] Vérification de ${domains.length} domaine(s)...`);

  // Cache user emails and settings to avoid repeated lookups
  const emailCache = new Map<string, string | null>();
  const settingsCache = new Map<string, UserSettings | null>();

  let alertsSent = 0;

  // 2 — Process each domain
  for (const domain of domains as Domain[]) {
    // Run SSL + WHOIS checks in parallel
    const [sslResult, whoisResult] = await Promise.all([
      checkSsl(domain.domain_name),
      checkWhois(domain.domain_name),
    ]);

    const sslStatus = mapToSslStatus(sslResult.status);
    const domainStatus = mapToDomainStatus(whoisResult.status);

    // 3 — Update domain + save history
    const [{ error: updateError }] = await Promise.all([
      supabase
        .from("domains")
        .update({
          ssl_expiry_date: sslResult.expiry_date,
          domain_expiry_date: whoisResult.expiry_date,
          ssl_status: sslStatus,
          domain_status: domainStatus,
          ssl_issuer: sslResult.issuer,
          domain_registrar: whoisResult.registrar,
          last_checked: new Date().toISOString(),
        })
        .eq("id", domain.id),
      supabase.from("domain_checks_history").insert({
        domain_id: domain.id,
        ssl_status: sslStatus,
        domain_status: domainStatus,
        ssl_expiry_date: sslResult.expiry_date,
        domain_expiry_date: whoisResult.expiry_date,
      }),
    ]);

    if (updateError) {
      log.push(
        `[ERROR] Update échoué pour ${domain.domain_name}: ${updateError.message}`
      );
      continue;
    }

    log.push(
      `[CHECK] ${domain.domain_name} — SSL: ${sslResult.days_remaining ?? "?"}j, Domaine: ${whoisResult.days_remaining ?? "?"}j`
    );

    // 4 — Resolve user email + settings (cached)
    if (!emailCache.has(domain.user_id)) {
      emailCache.set(
        domain.user_id,
        await getUserEmail(supabase, domain.user_id)
      );
    }
    if (!settingsCache.has(domain.user_id)) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", domain.user_id)
        .maybeSingle();
      settingsCache.set(domain.user_id, settings);
    }

    const userEmail = emailCache.get(domain.user_id);
    const userSettings = settingsCache.get(domain.user_id) ?? null;

    if (!userEmail) {
      log.push(
        `[SKIP] ${domain.domain_name} — pas d'email pour l'utilisateur`
      );
      continue;
    }

    // 5 — Send alerts if thresholds are met
    const prevLen = log.length;

    if (sslResult.expiry_date) {
      await sendAlertIfNeeded(
        supabase,
        domain,
        "ssl",
        sslResult.expiry_date,
        userEmail,
        userSettings,
        dashboardUrl,
        log
      );
    }

    if (whoisResult.expiry_date) {
      await sendAlertIfNeeded(
        supabase,
        domain,
        "domain",
        whoisResult.expiry_date,
        userEmail,
        userSettings,
        dashboardUrl,
        log
      );
    }

    // Count new [SENT] entries
    alertsSent += log.slice(prevLen).filter((l) => l.startsWith("[SENT]")).length;
  }

  log.push(
    `[DONE] ${domains.length} domaine(s) vérifié(s), ${alertsSent} alerte(s) envoyée(s).`
  );

  return NextResponse.json({
    success: true,
    checked: domains.length,
    alerts_sent: alertsSent,
    log,
  });
}
