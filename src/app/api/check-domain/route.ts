import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSsl, checkWhois, cleanDomain } from "@/lib/domain-checker";
import { canUserAddDomain } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check domain limit before doing expensive SSL/WHOIS checks
  const { allowed, current, limit } = await canUserAddDomain(user.id);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite atteinte (${current}/${limit} domaines) — passez a un plan superieur pour ajouter plus de domaines`,
        code: "LIMIT_REACHED",
        current,
        limit,
      },
      { status: 403 }
    );
  }

  let body: { domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.domain || typeof body.domain !== "string") {
    return NextResponse.json(
      { error: "Missing required field: domain" },
      { status: 400 }
    );
  }

  const domain = cleanDomain(body.domain);

  if (!domain || domain.length < 3 || !domain.includes(".")) {
    return NextResponse.json(
      { error: "Invalid domain name" },
      { status: 400 }
    );
  }

  const [ssl, domain_whois] = await Promise.all([
    checkSsl(domain),
    checkWhois(domain),
  ]);

  return NextResponse.json({ domain, ssl, domain_whois });
}
