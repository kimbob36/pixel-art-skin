import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum — inkSync AI" },
      { name: "description", content: "Legal notice and operator information for inkSync AI." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16 prose prose-invert">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">Impressum</h1>
        <p className="mt-4 text-muted-foreground">Angaben gemäß § 5 TMG</p>
        <div className="mt-6 space-y-2 text-foreground">
          <p>Kim Clauß</p>
          <p>inkSyncAI.net</p>
          <p>Kontakt: hello@inksyncai.net</p>
        </div>
      </main>
      <Footer />
    </div>
  ),
});
