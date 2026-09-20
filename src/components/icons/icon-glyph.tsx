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
  /** 深色下把 SVG 当蒙版、颜色交给 currentColor，黑图在深色主题里才不会消失 */
  mono?: boolean;
  /** 图标在图标遮罩里怎么摆；空值即默认（原样） */
  fit?: IconFitId | null;
}

/**
 * 这个图标有没有图标遮罩。Emoji 一律没有：它自己就是一块彩色图案，垫板只是多余的一圈。
 * 判断只写在这里一处，卡片、选择器预览与那个开关都读它。
 */
export function usesPlate(spec: IconSpec): boolean {
  return spec.type !== "emoji" && spec.plate !== false;
}

/** 四种摆法对应的 object-fit；自动裁边先按原样放，量出透明边之后补一个 transform */
const FIT_CLASS: Record<IconFitId, string> = {
  contain: "object-contain",
  auto: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
};

interface IconGlyphProps {
  spec: IconSpec;
  title: string;
  /** favicon 来源地址；条目图标与「未保存网址的预览」用的是不同接口 */
  faviconSrc: string;
  className?: string;
}

/**
 * 图标盒子的尺寸参数：图形大小按容器单位算，盒子换尺寸时图形跟着走。
 * 「原样」留一圈呼吸位（开遮罩 72%、关掉 88%），另外三档要的就是填满，直接 100% ——
 * 早先填满那三档也留七成，自带白底的应用类图标够不着板边。
 */
export function iconBox(plate: boolean, fit: IconFitId = DEFAULT_ICON_FIT): React.CSSProperties {
  const glyph = fit === "contain" ? (plate ? "72cqh" : "88cqh") : "100cqh";
  return { containerType: "size", "--icon-glyph": glyph } as React.CSSProperties;
}

/**
 * 渲染一种图标。图片类图标一律把首字母垫在底下 —— `onError` 要等 React 挂载后才生效，
 * 图片若在水合之前就失败，错误事件没人接，就会一直是个破图。
 *
 * 三条状态：`pending` 图片还没定论（首字母与图片都在）、`ready` 真取到了图标（收起首字母，
 * 否则自带透明区域的图标会与首字母叠在一起）、`none` 取不到（只留首字母）。
 */
export function IconGlyph({ spec, title, faviconSrc, className }: IconGlyphProps) {
  const [phase, setPhase] = useState<"pending" | "ready" | "none">("pending");
  /** 「自动裁边」量出来的缩放与平移；带上来源，换图之后旧的那份不作数 */
  const [trim, setTrim] = useState<{ src: string; transform: FitTransform | null } | null>(null);

  const fit = spec.fit ?? DEFAULT_ICON_FIT;

  /** 挂载时补看一次：图片若在水合之前就加载完（本地接口很快），事件早已错过。
   *  「自动裁边」也在这里量 —— 图片已经在手里，另起一个 Image 是白费一次解码。 */
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
          // 各家 emoji 字体把图案摆在字框里的位置不一致，逐个去量不值当：按行内盒居中，
          // 字号比图片类小一档（emoji 的墨迹本来就比字框大一圈）
          "flex size-full items-center justify-center leading-none select-none",
          "text-[length:calc(var(--icon-glyph,1.25rem)*0.8)]",
          // emoji 一律没有图标遮罩，影子总是跟着图案走
          "icon-lift",
          className,
        )}
      >
        {spec.value}
      </span>
    );
  }

  if (spec.type === "lucide") {
    // 图标来自运行时查表，用 createElement 渲染，避免在 render 期间动态构造组件
    const Icon = getLucideIcon(spec.value);
    if (!Icon) return <LetterMark title={title} className={className} />;
    return createElement(Icon, {
      className: cn("text-foreground size-[var(--icon-glyph,1.25rem)]", className),
    });
  }

  if (spec.type === "upload" || spec.type === "favicon") {
    // 没有来源就不发请求：选择器里网址还空着时传空，否则会打出必然 400 的请求
    const src = spec.type === "upload" ? `/api/icons/file/${spec.value}` : faviconSrc;
    const hasSource = spec.type === "upload" ? Boolean(spec.value?.trim()) : Boolean(src.trim());
    if (!hasSource) return <LetterMark title={title} className={className} />;

    // 蒙版只对 SVG 有意义：位图的 alpha 是整个方块，蒙出来是一块实心色
    const darkMono = spec.mono === true && /\.svg(\?|$)/i.test(src);
    const applied = trim && trim.src === src ? trim.transform : null;
    // 非「原样」的档位会顶到盒子边，放大溢出的部分要裁掉，圆角跟着盒子走
    const clipped = fit !== "contain";
    const transform = applied
      ? `scale(${applied.scale}) translate(${applied.x * 100}%, ${applied.y * 100}%)`
      : undefined;

    // 没有图标遮罩时这层方框没有面，影子加在它身上会变成一块悬在背后的灰方块，
    // 所以改加在图形这一层，让它跟着图案轮廓走
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
            // 占位图是 1×1 的透明 PNG：加载成功但没有内容，仍要露首字母
            onLoad={(event) => decide(event.currentTarget)}
            onError={() => setPhase("none")}
          />
        )}
        {/* 深色那一份：同一张 SVG 当蒙版，形状照旧、颜色交给主题 */}
        {darkMono ? (
          <MaskGlyph src={src} transform={transform} className="hidden dark:block" />
        ) : null}
      </span>
    );
  }

  // none，以及属于第二阶段（设计文档 §40）的 simple-icons / iconify：直接显示首字母
  return <LetterMark title={title} className={className} />;
}

/** 深色里那份单色图标：拿 SVG 的 alpha 当蒙版，颜色用 currentColor（主题前景色）。
 *  图片只能走蒙版 —— `<img>` 里的 `currentColor` 不认页面颜色。 */
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

/**
 * 量出不透明像素的范围（图片自身的 0..1 坐标）。图片走本站代理，同源，画布读得出来；
 * 换成远端地址 `getImageData` 会抛，按「量不出来」处理，退回原样。
 */
function measureAlphaBox(image: HTMLImageElement): AlphaBox | null {
  // 96 而不是 48：48 时一个像素就是整幅的 2%，量化误差正好留下一圈「一点点边距」
  const side = 96;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  // 按 contain 摆进去，与元素里看到的位置一致，量出来的坐标才好跟 CSS 对上
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
      // 阈值给得低：半透明的投影也算图的一部分，不然会把带阴影的图标裁掉一块
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
        // 首字母的墨只有大写字高（约 0.72em），字号要比 --icon-glyph 小一档
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
