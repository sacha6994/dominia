import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { planIdFromPriceId } from "@/lib/stripe/plans";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ── Helpers ─────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    start: new Date(item.current_period_start * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Resolve the supabase user_id from subscription metadata,
 * or fall back to looking up by stripe_customer_id in our DB,
 * or finally by email on the Stripe Customer object.
 */
async function resolveUserId(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
): Promise<string | null> {
  // 1. Check subscription metadata (set via subscription_data in checkout)
  const fromMeta = subscription.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;

  const customerId = getCustomerId(subscription.customer);

  // 2. Look up existing subscription row by stripe_customer_id
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (existingSub?.user_id) return existingSub.user_id;

  // 3. Look up Stripe Customer email → match to auth.users
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;

    const email = (customer as Stripe.Customer).email;
    if (!email) return null;

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers?.users?.find((u) => u.email === email);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ── checkout.session.completed ──────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseAdmin
) {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.supabase_user_id;
  const planId = session.metadata?.plan_id;

  if (!userId || !planId) {
    console.error("[Webhook] Missing metadata on checkout session", session.id);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const priceId = subscription.items.data[0]?.price.id;
  const period = getSubscriptionPeriod(subscription);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: getCustomerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_id: planId,
      status: subscription.status as string,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[Webhook] checkout.session.completed upsert failed:", error);
    throw error;
  }

  console.log(
    `[Webhook] checkout.session.completed → upserted subscription for user ${userId}, plan ${planId}`
  );
}

// ── customer.subscription.created ───────────────────────────

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  const userId = await resolveUserId(subscription, supabase);

  if (!userId) {
    console.warn(
      "[Webhook] customer.subscription.created — could not resolve user_id, will be handled by checkout.session.completed",
      subscription.id
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planId =
    planIdFromPriceId(priceId) ?? subscription.metadata?.plan_id;
  const period = getSubscriptionPeriod(subscription);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: getCustomerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_id: planId,
      status: subscription.status as string,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[Webhook] customer.subscription.created upsert failed:", error);
    throw error;
  }

  console.log(
    `[Webhook] customer.subscription.created → upserted for user ${userId}`
  );
}

// ── customer.subscription.updated ───────────────────────────

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  const priceId = subscription.items.data[0]?.price.id;
  const planId =
    planIdFromPriceId(priceId) ?? subscription.metadata?.plan_id;
  const period = getSubscriptionPeriod(subscription);

  // Try update first (existing row)
  const { error, count } = await supabase
    .from("subscriptions")
    .update({
      stripe_price_id: priceId,
      plan_id: planId,
      status: subscription.status as string,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[Webhook] customer.subscription.updated failed:", error);
    throw error;
  }

  // If no row was updated, the subscription might not exist yet — upsert it
  if (count === 0) {
    console.warn(
      "[Webhook] customer.subscription.updated — no existing row found, attempting upsert"
    );
    const userId = await resolveUserId(subscription, supabase);
    if (userId) {
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: getCustomerId(subscription.customer),
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan_id: planId,
            status: subscription.status as string,
            current_period_start: period.start,
            current_period_end: period.end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (upsertError) {
        console.error("[Webhook] customer.subscription.updated upsert fallback failed:", upsertError);
        throw upsertError;
      }
    }
  }

  console.log(
    `[Webhook] customer.subscription.updated → ${subscription.id} status=${subscription.status}`
  );
}

// ── customer.subscription.deleted ───────────────────────────

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[Webhook] customer.subscription.deleted failed:", error);
    throw error;
  }

  console.log(
    `[Webhook] customer.subscription.deleted → ${subscription.id}`
  );
}

// ── invoice.payment_succeeded ────────────────────────────────

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseAdmin
) {
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) return;

  const subId =
    typeof subscriptionId === "string"
      ? subscriptionId
      : subscriptionId.id;

  const subscription = await stripe.subscriptions.retrieve(subId);
  const period = getSubscriptionPeriod(subscription);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status as string,
      current_period_start: period.start,
      current_period_end: period.end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  if (error) {
    console.error("[Webhook] invoice.payment_succeeded failed:", error);
    throw error;
  }

  console.log(
    `[Webhook] invoice.payment_succeeded → ${subId} period updated`
  );
}

// ── invoice.payment_failed ──────────────────────────────────

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseAdmin
) {
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) return;

  const subId =
    typeof subscriptionId === "string"
      ? subscriptionId
      : subscriptionId.id;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  if (error) {
    console.error("[Webhook] invoice.payment_failed failed:", error);
    throw error;
  }

  console.log(`[Webhook] invoice.payment_failed → ${subId} set to past_due`);
}
