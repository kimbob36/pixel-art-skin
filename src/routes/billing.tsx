import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [{ title: "Billing — inkSync AI" }],
  }),
  component: Billing,
});

function Billing() {
  const { user, subscription, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">Billing</h1>
        <p className="mt-2 text-muted-foreground">Manage your subscription.</p>

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
        </div>

        <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">Upgrade with PayPal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            PayPal subscription checkout will be wired up in the next step. For now, view available plans.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
