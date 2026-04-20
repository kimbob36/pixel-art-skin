import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["design", "stencil", "warp"]),
  prompt: z.string().max(2000).optional().nullable(),
  // Either a data URL (data:image/...;base64,...) or an https URL
  imageData: z.string().min(8).max(20_000_000),
});

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

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { bytes, contentType } = await fetchAsBlob(data.imageData);
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("designs")
      .upload(path, bytes, { contentType, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabase.storage
      .from("designs")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr) throw new Error(`Sign URL failed: ${signErr.message}`);

    const { data: row, error: insErr } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title: data.title,
        mode: data.mode,
        prompt: data.prompt ?? null,
        design_url: signed.signedUrl,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(`Save failed: ${insErr.message}`);

    return { id: row.id, url: signed.signedUrl };
  });
