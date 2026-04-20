import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — inkSync AI" },
      { name: "description", content: "Terms governing use of inkSync AI." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">Terms of Service</h1>
        <div className="mt-6 space-y-4 text-muted-foreground">
          <p>
            By using inkSync AI you agree to use generated designs in compliance with applicable
            laws and platform policies. Studio Pro includes a commercial license.
          </p>
          <p>Subscriptions auto-renew until cancelled. Cancel anytime in Billing.</p>
          <p>Contact: hello@inksyncai.net</p>
        </div>
      </main>
      <Footer />
    </div>
  ),
});
