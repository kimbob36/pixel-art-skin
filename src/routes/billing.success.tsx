import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/billing/success")({
  head: () => ({ meta: [{ title: "Subscription active — inkSync AI" }] }),
  component: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-elegant">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold text-gradient-gold">You're in.</h1>
          <p className="mt-2 text-muted-foreground">Your subscription is active. Time to design.</p>
          <Button asChild className="mt-6 bg-primary text-primary-foreground shadow-gold hover:opacity-90">
            <Link to="/studio">Open Studio</Link>
          </Button>
        </div>
      </main>
    </div>
  ),
});
