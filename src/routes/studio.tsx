import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { FabricCanvas } from "@/components/studio/FabricCanvas";
import { PerspectiveControls } from "@/components/studio/PerspectiveControls";
import { stencilize } from "@/lib/stencil";
import { warpOntoBackground, type Point } from "@/lib/warp";
import { toast } from "sonner";
import { Wand2, Download, Upload, ScanLine, Loader2, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveProject, loadProject } from "@/utils/projects.functions";
import type * as fabric from "fabric";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Studio — inkSync AI" },
      { name: "description", content: "Generate, stencilize, and place tattoo designs." },
    ],
  }),
  component: Studio,
});

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function Studio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = Route.useSearch();
  const [tab, setTab] = useState("generate");

  // Project identity (set when loaded from /studio?id=...)
  const [projectId, setProjectId] = useState<string | null>(null);

  // Generate
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("black and grey traditional");
  const [generating, setGenerating] = useState(false);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; limit: number } | null>(null);

  // Stencil
  const [threshold, setThreshold] = useState(60);
  const [blur, setBlur] = useState(1);
  const [stencilUrl, setStencilUrl] = useState<string | null>(null);

  // Warp
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgChanged, setBgChanged] = useState(false);
  const [warpedUrl, setWarpedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Save
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const saveProjectFn = useServerFn(saveProject);
  const loadProjectFn = useServerFn(loadProject);

  // Fabric canvas + hydration json
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [initialJson, setInitialJson] = useState<unknown>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const currentMode: "design" | "stencil" | "warp" = warpedUrl
    ? "warp"
    : stencilUrl
    ? "stencil"
    : "design";

  const openSaveDialog = () => {
    if (!designUrl) {
      toast.error("Nothing to save yet");
      return;
    }
    setSaveTitle(prompt.trim().slice(0, 80) || "Untitled Design");
    setSaveOpen(true);
  };

  const onConfirmSave = async () => {
    const imageData = warpedUrl ?? stencilUrl ?? designUrl;
    if (!imageData) return;
    const title = saveTitle.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const fabricJson = fabricRef.current ? fabricRef.current.toJSON() : null;
      const result = await saveProjectFn({
        data: {
          id: projectId ?? undefined,
          title: title.slice(0, 200),
          mode: currentMode,
          prompt: prompt || null,
          imageData,
          bodyImageData: bgUrl ?? null,
          bodyChanged: bgChanged,
          fabricJson,
        },
      });
      if (!projectId && result?.id) setProjectId(result.id);
      setBgChanged(false);
      toast.success("Saved to dashboard");
      setSaveOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Hydrate from existing project when /studio?id=...
  useEffect(() => {
    if (!user || !routeId || projectId === routeId) return;
    let cancelled = false;
    setLoadingProject(true);
    loadProjectFn({ data: { id: routeId } })
      .then((p) => {
        if (cancelled) return;
        setProjectId(p.id);
        setSaveTitle(p.title);
        setPrompt(p.prompt ?? "");
        setDesignUrl(p.designUrl);
        setBgUrl(p.bodyUrl);
        setBgChanged(false);
        setStencilUrl(null);
        setWarpedUrl(null);
        setInitialJson(p.fabricJson ?? null);
        setTab(p.mode === "warp" ? "warp" : p.mode === "stencil" ? "stencil" : "generate");
        toast.success(`Loaded "${p.title}"`);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => !cancelled && setLoadingProject(false));
    return () => {
      cancelled = true;
    };
  }, [user, routeId, projectId, loadProjectFn]);

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe the design first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: { prompt, style },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDesignUrl(data.imageUrl);
      setQuotaInfo({ used: data.used, limit: data.limit });
      setStencilUrl(null);
      toast.success(`Generated (${data.used}/${data.limit} this month)`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("limit")) {
        toast.error("Generation limit reached — upgrade for more.");
      } else {
        toast.error(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const onStencilize = async () => {
    if (!designUrl) return;
    try {
      const img = await loadImage(designUrl);
      const url = stencilize(img, { threshold, blurRadius: blur });
      setStencilUrl(url);
    } catch {
      toast.error("Stencilize failed");
    }
  };

  const onPickBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setBgUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onApplyWarp = async (corners: [Point, Point, Point, Point]) => {
    if (!bgUrl || !designUrl) return;
    try {
      const [bg, des] = await Promise.all([
        loadImage(bgUrl),
        loadImage(stencilUrl ?? designUrl),
      ]);
      const out = warpOntoBackground(bg, des, corners, 0.85);
      setWarpedUrl(out);
      toast.success("Warp applied");
    } catch {
      toast.error("Warp failed");
    }
  };

  const downloadAs = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-gradient-gold">AI Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate → stencilize → place on body.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {quotaInfo && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                {quotaInfo.used} / {quotaInfo.limit} this month
              </span>
            )}
            <Button onClick={openSaveDialog} disabled={saving || !designUrl} variant="outline">
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save to dashboard
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="generate">
              <Wand2 className="mr-1 h-4 w-4" /> Generate
            </TabsTrigger>
            <TabsTrigger value="stencil" disabled={!designUrl}>
              <ScanLine className="mr-1 h-4 w-4" /> Stencil
            </TabsTrigger>
            <TabsTrigger value="warp" disabled={!designUrl}>
              <Upload className="mr-1 h-4 w-4" /> Warp
            </TabsTrigger>
          </TabsList>

          {/* GENERATE */}
          <TabsContent value="generate" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
                <div>
                  <Label htmlFor="prompt">Describe your design</Label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                    placeholder="A koi fish with cherry blossoms, traditional Japanese style…"
                  />
                </div>
                <div>
                  <Label htmlFor="style">Style</Label>
                  <Input
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={onGenerate}
                  disabled={generating}
                  className="w-full bg-primary text-primary-foreground shadow-gold hover:opacity-90"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-4 w-4" /> Generate design
                    </>
                  )}
                </Button>
                {designUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadAs(designUrl, "design.png")}
                  >
                    <Download className="mr-1 h-4 w-4" /> Download
                  </Button>
                )}
              </div>
              <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-border/60 bg-card/50 p-4">
                {designUrl ? (
                  <FabricCanvas width={640} height={640} imageUrl={designUrl} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your generated design will appear here.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* STENCIL */}
          <TabsContent value="stencil" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="space-y-5 rounded-xl border border-border/60 bg-card p-5">
                <div>
                  <Label>Edge threshold: {threshold}</Label>
                  <Slider
                    value={[threshold]}
                    min={20}
                    max={200}
                    step={1}
                    onValueChange={(v) => setThreshold(v[0])}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Smoothing: {blur}</Label>
                  <Slider
                    value={[blur]}
                    min={0}
                    max={5}
                    step={1}
                    onValueChange={(v) => setBlur(v[0])}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={onStencilize}
                  className="w-full bg-primary text-primary-foreground shadow-gold hover:opacity-90"
                >
                  <ScanLine className="mr-1 h-4 w-4" /> Stencilize
                </Button>
                {stencilUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadAs(stencilUrl, "stencil.png")}
                  >
                    <Download className="mr-1 h-4 w-4" /> Download stencil
                  </Button>
                )}
              </div>
              <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-border/60 bg-white p-4">
                {stencilUrl ? (
                  <img src={stencilUrl} alt="Stencil" className="max-h-[60vh] object-contain" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Adjust threshold then hit Stencilize.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* WARP */}
          <TabsContent value="warp" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
                <div>
                  <Label>Body reference photo</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickBg}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" /> Upload photo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Drag the 4 corners over the body area to map the design with perspective.
                </p>
                {warpedUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadAs(warpedUrl, "preview.png")}
                  >
                    <Download className="mr-1 h-4 w-4" /> Download preview
                  </Button>
                )}
              </div>
              <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-border/60 bg-card/50 p-4">
                {warpedUrl ? (
                  <img src={warpedUrl} alt="Warped" className="max-h-[60vh] object-contain" />
                ) : bgUrl && designUrl ? (
                  <PerspectiveControls
                    bgUrl={bgUrl}
                    designUrl={stencilUrl ?? designUrl}
                    onWarp={onApplyWarp}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Upload a body reference photo to start.
                  </p>
                )}
                {warpedUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWarpedUrl(null)}
                    className="absolute"
                  >
                    Re-position
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to dashboard</DialogTitle>
            <DialogDescription>
              Saving the{" "}
              <span className="font-semibold uppercase tracking-wider text-primary">
                {currentMode}
              </span>{" "}
              output of your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="save-title">Project title</Label>
            <Input
              id="save-title"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              maxLength={200}
              placeholder="Untitled Design"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={onConfirmSave}
              disabled={saving || !saveTitle.trim()}
              className="bg-primary text-primary-foreground shadow-gold hover:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" /> Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
