import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [{ title: "Billing — inkSync AI" }],
  }),
  component: Billing,
});

type Plan = "artist_basic" | "studio_pro";

function Billing() {
  const { user, subscription, loading, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<Plan | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const subscribe = async (plan: Plan) => {
    setBusy(plan);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          plan,
          returnUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        },
      });
      if (error) throw error;
      if (!data?.approveUrl) throw new Error("No approval URL returned");
      window.location.href = data.approveUrl;
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message ?? "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">Billing</h1>
        <p className="mt-2 text-muted-foreground">Manage your subscription via PayPal.</p>

        <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Current plan</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {subscription?.plan === "studio_pro"
                  ? "Studio Pro"
                  : subscription?.plan === "artist_basic"
                    ? "Artist Basic"
                    : "Free"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Status: {subscription?.status ?? "inactive"}
              </p>
            </div>
            {subscription?.isPro && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Pro
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="mt-4" onClick={refreshSubscription}>
            Refresh status
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Artist Basic</h2>
            <p className="mt-2 text-sm text-muted-foreground">200 generations / month</p>
            <Button
              className="mt-4 w-full"
              disabled={busy !== null || subscription?.plan === "artist_basic"}
              onClick={() => subscribe("artist_basic")}
            >
              {busy === "artist_basic" ? "Redirecting…" : "Subscribe with PayPal"}
            </Button>
          </div>
          <div className="rounded-xl border border-primary/40 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-gradient-gold">Studio Pro</h2>
            <p className="mt-2 text-sm text-muted-foreground">Unlimited generations</p>
            <Button
              className="mt-4 w-full"
              disabled={busy !== null || subscription?.plan === "studio_pro"}
              onClick={() => subscribe("studio_pro")}
            >
              {busy === "studio_pro" ? "Redirecting…" : "Subscribe with PayPal"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
