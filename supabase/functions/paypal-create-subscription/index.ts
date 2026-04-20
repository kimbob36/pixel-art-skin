// Edge function: paypal-create-subscription
// Creates a PayPal subscription for the authenticated user and returns approval URL.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com"; // live
// const PAYPAL_BASE = "https://api-m.sandbox.paypal.com"; // sandbox

async function getPayPalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_SECRET")!;
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { plan, returnUrl, cancelUrl } = await req.json();
    if (plan !== "artist_basic" && plan !== "studio_pro") {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planId =
      plan === "studio_pro"
        ? Deno.env.get("PAYPAL_PLAN_ID_PRO")!
        : Deno.env.get("PAYPAL_PLAN_ID_BASIC")!;

    const accessToken = await getPayPalAccessToken();

    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id,
        subscriber: {
          email_address: user.email,
        },
        application_context: {
          brand_name: "inkSync AI",
          user_action: "SUBSCRIBE_NOW",
          return_url: returnUrl ?? `${new URL(req.url).origin}/billing/success`,
          cancel_url: cancelUrl ?? `${new URL(req.url).origin}/billing/cancel`,
        },
      }),
    });

    if (!subRes.ok) {
      const txt = await subRes.text();
      console.error("PayPal subscription create error", subRes.status, txt);
      throw new Error(`PayPal: ${subRes.status}`);
    }
    const subscription = await subRes.json();

    // Persist pending subscription record
    const admin = createClient(SUPABASE_URL, SERVICE);
    await admin
      .from("subscriptions")
      .update({
        paypal_subscription_id: subscription.id,
        paypal_plan_id: planId,
        plan,
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    const approveLink = (subscription.links ?? []).find(
      (l: { rel: string; href: string }) => l.rel === "approve",
    );

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        approveUrl: approveLink?.href,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
