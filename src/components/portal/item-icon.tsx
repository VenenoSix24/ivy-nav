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
  // 「填满」的档位里图形要顶到板边：这时不画那圈描边 —— 描边是画在盒子内侧的，
  // 留着它，图形就永远差那么一圈（1px 的边 + 圆角处的缺口）
  const filled = (spec.fit ?? DEFAULT_ICON_FIT) !== "contain";

  return (
    <span
      aria-hidden
      style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
      className={cn(
        // 圆角三种布局统一（原来是卡片 8px、列表与紧凑 12px，后者在 40px 的格子上
        // 已经圆得像个圆了）；底板关掉时也要圆：那时盒子里直接是一张图
        "inline-grid size-11 shrink-0 place-items-center rounded-lg leading-none",
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
