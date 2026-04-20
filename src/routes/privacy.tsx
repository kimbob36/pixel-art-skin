import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — inkSync AI" },
      { name: "description", content: "How inkSync AI handles your data." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-muted-foreground">
          <p>
            We collect only what's needed to run your account: email, generated designs, and
            subscription status. Designs are stored privately in your account.
          </p>
          <p>
            We do not sell your data. Payment processing is handled by PayPal; we never see your
            payment details.
          </p>
          <p>Contact: hello@inksyncai.net</p>
        </div>
      </main>
      <Footer />
    </div>
  ),
});
