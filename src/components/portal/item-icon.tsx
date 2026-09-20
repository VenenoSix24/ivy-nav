"use client";

import { cn } from "cn";
import { IconGlyph, iconBox, usesPlate, type IconSpec } from "@/components/icons/icon-glyph";
import { DEFAULT_ICON_FIT } from "@/lib/icons/fit";
import { itemFaviconSrc } from "@/lib/icons/urls";

interface ItemIconProps {
  spec: IconSpec;
  title: string;
  itemId: number;
  className?: string;
  glyphClassName?: string;
}

/** 卡片上的图标盒子：尺寸由调用方给 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  const plate = usesPlate(spec);
  const filled = (spec.fit ?? DEFAULT_ICON_FIT) !== "contain";

  return (
    <span
      aria-hidden
      style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
      className={cn(
        "inline-grid size-11 shrink-0 place-items-center rounded-[26%] leading-none",
        plate && "plate-lift bg-glass-strong",
        plate && !filled && "border-hairline border",
        className,
      )}
    >
      <IconGlyph
        spec={spec}
        title={title}
        faviconSrc={itemFaviconSrc(itemId, spec.type === "favicon" ? spec.value : null)}
        className={glyphClassName}
      />
    </span>
  );
}
