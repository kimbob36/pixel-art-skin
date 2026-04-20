import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-gradient-gold">
                inkSync AI
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              The professional AI-powered design platform for tattoo artists and
              studios. Generate, refine, and place world-class artwork in
              seconds.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/pricing" className="text-muted-foreground hover:text-primary transition">Pricing</Link></li>
              <li><Link to="/studio" className="text-muted-foreground hover:text-primary transition">AI Studio</Link></li>
              <li><Link to="/dashboard" className="text-muted-foreground hover:text-primary transition">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/impressum" className="text-muted-foreground hover:text-primary transition">Impressum</Link></li>
              <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-primary transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground md:flex-row md:text-left">
          <p>© 2026 made by Kim Clauß — Rendsburg, Germany.</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
            Made in Rendsburg · Schleswig-Holstein
          </span>
          <p>inkSyncAI.net — Crafted for the cyber-luxury era of body art.</p>
        </div>
      </div>
    </footer>
  );
}
