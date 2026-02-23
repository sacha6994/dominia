import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId as PlanId;
  if (!planId || !PLANS[planId]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = PLANS[planId];

  if (!plan.stripePriceId || plan.stripePriceId === "") {
    console.error(`Stripe price ID not configured for plan: ${planId}`);
    return NextResponse.json(
      { error: "Plan non configuré. Vérifiez les variables d'environnement NEXT_PUBLIC_STRIPE_PRICE_*." },
      { status: 500 }
    );
  }

  // Find existing Stripe customer ID
  const adminSupabase = createAdminClient();
  const { data: existingSub } = await adminSupabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const stripeError = err as Stripe.errors.StripeError;
    console.error("Stripe checkout error:", {
      type: stripeError.type,
      code: stripeError.code,
      message: stripeError.message,
      param: stripeError.param,
      priceId: plan.stripePriceId,
      planId,
    });

    return NextResponse.json(
      {
        error: stripeError.message || "Erreur lors de la création de la session de paiement",
        code: stripeError.code,
      },
      { status: stripeError.statusCode || 500 }
    );
  }
}
