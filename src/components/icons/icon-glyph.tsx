"use client";

/* eslint-disable @next/next/no-img-element -- 图标尺寸固定、数量多，走本地代理即可，
   用 next/image 要拉远端白名单并多一次优化往返 */
import { createElement, useCallback, useState } from "react";
import { cn } from "cn";
import type { IconType } from "@/db/schema";
import { getLucideIcon } from "@/components/icons/lucide-registry";
import {
  DEFAULT_ICON_FIT,
  trimTransform,
  type AlphaBox,
  type FitTransform,
  type IconFitId,
} from "@/lib/icons/fit";

export interface IconSpec {
  type: IconType;
  value: string | null;
  /** 图标底下要不要那层图标遮罩 */
  plate?: boolean;
  /** 深色下把 SVG 当蒙版，颜色交给 currentColor */
  mono?: boolean;
  /** 图标在图标遮罩里怎么摆；空值即默认（原样） */
  fit?: IconFitId | null;
}

/** 这个图标有没有图标遮罩；Emoji 一律没有 */
export function usesPlate(spec: IconSpec): boolean {
  return spec.type !== "emoji" && spec.plate !== false;
}

/** 四种摆法对应的 object-fit */
const FIT_CLASS: Record<IconFitId, string> = {
  contain: "object-contain",
  auto: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
};

interface IconGlyphProps {
  spec: IconSpec;
  title: string;
  /** favicon 来源地址 */
  faviconSrc: string;
  className?: string;
}

/** 图标盒子的尺寸参数：图形大小按容器单位算 */
export function iconBox(plate: boolean, fit: IconFitId = DEFAULT_ICON_FIT): React.CSSProperties {
  const glyph = fit === "contain" ? (plate ? "72cqh" : "88cqh") : "100cqh";
  return { containerType: "size", "--icon-glyph": glyph } as React.CSSProperties;
}

/** 渲染一种图标 */
export function IconGlyph({ spec, title, faviconSrc, className }: IconGlyphProps) {
  const [phase, setPhase] = useState<"pending" | "ready" | "none">("pending");
  /** 「自动裁边」量出来的缩放与平移，带来源 */
  const [trim, setTrim] = useState<{ src: string; transform: FitTransform | null } | null>(null);

  const fit = spec.fit ?? DEFAULT_ICON_FIT;

  /** 挂载时补看一次加载状态，并在这里量「自动裁边」 */
  const decide = useCallback((image: HTMLImageElement | null) => {
    if (!image || !image.complete) return;
    const ready = image.naturalWidth > 1 && image.naturalHeight > 1;
    setPhase((current) => (current === "pending" ? (ready ? "ready" : "none") : current));
    if (!ready) return;

    const transform = trimTransform(
      measureAlphaBox(image),
      image.naturalWidth / image.naturalHeight,
    );
    setTrim({ src: image.src, transform });
  }, []);

  if (spec.type === "emoji") {
    return (
      <span
        className={cn(
          "flex size-full items-center justify-center leading-none select-none",
          "text-[length:calc(var(--icon-glyph,1.25rem)*0.8)]",
          "icon-lift",
          className,
        )}
      >
        {spec.value}
      </span>
    );
  }

  if (spec.type === "lucide") {
    const Icon = getLucideIcon(spec.value);
    if (!Icon) return <LetterMark title={title} className={className} />;
    return createElement(Icon, {
      className: cn("text-foreground size-[var(--icon-glyph,1.25rem)]", className),
    });
  }

  if (spec.type === "upload" || spec.type === "favicon") {
    const src = spec.type === "upload" ? `/api/icons/file/${spec.value}` : faviconSrc;
    const hasSource = spec.type === "upload" ? Boolean(spec.value?.trim()) : Boolean(src.trim());
    if (!hasSource) return <LetterMark title={title} className={className} />;

    const darkMono = spec.mono === true && /\.svg(\?|$)/i.test(src);
    const applied = trim && trim.src === src ? trim.transform : null;
    const clipped = fit !== "contain";
    const transform = applied
      ? `scale(${applied.scale}) translate(${applied.x * 100}%, ${applied.y * 100}%)`
      : undefined;

    const lift = !usesPlate(spec);

    return (
      <span
        className={cn(
          "relative grid size-full place-items-center",
          clipped && "overflow-hidden rounded-[inherit]",
          lift && "icon-lift",
          className,
        )}
      >
        {phase === "ready" ? null : (
          <LetterMark
            title={title}
            className={cn("absolute inset-0 grid place-items-center", darkMono && "dark:hidden")}
          />
        )}
        {phase === "none" ? null : (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              "relative size-[var(--icon-glyph,1.25rem)]",
              FIT_CLASS[fit],
              darkMono && "dark:hidden",
            )}
            style={transform ? { transform } : undefined}
            ref={decide}
            onLoad={(event) => decide(event.currentTarget)}
            onError={() => setPhase("none")}
          />
        )}
        {darkMono ? (
          <MaskGlyph src={src} transform={transform} className="hidden dark:block" />
        ) : null}
      </span>
    );
  }

  // none，以及尚未开放的图标来源：直接显示首字母
  return <LetterMark title={title} className={className} />;
}

/** 深色里那份单色图标：拿 SVG 的 alpha 当蒙版，颜色用 currentColor */
function MaskGlyph({
  src,
  transform,
  className,
}: {
  src: string;
  transform?: string;
  className?: string;
}) {
  const mask = {
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
  } as React.CSSProperties;

  return (
    <span
      aria-hidden
      className={cn("size-[var(--icon-glyph,1.25rem)] bg-current", className)}
      style={transform ? { ...mask, transform } : mask}
    />
  );
}

/** 量出不透明像素的范围（图片自身的 0..1 坐标） */
function measureAlphaBox(image: HTMLImageElement): AlphaBox | null {
  const side = 96;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const scale = side / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const originX = (side - width) / 2;
  const originY = (side - height) / 2;

  let pixels: Uint8ClampedArray;
  try {
    context.clearRect(0, 0, side, side);
    context.drawImage(image, originX, originY, width, height);
    pixels = context.getImageData(0, 0, side, side).data;
  } catch {
    return null;
  }

  let minX = side;
  let minY = side;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      if (pixels[(y * side + x) * 4 + 3]! > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;

  return {
    x0: (minX - originX) / width,
    y0: (minY - originY) / height,
    x1: (maxX + 1 - originX) / width,
    y1: (maxY + 1 - originY) / height,
  };
}

function LetterMark({ title, className }: { title: string; className?: string }) {
  return (
    <span
      className={cn(
        "text-accent-foreground grid place-items-center text-[length:calc(var(--icon-glyph,1.25rem)*0.8)] font-semibold",
        className,
      )}
    >
      {firstLetter(title)}
    </span>
  );
}

export function firstLetter(title: string): string {
  const trimmed = title.trim();
  return trimmed ? Array.from(trimmed)[0]!.toUpperCase() : "?";
}
