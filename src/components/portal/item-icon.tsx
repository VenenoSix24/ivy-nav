"use client";

/* eslint-disable @next/next/no-img-element -- favicon 与上传图标尺寸固定、数量多，走本地代理即可，
   用 next/image 反而要拉远端白名单并多一次优化往返，与「不为小图标加载大资源」相悖 */
import { createElement, useState } from "react";
import { cn } from "cn";
import type { IconType } from "@/db/schema";
import { getLucideIcon } from "@/components/icons/lucide-registry";

interface ItemIconProps {
  type: IconType;
  value: string | null;
  title: string;
  url: string;
  className?: string;
  iconClassName?: string;
}

/**
 * 图标盒子。任何一种图标取不到时回落到首字母标记，而不是留一个破图（设计文档 §16）。
 */
export function ItemIcon({ type, value, title, url, className, iconClassName }: ItemIconProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      aria-hidden
      className={cn(
        "border-hairline bg-glass-strong inline-grid size-11 shrink-0 place-items-center rounded-lg border text-[20px] leading-none",
        className,
      )}
    >
      <IconContent
        type={type}
        value={value}
        title={title}
        url={url}
        failed={failed}
        onFail={() => setFailed(true)}
        iconClassName={iconClassName}
      />
    </span>
  );
}

function IconContent({
  type,
  value,
  title,
  url,
  failed,
  onFail,
  iconClassName,
}: ItemIconProps & { failed: boolean; onFail: () => void }) {
  if (failed || type === "none" || !hasValueFor(type, value)) {
    return <LetterMark title={title} className={iconClassName} />;
  }

  switch (type) {
    case "emoji":
      return <span className="translate-y-px select-none">{value}</span>;

    case "lucide": {
      // 图标来自运行时查表，用 createElement 渲染，避免在 render 期间动态构造组件
      const Icon = getLucideIcon(value);
      if (!Icon) return <LetterMark title={title} className={iconClassName} />;
      return createElement(Icon, { className: cn("text-foreground size-5", iconClassName) });
    }

    case "upload":
      return (
        <img
          src={value ?? ""}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("size-5 object-contain", iconClassName)}
          onError={onFail}
        />
      );

    case "favicon":
    case "simple-icons":
    case "iconify":
    default:
      return (
        <img
          src={`/api/icons/favicon?url=${encodeURIComponent(url)}`}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("size-5 object-contain", iconClassName)}
          onError={onFail}
        />
      );
  }
}

function LetterMark({ title, className }: { title: string; className?: string }) {
  return (
    <span className={cn("text-accent-foreground text-[15px] font-semibold", className)}>
      {firstLetter(title)}
    </span>
  );
}

function hasValueFor(type: IconType, value: string | null): boolean {
  if (type === "favicon" || type === "none") return true;
  return Boolean(value && value.trim());
}

export function firstLetter(title: string): string {
  const trimmed = title.trim();
  return trimmed ? Array.from(trimmed)[0]!.toUpperCase() : "?";
}
