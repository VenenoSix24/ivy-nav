"use client";

/* eslint-disable @next/next/no-img-element -- favicon 与上传图标尺寸固定、数量多，走本地代理即可，
   用 next/image 反而要拉远端白名单并多一次优化往返，与「不为小图标加载大资源」相悖 */
import { createElement, useCallback, useState } from "react";
import { cn } from "cn";
import type { IconType } from "@/db/schema";
import { getLucideIcon } from "@/components/icons/lucide-registry";

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
}

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
 * 底板开着时图形占六成出头：底板本身就是一块视觉上的「形」，图形再大半圈就顶格了。
 * 关掉底板后只剩图形自己，还按六成给就会显得很小 —— 所以让它涨到接近满格。
 */
export function iconBox(plate: boolean): React.CSSProperties {
  return {
    containerType: "size",
    "--icon-glyph": plate ? "62cqh" : "88cqh",
  } as React.CSSProperties;
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

  /**
   * 只靠 onLoad / onError 会漏：图片若在水合之前就已经加载完（本地接口很快、浏览器又缓存了），
   * 事件早已错过，回调永远不会跑，首字母就压不掉了。挂载时补看一次 `complete`。
   */
  const decide = useCallback((image: HTMLImageElement | null) => {
    if (!image || !image.complete) return;
    const ready = image.naturalWidth > 1 && image.naturalHeight > 1;
    setPhase((current) => (current === "pending" ? (ready ? "ready" : "none") : current));
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

    return (
      <span className={cn("relative grid size-full place-items-center", className)}>
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
              "relative size-[var(--icon-glyph,1.25rem)] object-contain",
              darkMono && "dark:hidden",
            )}
            ref={decide}
            // 占位图是 1×1 的透明 PNG：它「加载成功」但没有内容，仍要露首字母
            onLoad={(event) => decide(event.currentTarget)}
            onError={() => setPhase("none")}
          />
        )}
        {/* 深色那一份：同一张 SVG 当蒙版，形状照旧、颜色交给主题 */}
        {darkMono ? <MaskGlyph src={src} className="hidden dark:block" /> : null}
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
function MaskGlyph({ src, className }: { src: string; className?: string }) {
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
      style={mask}
    />
  );
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
