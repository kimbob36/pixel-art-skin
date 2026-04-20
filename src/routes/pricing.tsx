import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — inkSync AI" },
      {
        name: "description",
        content: "Simple plans for solo artists and studios. Start free, upgrade when ready.",
      },
      { property: "og:title", content: "Pricing — inkSync AI" },
      { property: "og:description", content: "Plans for tattoo artists and studios." },
    ],
  }),
  component: Pricing,
});

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    desc: "Try the studio.",
    features: ["5 AI designs / month", "Stencilizer (basic)", "1 saved project"],
    cta: { label: "Start free", to: "/signup" as const },
    highlight: false,
  },
  {
    name: "Artist Basic",
    price: "$19",
    cadence: "/month",
    desc: "For working solo artists.",
    features: [
      "200 AI designs / month",
      "Full stencilizer + warp",
      "Unlimited projects",
      "Priority generation",
    ],
    cta: { label: "Upgrade", to: "/billing" as const },
    highlight: true,
  },
  {
    name: "Studio Pro",
    price: "$59",
    cadence: "/month",
    desc: "For studios and teams.",
    features: [
      "Unlimited AI designs",
      "Full stencilizer + warp",
      "Team seats (coming)",
      "Commercial license",
    ],
    cta: { label: "Go Pro", to: "/billing" as const },
    highlight: false,
  },
];

function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <h1 className="font-display text-5xl font-bold text-gradient-gold">Simple pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you're booking back-to-back.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-8 ${
                  t.highlight
                    ? "border-primary/60 bg-card shadow-gold"
                    : "border-border/60 bg-card"
                }`}
              >
                <h3 className="font-display text-2xl font-semibold text-foreground">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold text-foreground">{t.price}</span>
                  <span className="text-muted-foreground">{t.cadence}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-8 w-full ${
                    t.highlight
                      ? "bg-primary text-primary-foreground shadow-gold hover:opacity-90"
                      : ""
                  }`}
                  variant={t.highlight ? "default" : "outline"}
                >
                  <Link to={t.cta.to}>{t.cta.label}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
