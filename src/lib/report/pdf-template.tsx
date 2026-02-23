import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Domain, AlertSent } from "@/types";

// ── Styles ──────────────────────────────────────────────────

const colors = {
  primary: "#2563eb",
  dark: "#0f172a",
  text: "#334155",
  textLight: "#64748b",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoSquare: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    color: colors.white,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.dark,
  },
  period: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.dark,
    marginBottom: 10,
    marginTop: 24,
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.dark,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.bgLight,
  },
  tableCell: {
    fontSize: 9,
    color: colors.text,
  },
  // Column widths
  colDomain: { width: "25%" },
  colStatus: { width: "15%" },
  colDate: { width: "20%" },
  colDays: { width: "10%" },
  // Alert table columns
  colAlertDate: { width: "25%" },
  colAlertDomain: { width: "30%" },
  colAlertType: { width: "25%" },
  colAlertThreshold: { width: "20%" },
  // Status badge
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
  },
  badgeGreen: { backgroundColor: "#dcfce7", color: colors.green },
  badgeAmber: { backgroundColor: "#fef3c7", color: colors.amber },
  badgeRed: { backgroundColor: "#fee2e2", color: colors.red },
  badgeGray: { backgroundColor: "#f1f5f9", color: colors.textLight },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
  },
  // Empty
  empty: {
    padding: 20,
    textAlign: "center",
    color: colors.textLight,
    fontSize: 10,
  },
});

// ── Helpers ─────────────────────────────────────────────────

function daysUntil(date: string): number {
  return Math.floor(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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

function sslStatusLabel(status: string): string {
  const map: Record<string, string> = {
    valid: "Valide",
    expiring_soon: "Bientot",
    expired: "Expire",
    error: "Erreur",
    unknown: "Inconnu",
  };
  return map[status] ?? status;
}

function domainStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Actif",
    expiring_soon: "Bientot",
    expired: "Expire",
    error: "Erreur",
    unknown: "Inconnu",
  };
  return map[status] ?? status;
}

function alertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ssl_expiry: "Expiration SSL",
    domain_expiry: "Expiration Domaine",
    ssl_error: "Erreur SSL",
    domain_error: "Erreur Domaine",
  };
  return map[type] ?? type;
}

function statusBadgeStyle(status: string) {
  if (status === "valid" || status === "active") return s.badgeGreen;
  if (status === "expiring_soon") return s.badgeAmber;
  if (status === "expired" || status === "error") return s.badgeRed;
  return s.badgeGray;
}

function monthYearLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const m = date.toLocaleDateString("fr-FR", { month: "long" });
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${year}`;
}

// ── Props ───────────────────────────────────────────────────

export interface ReportData {
  domains: Domain[];
  alerts: (AlertSent & { domain_name?: string })[];
  year: number;
  month: number;
  generatedAt: string;
}

// ── Component ───────────────────────────────────────────────

export function MonthlyReport({ domains, alerts, year, month, generatedAt }: ReportData) {
  const periodLabel = monthYearLabel(year, month);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <View style={s.logoSquare}>
              <Text style={s.logoLetter}>D</Text>
            </View>
            <Text style={s.logoText}>Dominia</Text>
          </View>
          <Text style={s.period}>Rapport — {periodLabel}</Text>
        </View>

        {/* Domains table */}
        <Text style={s.sectionTitle}>
          Domaines surveilles ({domains.length})
        </Text>

        {domains.length === 0 ? (
          <Text style={s.empty}>Aucun domaine surveille.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.colDomain]}>Domaine</Text>
              <Text style={[s.tableHeaderCell, s.colStatus]}>SSL</Text>
              <Text style={[s.tableHeaderCell, s.colDate]}>Exp. SSL</Text>
              <Text style={[s.tableHeaderCell, s.colStatus]}>Domaine</Text>
              <Text style={[s.tableHeaderCell, s.colDate]}>Exp. Domaine</Text>
            </View>
            {domains.map((d, i) => (
              <View
                key={d.id}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tableCell, s.colDomain]}>{d.domain_name}</Text>
                <View style={s.colStatus}>
                  <Text style={[s.badge, statusBadgeStyle(d.ssl_status)]}>
                    {sslStatusLabel(d.ssl_status)}
                  </Text>
                </View>
                <Text style={[s.tableCell, s.colDate]}>
                  {formatDate(d.ssl_expiry_date)}
                  {d.ssl_expiry_date
                    ? ` (${daysUntil(d.ssl_expiry_date)}j)`
                    : ""}
                </Text>
                <View style={s.colStatus}>
                  <Text style={[s.badge, statusBadgeStyle(d.domain_status)]}>
                    {domainStatusLabel(d.domain_status)}
                  </Text>
                </View>
                <Text style={[s.tableCell, s.colDate]}>
                  {formatDate(d.domain_expiry_date)}
                  {d.domain_expiry_date
                    ? ` (${daysUntil(d.domain_expiry_date)}j)`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Alerts table */}
        <Text style={s.sectionTitle}>
          Alertes du mois ({alerts.length})
        </Text>

        {alerts.length === 0 ? (
          <Text style={s.empty}>Aucune alerte envoyee ce mois.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.colAlertDate]}>Date</Text>
              <Text style={[s.tableHeaderCell, s.colAlertDomain]}>Domaine</Text>
              <Text style={[s.tableHeaderCell, s.colAlertType]}>Type</Text>
              <Text style={[s.tableHeaderCell, s.colAlertThreshold]}>
                Seuil
              </Text>
            </View>
            {alerts.map((a, i) => (
              <View
                key={a.id}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tableCell, s.colAlertDate]}>
                  {formatDate(a.sent_at)}
                </Text>
                <Text style={[s.tableCell, s.colAlertDomain]}>
                  {a.domain_name ?? "—"}
                </Text>
                <Text style={[s.tableCell, s.colAlertType]}>
                  {alertTypeLabel(a.alert_type)}
                </Text>
                <Text style={[s.tableCell, s.colAlertThreshold]}>
                  ≤ {a.threshold_days}j
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Dominia — Monitoring SSL & Domaines
          </Text>
          <Text style={s.footerText}>
            Genere le {generatedAt}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
