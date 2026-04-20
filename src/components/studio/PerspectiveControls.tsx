import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/warp";

interface Props {
  bgUrl: string;
  designUrl: string;
  onWarp: (corners: [Point, Point, Point, Point]) => void;
}

/**
 * Displays the background photo with 4 draggable corner handles to define the
 * perspective quad where the design will be warped onto the body.
 */
export function PerspectiveControls({ bgUrl, designUrl, onWarp }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [corners, setCorners] = useState<[Point, Point, Point, Point] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Init handles to centered rectangle once image loads
  useEffect(() => {
    if (!size.w || !size.h) return;
    const w = size.w, h = size.h;
    setCorners([
      { x: w * 0.3, y: h * 0.3 },
      { x: w * 0.7, y: h * 0.3 },
      { x: w * 0.7, y: h * 0.7 },
      { x: w * 0.3, y: h * 0.7 },
    ]);
  }, [size.w, size.h]);

  const onLoad = () => {
    const img = imgRef.current!;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    const r = img.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (dragIdx === null || !corners || !wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const point = "touches" in e ? e.touches[0] : e;
      const x = Math.max(0, Math.min(size.w, point.clientX - r.left));
      const y = Math.max(0, Math.min(size.h, point.clientY - r.top));
      const next = [...corners] as [Point, Point, Point, Point];
      next[dragIdx] = { x, y };
      setCorners(next);
    };
    const onUp = () => setDragIdx(null);
    if (dragIdx !== null) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove);
      window.addEventListener("touchend", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragIdx, corners, size]);

  const apply = () => {
    if (!corners || !natural.w) return;
    const sx = natural.w / size.w;
    const sy = natural.h / size.h;
    onWarp([
      { x: corners[0].x * sx, y: corners[0].y * sy },
      { x: corners[1].x * sx, y: corners[1].y * sy },
      { x: corners[2].x * sx, y: corners[2].y * sy },
      { x: corners[3].x * sx, y: corners[3].y * sy },
    ]);
  };

  return (
    <div className="space-y-3">
      <div ref={wrapRef} className="relative inline-block">
        <img
          ref={imgRef}
          src={bgUrl}
          alt="Body reference"
          onLoad={onLoad}
          className="max-h-[60vh] rounded-lg border border-border/60 select-none"
          draggable={false}
        />
        {corners && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={size.w}
            height={size.h}
          >
            <polygon
              points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="hsl(var(--primary) / 0.15)"
              stroke="oklch(0.78 0.14 85)"
              strokeWidth={2}
            />
          </svg>
        )}
        {corners?.map((p, i) => (
          <div
            key={i}
            onMouseDown={() => setDragIdx(i)}
            onTouchStart={() => setDragIdx(i)}
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-primary bg-background active:cursor-grabbing"
            style={{ left: p.x, top: p.y }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <img src={designUrl} alt="Design" className="h-16 w-16 rounded border border-border/60 object-contain bg-white" />
        <button
          onClick={apply}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90"
        >
          Apply warp
        </button>
        <p className="text-xs text-muted-foreground">Drag the 4 corners to fit the body area.</p>
      </div>
    </div>
  );
}
