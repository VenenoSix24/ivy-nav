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
 * 渲染一种图标。任何一种取不到时回落到首字母标记，
 * 而不是在页面上留一个破图（设计文档 §16）。
 */
export function IconGlyph({ spec, title, faviconSrc, className }: IconGlyphProps) {
  const [failed, setFailed] = useState(false);

  if (failed || spec.type === "none" || !hasValue(spec)) {
    return <LetterMark title={title} className={className} />;
  }

  switch (spec.type) {
    case "emoji":
      return <span className={cn("translate-y-px select-none", className)}>{spec.value}</span>;

    case "lucide": {
      // 图标来自运行时查表，用 createElement 渲染，避免在 render 期间动态构造组件
      const Icon = getLucideIcon(spec.value);
      if (!Icon) return <LetterMark title={title} className={className} />;
      return createElement(Icon, { className: cn("text-foreground size-5", className) });
    }

    case "upload":
      return (
        <img
          src={`/api/icons/file/${spec.value}`}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("size-5 object-contain", className)}
          onError={() => setFailed(true)}
        />
      );

    case "favicon":
      return (
        <img
          src={faviconSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("size-5 object-contain", className)}
          onError={() => setFailed(true)}
        />
      );

    // simple-icons 与 iconify 属于第二阶段（设计文档 §40）：现在回落首字母标记，
    // 不假装可用，也不为此把整库图标打进首页包里
    case "simple-icons":
    case "iconify":
    default:
      return <LetterMark title={title} className={className} />;
  }
}

function LetterMark({ title, className }: { title: string; className?: string }) {
  return (
    <span className={cn("text-accent-foreground text-[15px] font-semibold", className)}>
      {firstLetter(title)}
    </span>
  );
}

function hasValue(spec: IconSpec): boolean {
  if (spec.type === "favicon" || spec.type === "none") return true;
  return Boolean(spec.value && spec.value.trim());
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
