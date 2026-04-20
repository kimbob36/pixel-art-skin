import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/billing/cancel")({
  head: () => ({ meta: [{ title: "Checkout cancelled — inkSync AI" }] }),
  component: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-border/60 bg-card p-8 text-center">
          <XCircle className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="mt-4 font-display text-3xl font-bold text-foreground">Checkout cancelled</h1>
          <p className="mt-2 text-muted-foreground">No charges made. You can try again anytime.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/pricing">Back to pricing</Link>
          </Button>
        </div>
      </main>
    </div>
  ),
});
