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

/**
 * 卡片上的图标盒子。盒子的尺寸由调用方给（`className`），里面的图形按盒子算（`iconBox`）——
 * 图片、Emoji、Lucide、首字母托底四种图形都读同一个变量，所以调用方只需要给一个尺寸。
 *
 * 图标遮罩（描边 + 玻璃底）可以按条目关掉：应用类图标自带圆角外形，套上图标遮罩就成了大圆套小圆。
 */
export function ItemIcon({ spec, title, itemId, className, glyphClassName }: ItemIconProps) {
  // 图标遮罩关掉时尺寸照旧：格子还在原来的位置，只是不再画描边与玻璃底
  const plate = usesPlate(spec);
  // 「填满」的档位里图形要顶到板边：这时不画那圈描边 —— 描边是画在盒子内侧的，
  // 留着它，图形就永远差那么一圈（1px 的边 + 圆角处的缺口）
  const filled = (spec.fit ?? DEFAULT_ICON_FIT) !== "contain";

  return (
    <span
      aria-hidden
      style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
      className={cn(
        // 圆角按 Apple 应用图标那个比例给（26%，随格子大小走）：固定 8px 在大格子上偏方、
        // 在小格子上偏圆，比例才是三种布局看起来一致的原因；纯 CSS 的圆角比 Apple 那种
        // 连续圆角（squircle）看着更「方」，所以比例取到 26% 才是那个观感
        "inline-grid size-11 shrink-0 place-items-center rounded-[26%] leading-none",
        // 影子按两种情形分：有图标遮罩就加在图标遮罩上；没图标遮罩时方框没有面，加在这一层会变成
        // 一块悬在图标背后的灰方块（emoji 那种看着就像又垫了一层板），所以那种情况
        // 交给图形自己带（见 IconGlyph 的 icon-lift）
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
