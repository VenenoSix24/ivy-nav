"use client";

/* eslint-disable @next/next/no-img-element -- favicon 与上传图标尺寸固定、数量多，走本地代理即可，
   用 next/image 反而要拉远端白名单并多一次优化往返，与「不为小图标加载大资源」相悖 */
import { createElement, useState } from "react";
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
 */
export function IconGlyph({ spec, title, faviconSrc, className }: IconGlyphProps) {
  const [failed, setFailed] = useState(false);

  if (spec.type === "emoji") {
    return <span className={cn("translate-y-px select-none", className)}>{spec.value}</span>;
  }

  if (spec.type === "lucide") {
    // 图标来自运行时查表，用 createElement 渲染，避免在 render 期间动态构造组件
    const Icon = getLucideIcon(spec.value);
    if (!Icon) return <LetterMark title={title} className={className} />;
    return createElement(Icon, { className: cn("text-foreground size-5", className) });
  }

  if (spec.type === "upload" || spec.type === "favicon") {
    const src = spec.type === "upload" ? `/api/icons/file/${spec.value}` : faviconSrc;
    const hasSource = spec.type === "favicon" || Boolean(spec.value?.trim());
    if (!hasSource) return <LetterMark title={title} className={className} />;

    return (
      <span className={cn("relative grid size-full place-items-center", className)}>
        <LetterMark title={title} className="absolute inset-0 grid place-items-center" />
        {failed ? null : (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="relative size-5 object-contain"
            onError={() => setFailed(true)}
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
        "text-accent-foreground grid place-items-center text-[15px] font-semibold",
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
