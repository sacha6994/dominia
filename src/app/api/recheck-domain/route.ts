import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSsl,
  checkWhois,
  mapToSslStatus,
  mapToDomainStatus,
} from "@/lib/domain-checker";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domainId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.domainId) {
    return NextResponse.json(
      { error: "Missing required field: domainId" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS (cookies may not propagate to API routes)
  const adminSupabase = createAdminClient();

  // Verify ownership explicitly
  const { data: domain } = await adminSupabase
    .from("domains")
    .select("*")
    .eq("id", body.domainId)
    .maybeSingle();

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (domain.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run SSL + WHOIS checks in parallel
  const [ssl, whois] = await Promise.all([
    checkSsl(domain.domain_name),
    checkWhois(domain.domain_name),
  ]);

  const now = new Date().toISOString();
  const sslStatus = mapToSslStatus(ssl.status);
  const domainStatus = mapToDomainStatus(whois.status);

  // Update domain + save history in parallel
  await Promise.all([
    adminSupabase
      .from("domains")
      .update({
        ssl_expiry_date: ssl.expiry_date,
        domain_expiry_date: whois.expiry_date,
        ssl_status: sslStatus,
        domain_status: domainStatus,
        ssl_issuer: ssl.issuer,
        domain_registrar: whois.registrar,
        last_checked: now,
      })
      .eq("id", domain.id),

    adminSupabase.from("domain_checks_history").insert({
      domain_id: domain.id,
      ssl_status: sslStatus,
      domain_status: domainStatus,
      ssl_expiry_date: ssl.expiry_date,
      domain_expiry_date: whois.expiry_date,
    }),
  ]);

  return NextResponse.json({
    id: domain.id,
    ssl_expiry_date: ssl.expiry_date,
    domain_expiry_date: whois.expiry_date,
    ssl_status: sslStatus,
    domain_status: domainStatus,
    ssl_issuer: ssl.issuer,
    domain_registrar: whois.registrar,
    last_checked: now,
    ssl,
    domain_whois: whois,
  });
}
