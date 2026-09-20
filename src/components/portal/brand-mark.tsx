/* eslint-disable @next/next/no-img-element -- 固定尺寸的本地小图，走 next/image 只是多一层优化器 */
import { cn } from "cn";

interface BrandMarkProps {
  className?: string;
}

/**
 * 站点标记：一片叶子，由 scripts/brand/generate-assets.mjs 从源图生成。
 *
 * 不留图标遮罩、不加投影：试过 30px 的淡色圆托，它的底色和叶子亮部太近，
 * 22px 下反而糊成一片。裸叶子在浅色与深色下都够清楚（设计文档 §47 的 Calm）。
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <img
      src="/brand/leaf-64.png"
      srcSet="/brand/leaf-64.png 1x, /brand/leaf-128.png 2x"
      width={64}
      height={64}
      alt=""
      className={cn("shrink-0 select-none", className)}
    />
  );
}
