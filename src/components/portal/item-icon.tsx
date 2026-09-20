"use client";

import { cn } from "cn";
import { IconGlyph, itemFaviconSrc, type IconSpec } from "@/components/icons/icon-glyph";

interface ItemIconProps {
  spec: IconSpec;
  title: string;
  itemId: number;
  className?: string;
  glyphClassName?: string;
}

/**
 * 卡片上的图标盒子。盒子的尺寸由调用方给（`className`），里面的图形跟着
 * `--icon-glyph` 走 —— 图片、Emoji、Lucide、首字母托底四种图形都读同一个变量，
 * 所以调用方只需要按盒子大小定一个数。只放大盒子而不放大图形，会显得比原来还空。
 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-hairline bg-glass-strong inline-grid size-11 shrink-0 place-items-center rounded-lg border leading-none [--icon-glyph:1.25rem]",
        className,
      )}
    >
      <IconGlyph
        spec={spec}
        title={title}
        faviconSrc={itemFaviconSrc(itemId)}
        className={glyphClassName}
      />
    </span>
  );
}
