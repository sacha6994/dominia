import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { MonthlyReport } from "./pdf-template";
import type { ReportData } from "./pdf-template";
import type { Domain, AlertSent } from "@/types";

interface UserReportInput {
  userId: string;
  domains: Domain[];
  alerts: (AlertSent & { domain_name?: string })[];
  year: number;
  month: number;
}

export async function generateMonthlyPdf(
  input: UserReportInput
): Promise<Buffer> {
  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const data: ReportData = {
    domains: input.domains,
    alerts: input.alerts,
    year: input.year,
    month: input.month,
    generatedAt,
  };

  const buffer = await renderToBuffer(
    <MonthlyReport {...data} />
  );

  return Buffer.from(buffer);
}

export function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const m = date.toLocaleDateString("fr-FR", { month: "long" });
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${year}`;
}
