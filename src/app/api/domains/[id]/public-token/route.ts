import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — Generate a public token for the domain
export async function POST(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: domain, error: fetchError } = await admin
      .from("domains")
      .select("id, public_token, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[public-token POST] DB fetch error:", fetchError);
      return NextResponse.json(
        { error: "Database error", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    if (domain.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If a token already exists, return it
    if (domain.public_token) {
      return NextResponse.json({ token: domain.public_token });
    }

    // Generate a new UUID token
    const token = crypto.randomUUID();

    const { error } = await admin
      .from("domains")
      .update({ public_token: token })
      .eq("id", id);

    if (error) {
      console.error("[public-token POST] DB update error:", error);
      return NextResponse.json(
        { error: "Failed to generate token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[public-token POST] Unhandled error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// DELETE — Revoke the public token
export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: domain, error: fetchError } = await admin
      .from("domains")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[public-token DELETE] DB fetch error:", fetchError);
      return NextResponse.json(
        { error: "Database error", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    if (domain.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin
      .from("domains")
      .update({ public_token: null })
      .eq("id", id);

    if (error) {
      console.error("[public-token DELETE] DB update error:", error);
      return NextResponse.json(
        { error: "Failed to revoke token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[public-token DELETE] Unhandled error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
