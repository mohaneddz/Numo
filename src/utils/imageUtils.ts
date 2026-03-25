import type { ImageSearchResult } from "./webSearch";

export interface ImageFilterOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  formats?: string[];
  domainAllowList?: string[];
}

export interface ResizeImageOptions {
  width: number;
  height: number;
  fit?: "cover" | "contain" | "fill";
  mimeType?: string;
  quality?: number;
}

export interface CropImageOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  mimeType?: string;
  quality?: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain";
  mimeType?: string;
  quality?: number;
}

type CanvasSource = string | Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function clampQuality(quality?: number): number {
  if (!Number.isFinite(quality)) {
    return 0.92;
  }
  return Math.max(0, Math.min(1, quality as number));
}

function normalizeMimeType(mimeType?: string): string {
  if (!mimeType) {
    return "image/jpeg";
  }
  if (mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/jpeg") {
    return mimeType;
  }
  return "image/jpeg";
}

function parseHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function drawWithFit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  outWidth: number,
  outHeight: number,
  fit: "cover" | "contain" | "fill",
): void {
  if (fit === "fill") {
    ctx.drawImage(image, 0, 0, outWidth, outHeight);
    return;
  }

  const srcRatio = srcWidth / srcHeight;
  const outRatio = outWidth / outHeight;

  if (fit === "cover") {
    let drawWidth = srcWidth;
    let drawHeight = srcHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (srcRatio > outRatio) {
      drawWidth = srcHeight * outRatio;
      offsetX = (srcWidth - drawWidth) / 2;
    } else {
      drawHeight = srcWidth / outRatio;
      offsetY = (srcHeight - drawHeight) / 2;
    }

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight, 0, 0, outWidth, outHeight);
    return;
  }

  const scale = Math.min(outWidth / srcWidth, outHeight / srcHeight);
  const renderWidth = srcWidth * scale;
  const renderHeight = srcHeight * scale;
  const x = (outWidth - renderWidth) / 2;
  const y = (outHeight - renderHeight) / 2;

  ctx.drawImage(image, x, y, renderWidth, renderHeight);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType?: string, quality?: number): Promise<Blob> {
  const outputType = normalizeMimeType(mimeType);
  const outputQuality = clampQuality(quality);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob from canvas."));
          return;
        }
        resolve(blob);
      },
      outputType,
      outputQuality,
    );
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function toCanvasImageSource(source: CanvasSource): Promise<{
  image: CanvasImageSource;
  width: number;
  height: number;
}> {
  if (typeof source === "string") {
    const img = await loadImageElement(source);
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  }

  if (source instanceof HTMLImageElement) {
    return {
      image: source,
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }

  if (source instanceof HTMLCanvasElement) {
    return {
      image: source,
      width: source.width,
      height: source.height,
    };
  }

  if (source instanceof ImageBitmap) {
    return {
      image: source,
      width: source.width,
      height: source.height,
    };
  }

  if (source instanceof Blob) {
    const bitmap = await createImageBitmap(source);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
    };
  }

  throw new Error("Unsupported image source.");
}

export function filter_images(images: ImageSearchResult[], options: ImageFilterOptions = {}): ImageSearchResult[] {
  const formats = options.formats?.map((format) => format.toLowerCase());

  return images.filter((image) => {
    const width = image.image.width ?? 0;
    const height = image.image.height ?? 0;
    const format = (image.image.format || "").toLowerCase();

    if (options.minWidth && width < options.minWidth) {
      return false;
    }
    if (options.minHeight && height < options.minHeight) {
      return false;
    }
    if (options.maxWidth && width > options.maxWidth) {
      return false;
    }
    if (options.maxHeight && height > options.maxHeight) {
      return false;
    }
    if (formats && formats.length > 0 && !formats.some((f) => format.includes(f))) {
      return false;
    }

    if (options.domainAllowList && options.domainAllowList.length > 0) {
      const host = parseHostname(image.url);
      if (!options.domainAllowList.some((domain) => host.endsWith(domain.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}

export async function resize_image(source: CanvasSource, options: ResizeImageOptions): Promise<Blob> {
  const { image, width: srcWidth, height: srcHeight } = await toCanvasImageSource(source);
  const fit = options.fit || "cover";
  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  drawWithFit(ctx, image, srcWidth, srcHeight, canvas.width, canvas.height, fit);
  return canvasToBlob(canvas, options.mimeType, options.quality);
}

export async function crop_image(source: CanvasSource, options: CropImageOptions): Promise<Blob> {
  const { image, width: srcWidth, height: srcHeight } = await toCanvasImageSource(source);
  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  const sx = Math.max(0, Math.min(options.x, srcWidth - 1));
  const sy = Math.max(0, Math.min(options.y, srcHeight - 1));
  const sw = Math.max(1, Math.min(options.width, srcWidth - sx));
  const sh = Math.max(1, Math.min(options.height, srcHeight - sy));

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, options.mimeType, options.quality);
}

export async function extract_thumbnail(source: CanvasSource, options: ThumbnailOptions = {}): Promise<Blob> {
  const width = options.width ?? 320;
  const height = options.height ?? 180;

  return resize_image(source, {
    width,
    height,
    fit: options.fit || "cover",
    mimeType: options.mimeType || "image/jpeg",
    quality: options.quality ?? 0.86,
  });
}

export async function get_image_dimensions(source: CanvasSource): Promise<{ width: number; height: number }> {
  const { width, height } = await toCanvasImageSource(source);
  return { width, height };
}

// camelCase aliases for codebases that prefer JS naming conventions
export const filterImages = filter_images;
export const resizeImage = resize_image;
export const cropImage = crop_image;
export const extractThumbnail = extract_thumbnail;
export const getImageDimensions = get_image_dimensions;
