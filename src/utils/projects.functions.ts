import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const SIGN_TTL = 60 * 60 * 24 * 365; // 1 year

const SaveSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  mode: z.enum(["design", "stencil", "warp"]),
  prompt: z.string().max(2000).optional().nullable(),
  // The "main" output image (warp/stencil/design) — data URL or remote URL
  imageData: z.string().min(8).max(20_000_000),
  // Optional body reference photo (data URL); upload only if present and changed
  bodyImageData: z.string().min(8).max(20_000_000).optional().nullable(),
  // Whether the body image is a fresh upload (true) or unchanged (false)
  bodyChanged: z.boolean().optional().default(false),
  // Fabric.js canvas state
  fabricJson: z.unknown().optional().nullable(),
});

const LoadSchema = z.object({ id: z.string().uuid() });

async function fetchAsBlob(src: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (src.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(src);
    if (!match) throw new Error("Invalid data URL");
    const contentType = match[1];
    const bin = atob(match[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, contentType };
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, contentType };
}

function extFor(contentType: string) {
  return contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
}

async function uploadAndSign(
  supabase: ReturnType<typeof Object>,
  bucket: "designs" | "body-references",
  userId: string,
  src: string,
): Promise<string> {
  // typed any to avoid re-exporting Supabase types
  const sb = supabase as any;
  const { bytes, contentType } = await fetchAsBlob(src);
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extFor(contentType)}`;
  const { error: upErr } = await sb.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const { data: signed, error: signErr } = await sb.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (signErr) throw new Error(`Sign URL failed: ${signErr.message}`);
  return signed.signedUrl as string;
}

// Extract the storage path (userId/filename) from a signed URL of a known bucket.
function pathFromSignedUrl(url: string, bucket: string): string | null {
  const m = new RegExp(`/object/sign/${bucket}/([^?]+)`).exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const designUrl = await uploadAndSign(supabase, "designs", userId, data.imageData);

    let bodyUrl: string | null | undefined = undefined;
    if (data.bodyImageData && data.bodyChanged) {
      bodyUrl = await uploadAndSign(supabase, "body-references", userId, data.bodyImageData);
    }

    const payload = {
      title: data.title,
      mode: data.mode,
      prompt: data.prompt ?? null,
      design_url: designUrl,
      fabric_json: (data.fabricJson ?? null) as Json,
      ...(bodyUrl !== undefined ? { body_reference_url: bodyUrl } : {}),
    };

    if (data.id) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(`Save failed: ${error.message}`);
      return { id: data.id, url: designUrl };
    }

    const { data: row, error } = await supabase
      .from("projects")
      .insert({ user_id: userId, ...payload })
      .select("id")
      .single();
    if (error) throw new Error(`Save failed: ${error.message}`);
    return { id: row.id, url: designUrl };
  });

export const loadProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => LoadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("projects")
      .select("id, title, mode, prompt, design_url, body_reference_url, fabric_json")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Project not found");

    // Re-sign URLs to ensure freshness
    const sb = supabase as any;
    let designUrl = row.design_url as string | null;
    if (designUrl) {
      const p = pathFromSignedUrl(designUrl, "designs");
      if (p) {
        const { data: s } = await sb.storage.from("designs").createSignedUrl(p, SIGN_TTL);
        if (s?.signedUrl) designUrl = s.signedUrl;
      }
    }
    let bodyUrl = row.body_reference_url as string | null;
    if (bodyUrl) {
      const p = pathFromSignedUrl(bodyUrl, "body-references");
      if (p) {
        const { data: s } = await sb.storage.from("body-references").createSignedUrl(p, SIGN_TTL);
        if (s?.signedUrl) bodyUrl = s.signedUrl;
      }
    }

    return {
      id: row.id as string,
      title: row.title as string,
      mode: row.mode as string,
      prompt: (row.prompt as string | null) ?? null,
      designUrl,
      bodyUrl,
      fabricJson: row.fabric_json as unknown,
    };
  });
