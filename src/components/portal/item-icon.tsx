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

/** 卡片上的图标盒子。 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-hairline bg-glass-strong inline-grid size-11 shrink-0 place-items-center rounded-lg border text-[20px] leading-none",
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
