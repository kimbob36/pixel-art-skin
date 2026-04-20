import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/site/Header";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "AI Studio — inkSync AI" }] }),
  component: Studio,
});

function Studio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold text-gradient-gold">AI Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Fabric.js editor, Sobel stencilizer, and perspective warp arrive in the next batch.
        </p>
        <div className="mt-8 flex h-[60vh] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/50">
          <p className="text-sm text-muted-foreground">Studio canvas coming soon.</p>
        </div>
      </main>
    </div>
  );
}
