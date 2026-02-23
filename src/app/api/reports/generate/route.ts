import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyPdf, monthLabel } from "@/lib/report/generate-pdf";
import type { Domain, AlertSent } from "@/types";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Start and end of current month
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 1).toISOString();

  // Fetch domains + alerts for this month in parallel (admin client, filtered by user_id)
  const [domainsRes, alertsRes] = await Promise.all([
    admin
      .from("domains")
      .select("*")
      .eq("user_id", user.id)
      .order("domain_name", { ascending: true }),
    admin
      .from("alerts_sent")
      .select("*, domains(domain_name)")
      .eq("user_id", user.id)
      .gte("sent_at", monthStart)
      .lt("sent_at", monthEnd)
      .order("sent_at", { ascending: false }),
  ]);

  const domains = (domainsRes.data ?? []) as Domain[];
  const alertsRaw = (alertsRes.data ?? []) as (AlertSent & {
    domains?: { domain_name: string };
  })[];

  // Flatten the join
  const alerts = alertsRaw.map((a) => ({
    ...a,
    domain_name: a.domains?.domain_name ?? undefined,
    domains: undefined,
  }));

  const buffer = await generateMonthlyPdf({
    userId: user.id,
    domains,
    alerts,
    year,
    month,
  });

  const filename = `dominia-rapport-${year}-${String(month).padStart(2, "0")}.pdf`;
  const label = monthLabel(year, month);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Report-Period": label,
    },
  });
}
