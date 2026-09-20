"use client";

import { cn } from "cn";
import { IconGlyph, iconBox, type IconSpec } from "@/components/icons/icon-glyph";
import { DEFAULT_ICON_FIT } from "@/lib/icons/fit";
import { itemFaviconSrc } from "@/lib/icons/urls";

interface ItemIconProps {
  spec: IconSpec;
  title: string;
  itemId: number;
  className?: string;
  glyphClassName?: string;
}

/**
 * 卡片上的图标盒子。盒子的尺寸由调用方给（`className`），里面的图形按盒子算（`iconBox`）——
 * 图片、Emoji、Lucide、首字母托底四种图形都读同一个变量，所以调用方只需要给一个尺寸。
 *
 * 底板（描边 + 玻璃底）可以按条目关掉：应用类图标自带圆角外形，套上底板就成了大圆套小圆。
 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  // 底板关掉时尺寸照旧：格子还在原来的位置，只是不再画描边与玻璃底
  const plate = spec.plate !== false;

  return (
    <span
      aria-hidden
      style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
      className={cn(
        "inline-grid size-11 shrink-0 place-items-center leading-none",
        plate && "plate-lift border-hairline bg-glass-strong rounded-lg border",
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
