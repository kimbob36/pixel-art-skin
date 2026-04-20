// Edge function: paypal-webhook
// Receives PayPal webhook events and updates subscription status. Verifies signatures via PayPal API.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo",
};

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_SECRET")!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  return json.access_token;
}

async function verifyWebhook(req: Request, body: string, accessToken: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID")!;
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: req.headers.get("paypal-auth-algo"),
      cert_url: req.headers.get("paypal-cert-url"),
      transmission_id: req.headers.get("paypal-transmission-id"),
      transmission_sig: req.headers.get("paypal-transmission-sig"),
      transmission_time: req.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });
  const json = await verifyRes.json();
  return json.verification_status === "SUCCESS";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const rawBody = await req.text();
    const accessToken = await getAccessToken();

    const verified = await verifyWebhook(req, rawBody, accessToken);
    if (!verified) {
      console.warn("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.event_type;
    const resource = event.resource ?? {};
    const subscriptionId: string | undefined = resource.id ?? resource.billing_agreement_id;
    const customId: string | undefined = resource.custom_id;
    const planId: string | undefined = resource.plan_id;

    console.log("PayPal webhook", eventType, subscriptionId);

    let plan: "artist_basic" | "studio_pro" | undefined;
    if (planId === Deno.env.get("PAYPAL_PLAN_ID_PRO")) plan = "studio_pro";
    else if (planId === Deno.env.get("PAYPAL_PLAN_ID_BASIC")) plan = "artist_basic";

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (plan) updates.plan = plan;
    if (planId) updates.paypal_plan_id = planId;
    if (subscriptionId) updates.paypal_subscription_id = subscriptionId;

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
        updates.status = "active";
        updates.cancel_at_period_end = false;
        break;
      case "BILLING.SUBSCRIPTION.UPDATED":
        updates.status = "active";
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
        updates.status = "canceled";
        break;
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        updates.status = "suspended";
        break;
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        updates.status = "past_due";
        break;
      case "PAYMENT.SALE.COMPLETED":
        updates.status = "active";
        break;
      default:
        console.log("Unhandled event", eventType);
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let query = admin.from("subscriptions").update(updates);
    if (customId) query = query.eq("user_id", customId);
    else if (subscriptionId) query = query.eq("paypal_subscription_id", subscriptionId);
    const { error } = await query;
    if (error) console.error("DB update error", error);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
