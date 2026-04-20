import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", toDelete.id);
      if (error) throw error;
      setProjects((p) => p.filter((x) => x.id !== toDelete.id));
      toast.success("Project deleted");
      setToDelete(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

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
                className="group flex flex-col rounded-xl border border-border/60 bg-card p-4 transition hover:border-primary/40"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {p.design_url && (
                    <img src={p.design_url} alt={p.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <h3 className="mt-3 font-medium text-foreground">{p.title}</h3>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.mode}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate({ to: "/studio", search: { id: p.id } })}
                  >
                    <ExternalLink className="mr-1 h-4 w-4" /> Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setToDelete(p)}
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
