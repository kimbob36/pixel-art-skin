// Perspective warp via 3x3 homography. Solves for the matrix mapping a unit
// rectangle (source image) to 4 destination corners, then renders pixel-by-pixel.

type Point = { x: number; y: number };

// Solve 8x8 linear system for projective transform from src (4 pts) -> dst (4 pts).
// Reference: standard projective transform derivation.
function solveHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }
  // Gaussian elimination
  const n = 8;
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[max][i])) max = k;
    }
    [A[i], A[max]] = [A[max], A[i]];
    [b[i], b[max]] = [b[max], b[i]];
    for (let k = i + 1; k < n; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) A[k][j] -= f * A[i][j];
      b[k] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return [...x, 1];
}

function invert3x3(m: number[]): number[] {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) throw new Error("Singular matrix");
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  return [A, D, G, B, E, H, C, F, I].map((v) => v / det);
}

function apply(m: number[], x: number, y: number): Point {
  const w = m[6] * x + m[7] * y + m[8];
  return {
    x: (m[0] * x + m[1] * y + m[2]) / w,
    y: (m[3] * x + m[4] * y + m[5]) / w,
  };
}

/**
 * Warp `design` onto `bg` so the design's 4 corners land at `corners` (in bg pixel space).
 * Returns a dataURL of the composite.
 */
export function warpOntoBackground(
  bg: HTMLImageElement,
  design: HTMLImageElement,
  corners: [Point, Point, Point, Point], // TL, TR, BR, BL in bg pixel coords
  opacity = 0.85,
): string {
  const W = bg.naturalWidth;
  const H = bg.naturalHeight;
  const dw = design.naturalWidth;
  const dh = design.naturalHeight;

  // Composite canvas with bg
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  octx.drawImage(bg, 0, 0);
  const outData = octx.getImageData(0, 0, W, H);

  // Sample the design
  const dc = document.createElement("canvas");
  dc.width = dw;
  dc.height = dh;
  const dctx = dc.getContext("2d", { willReadFrequently: true })!;
  dctx.drawImage(design, 0, 0);
  const dData = dctx.getImageData(0, 0, dw, dh).data;

  // Forward homography: design (0..dw, 0..dh) -> bg corners
  const src: Point[] = [
    { x: 0, y: 0 },
    { x: dw, y: 0 },
    { x: dw, y: dh },
    { x: 0, y: dh },
  ];
  const dst: Point[] = corners.map((p) => ({ x: p.x, y: p.y }));
  const Hm = solveHomography(src, dst);
  const Hinv = invert3x3(Hm);

  // Bounding box in bg space
  const xs = dst.map((p) => p.x);
  const ys = dst.map((p) => p.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...ys)));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const s = apply(Hinv, x, y);
      if (s.x < 0 || s.x >= dw - 1 || s.y < 0 || s.y >= dh - 1) continue;
      // Bilinear sample
      const x0 = Math.floor(s.x), y0 = Math.floor(s.y);
      const fx = s.x - x0, fy = s.y - y0;
      const i00 = (y0 * dw + x0) * 4;
      const i10 = (y0 * dw + x0 + 1) * 4;
      const i01 = ((y0 + 1) * dw + x0) * 4;
      const i11 = ((y0 + 1) * dw + x0 + 1) * 4;
      const out_i = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v =
          dData[i00 + ch] * (1 - fx) * (1 - fy) +
          dData[i10 + ch] * fx * (1 - fy) +
          dData[i01 + ch] * (1 - fx) * fy +
          dData[i11 + ch] * fx * fy;
        // Treat near-white as transparent (stencil-friendly)
        const isBg =
          dData[i00] > 240 && dData[i00 + 1] > 240 && dData[i00 + 2] > 240;
        if (isBg) continue;
        outData.data[out_i + ch] =
          outData.data[out_i + ch] * (1 - opacity) + v * opacity;
      }
    }
  }
  octx.putImageData(outData, 0, 0);
  return out.toDataURL("image/png");
}

export type { Point };
