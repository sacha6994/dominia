// ── Webhook notification sender ──────────────────────────────
// Supports Slack (Block Kit), Discord, and generic JSON webhooks.

export interface WebhookAlertPayload {
  domainName: string;
  expiryType: "SSL" | "Domaine";
  daysRemaining: number;
  expiryDate: string;
  dashboardUrl: string;
}

// ── Slack Block Kit payload ──────────────────────────────────

function buildSlackPayload(p: WebhookAlertPayload) {
  const color = p.daysRemaining < 7 ? "#e11d48" : "#f59e0b"; // red / orange
  const urgency = p.daysRemaining < 0 ? "EXPIRE" : `${p.daysRemaining} jours restants`;
  const formattedDate = new Date(p.expiryDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    text: `Alerte Dominia : ${p.expiryType} de ${p.domainName} — ${urgency}`,
    attachments: [
      {
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                "*:warning: Alerte Dominia*",
                "",
                `*Domaine :* ${p.domainName}`,
                `*Type :* ${p.expiryType === "SSL" ? "Certificat SSL" : "Nom de domaine"}`,
                `*Expiration :* ${formattedDate}`,
                `*Statut :* ${p.daysRemaining < 0 ? ":red_circle: Expiré" : p.daysRemaining < 7 ? `:red_circle: ${p.daysRemaining} jours restants` : `:large_orange_circle: ${p.daysRemaining} jours restants`}`,
              ].join("\n"),
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Voir le tableau de bord" },
                url: p.dashboardUrl,
              },
            ],
          },
        ],
      },
    ],
  };
}

// ── Generic / Discord payload ────────────────────────────────

function buildGenericPayload(p: WebhookAlertPayload) {
  const formattedDate = new Date(p.expiryDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    content: [
      `**Alerte Dominia**`,
      `Domaine : **${p.domainName}**`,
      `Type : ${p.expiryType === "SSL" ? "Certificat SSL" : "Nom de domaine"}`,
      `Expiration : ${formattedDate}`,
      `Statut : ${p.daysRemaining < 0 ? "Expiré" : `${p.daysRemaining} jours restants`}`,
      `Dashboard : ${p.dashboardUrl}`,
    ].join("\n"),
  };
}

// ── Detect webhook type from URL ─────────────────────────────

function isSlackWebhook(url: string): boolean {
  return url.includes("hooks.slack.com");
}

// ── Send webhook ─────────────────────────────────────────────

export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookAlertPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = isSlackWebhook(webhookUrl)
      ? buildSlackPayload(payload)
      : buildGenericPayload(payload);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Webhook failed",
    };
  }
}

// ── Test webhook (sends a fake alert) ────────────────────────

export async function sendTestWebhook(
  webhookUrl: string,
  dashboardUrl: string
): Promise<{ ok: boolean; error?: string }> {
  return sendWebhook(webhookUrl, {
    domainName: "exemple.com",
    expiryType: "SSL",
    daysRemaining: 5,
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    dashboardUrl,
  });
}
