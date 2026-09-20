"use client";

/* eslint-disable @next/next/no-img-element -- favicon 与上传图标尺寸固定、数量多，走本地代理即可，
   用 next/image 反而要拉远端白名单并多一次优化往返，与「不为小图标加载大资源」相悖 */
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
  /** 图标底下要不要那层底板：应用类图标自带圆角外形，套上底板就成了大圆套小圆 */
  plate?: boolean;
  /**
   * 深色模式下把这张图标转成单色。图片类图标只能烘死一个颜色，黑图在深色主题下会看不见 ——
   * 开了这一档，浅色下照原样显示（品牌色/原色），深色下改成拿 SVG 的 alpha 当蒙版、
   * 颜色交给 `currentColor`，于是深色里它是浅的。两个主题各显示一份，CSS 切换，不用 JS。
   */
  mono?: boolean;
  /**
   * 图标在底板里怎么摆。取回来的图标有的顶格、有的四周留一圈透明边，同一个底板下
   * 就显得大小不一 —— 这一档决定按原样放、还是裁掉透明边/铺满。空值即默认（原样）。
   */
  fit?: IconFitId | null;
}

/** 四种摆法对应的 object-fit；自动裁边先按原样放，量出透明边之后再补一个 transform */
const FIT_CLASS: Record<IconFitId, string> = {
  contain: "object-contain",
  auto: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
};

interface IconGlyphProps {
  spec: IconSpec;
  title: string;
  /** favicon 的来源地址；条目图标与「未保存网址的预览」用的是不同接口 */
  faviconSrc: string;
  className?: string;
}

/**
 * 图标盒子的尺寸参数。图形大小按盒子算（容器查询单位），而不是各处再手写一个像素值 ——
 * 盒子换尺寸时图形跟着走，关掉底板时也不必再去改那一串变量。
 *
 * 「原样」这一档留一圈呼吸位：底板开着时图形占七成出头，关掉底板（只剩图形自己）时
 * 涨到接近满格，不然看着忽然小一圈。
 *
 * 另外三档的诉求就是**填满**，所以图形直接顶到盒子边 —— 早先这一档也留七成，
 * 于是选了「铺满」还是够不着板边：图里自带白底的应用类图标（比如 Excalidraw）
 * 内容本来就占满整张画布，再没有可裁的透明边，怎么算都差那一圈。
 */
export function iconBox(plate: boolean, fit: IconFitId = DEFAULT_ICON_FIT): React.CSSProperties {
  const glyph = fit === "contain" ? (plate ? "72cqh" : "88cqh") : "100cqh";
  return { containerType: "size", "--icon-glyph": glyph } as React.CSSProperties;
}

/**
 * 渲染一种图标。
 *
 * 图片类图标一律把首字母标记垫在底下，图片叠在上面：`onError` 要等 React 挂载后
 * 才生效，图片若在水合之前就失败，错误事件没人接、就会一直是个破图。
 * 垫一层托底就不再依赖事件，任何时刻取不到图都能看到首字母（设计文档 §16）。
 *
 * 三条状态：
 * - `pending` 图片还没定论，首字母与图片都在（图片通常是透明的，首字母可见）
 * - `ready`   真的取到了图标（宽高大于 1），这时必须把首字母收起来 ——
 *             否则像 Cloudflare 那种自带透明区域的图标会与首字母叠在一起
 * - `none`    取不到（加载失败，或服务端回的是 1×1 占位图），只留首字母
 */
export function IconGlyph({ spec, title, faviconSrc, className }: IconGlyphProps) {
  const [phase, setPhase] = useState<"pending" | "ready" | "none">("pending");
  /** 「自动裁边」量出来的缩放与平移；带上是哪张图，换图之后旧的那份就不作数了 */
  const [trim, setTrim] = useState<{ src: string; transform: FitTransform | null } | null>(null);

  const fit = spec.fit ?? DEFAULT_ICON_FIT;

  /**
   * 只靠 onLoad / onError 会漏：图片若在水合之前就已经加载完（本地接口很快、浏览器又缓存了），
   * 事件早已错过，回调永远不会跑，首字母就压不掉了。挂载时补看一次 `complete`。
   *
   * 「自动裁边」也在这里量：图片已经在手里了，画进一张 48×48 的画布数一遍不透明像素的
   * 范围即可 —— 另起一个 Image 再解码一遍是白费一次解码。
   */
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
          // Emoji 的字形比 em 框还大一圈（实测约 1.1 倍），照字号给会盖过图片类图标；
          // 退回九成，墨迹高度才和图片的一致
          "translate-y-px text-[length:calc(var(--icon-glyph,1.25rem)*0.9)] select-none",
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
    // 没有来源就一个请求都不发。选择器里网址还空着时把 faviconSrc 传空，
    // 否则会打出 /api/icons/resolve?url= 这种必然 400 的请求，控制台多一条红线。
    const src = spec.type === "upload" ? `/api/icons/file/${spec.value}` : faviconSrc;
    const hasSource = spec.type === "upload" ? Boolean(spec.value?.trim()) : Boolean(src.trim());
    if (!hasSource) return <LetterMark title={title} className={className} />;

    // 蒙版只对 SVG 有意义：位图的 alpha 是整个方块，蒙出来就是一块实心色
    const darkMono = spec.mono === true && /\.svg(\?|$)/i.test(src);
    // 非「原样」的档位会顶到盒子边：放大溢出的部分要裁掉，圆角跟着盒子走，
    // 否则满幅图片的方角会从底板的圆角外面透出来
    const applied = trim && trim.src === src ? trim.transform : null;
    const clipped = fit !== "contain";
    const transform = applied
      ? `scale(${applied.scale}) translate(${applied.x * 100}%, ${applied.y * 100}%)`
      : undefined;

    return (
      <span
        className={cn(
          "relative grid size-full place-items-center",
          clipped && "overflow-hidden rounded-[inherit]",
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
              "icon-lift relative size-[var(--icon-glyph,1.25rem)]",
              FIT_CLASS[fit],
              darkMono && "dark:hidden",
            )}
            style={transform ? { transform } : undefined}
            ref={decide}
            // 占位图是 1×1 的透明 PNG：它「加载成功」但没有内容，仍要露首字母
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

  // none，以及属于第二阶段（设计文档 §40）的 simple-icons / iconify：直接显示首字母，
  // 不假装可用，也不为此把整库图标打进首页包里
  return <LetterMark title={title} className={className} />;
}

/**
 * 深色里那份单色图标：拿 SVG 的 alpha 当蒙版，颜色用 `currentColor`（主题前景色）。
 * 图片只能走蒙版这一条路 —— `<img>` 里的 `currentColor` 不认页面的颜色。
 */
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
 * 量出图片里不透明像素的范围（图片自身的 0..1 坐标）。画进一张 48×48 的小画布数一遍就够：
 * 这一步只用来判断「四周有多少透明边」，不需要原图分辨率。
 *
 * 图片走的都是本站的代理或上传接口，同源，所以画布不会被污染；万一将来换成远端地址，
 * `getImageData` 会抛，这里按「量不出来」处理，退回原样显示。
 */
function measureAlphaBox(image: HTMLImageElement): AlphaBox | null {
  const side = 48;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  // 按 contain 摆进去，和元素里看到的位置一致，量出来的坐标才好跟 CSS 对上
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
      // 阈值给得低一点：半透明的投影也算「图的一部分」，不然会把带阴影的图标裁掉一块
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
        // 首字母的「墨」只有大写字高（约 0.72em），字号得比 --icon-glyph 小一档才不显得
        // 压过图片类图标：0.8 倍落到盒子的四成上下，比按 1 倍时的 45% 收敛一些
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
