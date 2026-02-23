import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestWebhook } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { webhookUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.webhookUrl || typeof body.webhookUrl !== "string") {
    return NextResponse.json(
      { error: "Missing required field: webhookUrl" },
      { status: 400 }
    );
  }

  // Basic URL validation
  try {
    new URL(body.webhookUrl);
  } catch {
    return NextResponse.json(
      { error: "URL invalide" },
      { status: 400 }
    );
  }

  const dashboardUrl =
    (process.env.NEXT_PUBLIC_APP_URL || "https://dominia.app") + "/dashboard";

  const result = await sendTestWebhook(body.webhookUrl, dashboardUrl);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Webhook test failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
