import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — inkSync AI" }] }),
  component: Dashboard,
});

interface Project {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
  design_url: string | null;
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("id, title, mode, updated_at, design_url")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setProjects(data ?? []));
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-gradient-gold">Your projects</h1>
            <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground shadow-gold hover:opacity-90">
            <Link to="/studio">
              <Plus className="mr-1 h-4 w-4" /> New design
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border/60 bg-card/50 p-16 text-center">
            <p className="text-muted-foreground">No projects yet. Start your first design.</p>
            <Button asChild className="mt-4 bg-primary text-primary-foreground shadow-gold hover:opacity-90">
              <Link to="/studio">Open Studio</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border/60 bg-card p-4 transition hover:border-primary/40"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {p.design_url && (
                    <img src={p.design_url} alt={p.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <h3 className="mt-3 font-medium text-foreground">{p.title}</h3>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.mode}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
