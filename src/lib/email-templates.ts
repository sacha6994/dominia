interface AlertEmailParams {
  domainName: string;
  expiryType: "SSL" | "Domaine";
  daysRemaining: number;
  expiryDate: string;
  dashboardUrl: string;
}

export function buildAlertEmailHtml({
  domainName,
  expiryType,
  daysRemaining,
  expiryDate,
  dashboardUrl,
}: AlertEmailParams): string {
  const urgencyColor =
    daysRemaining <= 1
      ? "#ef4444"
      : daysRemaining <= 7
        ? "#f97316"
        : daysRemaining <= 14
          ? "#f59e0b"
          : "#3b82f6";

  const formattedDate = new Date(expiryDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0f1729;border-radius:16px;overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center">
              <div style="display:inline-block;background-color:#2563eb;border-radius:12px;width:48px;height:48px;line-height:48px;text-align:center;font-size:20px;font-weight:bold;color:#fff">D</div>
              <h1 style="margin:16px 0 0;font-size:20px;color:#ffffff">Dominia Alert</h1>
            </td>
          </tr>
          <!-- Badge -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center">
              <div style="display:inline-block;background-color:${urgencyColor}20;border:1px solid ${urgencyColor}40;border-radius:24px;padding:6px 16px;font-size:13px;font-weight:600;color:${urgencyColor}">
                ${daysRemaining <= 1 ? "CRITIQUE" : daysRemaining <= 7 ? "URGENT" : "ATTENTION"} — ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}
              </div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1">
                Le certificat <strong style="color:#fff">${expiryType}</strong> de
                <strong style="color:#fff">${domainName}</strong>
                expire le <strong style="color:#fff">${formattedDate}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #334155">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Domaine</span><br>
                    <span style="font-size:15px;color:#fff;font-weight:500">${domainName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #334155">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Type</span><br>
                    <span style="font-size:15px;color:#fff;font-weight:500">Expiration ${expiryType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #334155">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Date d'expiration</span><br>
                    <span style="font-size:15px;color:#fff;font-weight:500">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Temps restant</span><br>
                    <span style="font-size:15px;font-weight:600;color:${urgencyColor}">${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px">
                Voir le dashboard
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center">
              <p style="margin:0;font-size:12px;color:#475569">
                Envoyé par Dominia — Monitoring SSL &amp; Domaines
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

export function buildAlertEmailSubject(
  domainName: string,
  expiryType: "SSL" | "Domaine",
  daysRemaining: number
): string {
  if (daysRemaining <= 1) {
    return `[CRITIQUE] ${expiryType} de ${domainName} expire demain`;
  }
  if (daysRemaining <= 7) {
    return `[URGENT] ${expiryType} de ${domainName} expire dans ${daysRemaining}j`;
  }
  return `${expiryType} de ${domainName} expire dans ${daysRemaining} jours`;
}
