import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyPdf, monthLabel } from "@/lib/report/generate-pdf";
import type { Domain, AlertSent } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];

  // Report covers the previous month
  const now = new Date();
  const reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = reportDate.getFullYear();
  const month = reportDate.getMonth() + 1; // 1-12

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 1).toISOString();
  const label = monthLabel(year, month);

  log.push(`[START] Generation des rapports pour ${label}`);

  // 1 — Get all distinct user_ids that have at least one domain
  const { data: userRows, error: userError } = await supabase
    .from("domains")
    .select("user_id")
    .limit(10000);

  if (userError) {
    return NextResponse.json(
      { error: "Failed to fetch users", details: userError.message },
      { status: 500 }
    );
  }

  const userIds = Array.from(new Set((userRows ?? []).map((r) => r.user_id)));

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No users with domains", log });
  }

  log.push(`[INFO] ${userIds.length} utilisateur(s) avec des domaines`);

  let reportsSent = 0;

  // 2 — Process each user
  for (const userId of userIds) {
    // Get user email
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);

    if (!user?.email) {
      log.push(`[SKIP] User ${userId} — pas d'email`);
      continue;
    }

    // Fetch domains + alerts for this user in parallel
    const [domainsRes, alertsRes] = await Promise.all([
      supabase
        .from("domains")
        .select("*")
        .eq("user_id", userId)
        .order("domain_name", { ascending: true }),
      supabase
        .from("alerts_sent")
        .select("*, domains(domain_name)")
        .eq("user_id", userId)
        .gte("sent_at", monthStart)
        .lt("sent_at", monthEnd)
        .order("sent_at", { ascending: false }),
    ]);

    const domains = (domainsRes.data ?? []) as Domain[];
    const alertsRaw = (alertsRes.data ?? []) as (AlertSent & {
      domains?: { domain_name: string };
    })[];

    const alerts = alertsRaw.map((a) => ({
      ...a,
      domain_name: a.domains?.domain_name ?? undefined,
      domains: undefined,
    }));

    // Generate PDF
    let buffer: Buffer;
    try {
      buffer = await generateMonthlyPdf({
        userId,
        domains,
        alerts,
        year,
        month,
      });
    } catch (err) {
      log.push(
        `[ERROR] PDF echoue pour ${user.email}: ${err instanceof Error ? err.message : "unknown"}`
      );
      continue;
    }

    // Send via Resend with attachment
    const filename = `dominia-rapport-${year}-${String(month).padStart(2, "0")}.pdf`;

    const { error: emailError } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || "Dominia <reports@dominia.app>",
      to: [user.email],
      subject: `Votre rapport Dominia — ${label}`,
      html: buildReportEmailHtml(label, domains.length, alerts.length),
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    if (emailError) {
      log.push(
        `[ERROR] Email echoue pour ${user.email}: ${emailError.message}`
      );
      continue;
    }

    log.push(
      `[SENT] ${user.email} — ${domains.length} domaine(s), ${alerts.length} alerte(s)`
    );
    reportsSent++;
  }

  log.push(`[DONE] ${reportsSent} rapport(s) envoye(s)`);

  return NextResponse.json({
    success: true,
    users: userIds.length,
    reports_sent: reportsSent,
    period: label,
    log,
  });
}

// ── Report email body ───────────────────────────────────────

function buildReportEmailHtml(
  period: string,
  domainCount: number,
  alertCount: number
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0f1729;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:32px 32px 0;text-align:center">
              <div style="display:inline-block;background-color:#2563eb;border-radius:12px;width:48px;height:48px;line-height:48px;text-align:center;font-size:20px;font-weight:bold;color:#fff">D</div>
              <h1 style="margin:16px 0 0;font-size:20px;color:#ffffff">Rapport mensuel</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1">
                Voici votre rapport Dominia pour <strong style="color:#fff">${period}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #334155">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Domaines surveilles</span><br>
                    <span style="font-size:18px;color:#fff;font-weight:600">${domainCount}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Alertes envoyees ce mois</span><br>
                    <span style="font-size:18px;color:#fff;font-weight:600">${alertCount}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#64748b">
                Le rapport PDF detaille est en piece jointe.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;font-size:12px;color:#475569">
                Dominia — Monitoring SSL &amp; Domaines
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
