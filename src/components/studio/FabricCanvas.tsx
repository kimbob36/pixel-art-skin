import { useEffect, useRef } from "react";
import * as fabric from "fabric";

interface Props {
  width: number;
  height: number;
  imageUrl?: string | null;
  /** If provided, hydrate canvas from this Fabric.js JSON instead of imageUrl. */
  initialJson?: unknown;
  onReady?: (canvas: fabric.Canvas) => void;
}

/**
 * Fabric.js canvas. Loads either a single image (imageUrl) or a full saved
 * scene (initialJson). initialJson takes precedence when provided.
 */
export function FabricCanvas({ width, height, imageUrl, initialJson, onReady }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = new fabric.Canvas(ref.current, {
      width,
      height,
      backgroundColor: "#0a0a0a",
      preserveObjectStacking: true,
    });
    fcRef.current = c;
    onReady?.(c);
    return () => {
      c.dispose();
      fcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;
    c.setDimensions({ width, height });
    c.renderAll();
  }, [width, height]);

  useEffect(() => {
    const c = fcRef.current;
    if (!c) return;
    let cancelled = false;

    if (initialJson) {
      const key = `json:${JSON.stringify(initialJson).slice(0, 64)}`;
      if (hydratedKeyRef.current === key) return;
      hydratedKeyRef.current = key;
      c.loadFromJSON(initialJson as fabric.SerializedCanvasJSONOptions, () => {
        if (cancelled) return;
        c.backgroundColor = "#0a0a0a";
        c.renderAll();
      });
      return () => {
        cancelled = true;
      };
    }

    if (!imageUrl) return;
    const key = `url:${imageUrl}`;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;

    fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img) => {
      if (cancelled || !c) return;
      c.clear();
      c.backgroundColor = "#0a0a0a";
      const scale = Math.min((width * 0.9) / img.width!, (height * 0.9) / img.height!);
      img.scale(scale);
      img.set({
        left: (width - img.width! * scale) / 2,
        top: (height - img.height! * scale) / 2,
      });
      c.add(img);
      c.setActiveObject(img);
      c.renderAll();
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, initialJson, width, height]);

  return <canvas ref={ref} className="rounded-lg border border-border/60" />;
}
