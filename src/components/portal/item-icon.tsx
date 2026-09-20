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

/** 卡片上的图标盒子：尺寸由调用方给，里面的图形按盒子算（`iconBox`），四种图形读同一个变量。 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  const plate = usesPlate(spec);
  // 填满那几档不画描边：描边画在盒子内侧，留着图形就永远差一圈
  const filled = (spec.fit ?? DEFAULT_ICON_FIT) !== "contain";

  return (
    <span
      aria-hidden
      style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
      className={cn(
        // 圆角取 26% 而不是固定像素：比例才在三种布局里看着一致，纯 CSS 的圆角比
        // Apple 那种连续圆角看着更方，所以比例要比应用图标再大一点
        "inline-grid size-11 shrink-0 place-items-center rounded-[26%] leading-none",
        // 影子按两种情形分：有图标遮罩就加在遮罩上；没有遮罩时这层方框没有面，
        // 加在它身上会变成一块悬在图标背后的灰方块，那种情况交给图形自己带
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
