import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Header() {
  const { user, subscription, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-gradient-gold">inkSync AI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/pricing" className="text-sm text-muted-foreground transition hover:text-primary">
            Pricing
          </Link>
          <Link to="/studio" className="text-sm text-muted-foreground transition hover:text-primary">
            AI Studio
          </Link>
          {user && (
            <Link to="/dashboard" className="text-sm text-muted-foreground transition hover:text-primary">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              {subscription?.isPro && (
                <span className="hidden rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary sm:inline">
                  {subscription.plan === "studio_pro" ? "Studio Pro" : "Artist Basic"}
                </span>
              )}
              <Button onClick={handleSignOut} size="sm" variant="ghost" className="text-muted-foreground hover:text-primary">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm text-muted-foreground transition hover:text-primary sm:inline">
                Sign in
              </Link>
              <Button asChild size="sm" className="bg-primary text-primary-foreground shadow-gold hover:opacity-90">
                <Link to="/signup">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
