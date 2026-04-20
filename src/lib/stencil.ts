// Sobel edge-detection stencilizer. Pure JS, runs on a 2D canvas.
// Input: HTMLImageElement. Output: dataURL of a clean B&W stencil.
export interface StencilOptions {
  threshold?: number; // 0-255, edges below become white
  blurRadius?: number; // box blur passes
  invert?: boolean;
}

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    out[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return out;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return src;
  const out = new Float32Array(src.length);
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0,
        count = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) {
          sum += src[y * w + xx];
          count++;
        }
      }
      out[y * w + x] = sum / count;
    }
  }
  // Vertical
  const out2 = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0,
        count = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) {
          sum += out[yy * w + x];
          count++;
        }
      }
      out2[y * w + x] = sum / count;
    }
  }
  return out2;
}

export function stencilize(
  img: HTMLImageElement,
  opts: StencilOptions = {},
): string {
  const { threshold = 60, blurRadius = 1, invert = false } = opts;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const gray = boxBlur(toGrayscale(imgData.data), w, h, blurRadius);

  // Sobel kernels
  const out = new Uint8ClampedArray(imgData.data.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] +
        gray[i - w + 1] -
        2 * gray[i - 1] +
        2 * gray[i + 1] -
        gray[i + w - 1] +
        gray[i + w + 1];
      const gy =
        -gray[i - w - 1] -
        2 * gray[i - w] -
        gray[i - w + 1] +
        gray[i + w - 1] +
        2 * gray[i + w] +
        gray[i + w + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      const edge = mag > threshold;
      const v = invert ? (edge ? 0 : 255) : edge ? 255 : 0;
      // Stencil convention: black lines on white → !invert flips this
      const pixel = invert ? v : 255 - v;
      const o = i * 4;
      out[o] = out[o + 1] = out[o + 2] = pixel;
      out[o + 3] = 255;
    }
  }
  // White borders
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = 255;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return c.toDataURL("image/png");
}
