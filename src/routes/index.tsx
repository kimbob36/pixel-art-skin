import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Layers, ScanLine } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "inkSync AI — AI Tattoo Design Studio for Artists" },
      {
        name: "description",
        content:
          "Generate, stencilize, and place professional tattoo designs with AI. Built for tattoo artists and studios.",
      },
      { property: "og:title", content: "inkSync AI — AI Tattoo Design Studio" },
      {
        property: "og:description",
        content: "AI-powered tattoo design, stenciling, and body placement.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 luxury-grid opacity-30" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> AI Studio for Tattoo Artists
              </div>
              <h1 className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
                Design tattoos at the <span className="text-gradient-gold">speed of thought.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                Generate concepts, convert to clean stencils, and preview placements on real body
                references — all in one studio built for working tattoo artists.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-gold hover:opacity-90">
                  <Link to="/signup">Start free — 5 designs</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border/60">
                  <Link to="/pricing">See pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Wand2,
                title: "AI Design Generation",
                desc: "Describe an idea, get publishable concepts in seconds. Refine with prompts.",
              },
              {
                icon: ScanLine,
                title: "One-click Stencils",
                desc: "Edge-detection pipeline produces clean, transferable stencil linework.",
              },
              {
                icon: Layers,
                title: "Body Placement Preview",
                desc: "Warp designs onto reference photos with perspective-aware placement.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/60 bg-card p-6 transition hover:border-primary/40"
              >
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
