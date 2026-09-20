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
}

interface IconGlyphProps {
  spec: IconSpec;
  title: string;
  /** favicon 的来源地址；条目图标与「未保存网址的预览」用的是不同接口 */
  faviconSrc: string;
  className?: string;
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
    return <span className={cn("translate-y-px select-none", className)}>{spec.value}</span>;
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

    return (
      <span className={cn("relative grid size-full place-items-center", className)}>
        {phase === "ready" ? null : (
          <LetterMark title={title} className="absolute inset-0 grid place-items-center" />
        )}
        {phase === "none" ? null : (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="relative size-[var(--icon-glyph,1.25rem)] object-contain"
            ref={decide}
            // 占位图是 1×1 的透明 PNG：它「加载成功」但没有内容，仍要露首字母
            onLoad={(event) => decide(event.currentTarget)}
            onError={() => setPhase("none")}
          />
        )}
      </span>
    );
  }

  // none，以及属于第二阶段（设计文档 §40）的 simple-icons / iconify：直接显示首字母，
  // 不假装可用，也不为此把整库图标打进首页包里
  return <LetterMark title={title} className={className} />;
}

function LetterMark({ title, className }: { title: string; className?: string }) {
  return (
    <span
      className={cn(
        // 跟着图标图形走：默认 1.25rem × 0.75 = 15px，与之前一致
        "text-accent-foreground grid place-items-center text-[calc(var(--icon-glyph,1.25rem)*0.75)] font-semibold",
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

export function itemFaviconSrc(itemId: number): string {
  return `/api/icons/favicon?item=${itemId}`;
}

export function previewFaviconSrc(url: string): string {
  return `/api/icons/resolve?url=${encodeURIComponent(url)}`;
}
