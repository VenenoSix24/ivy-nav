"use client";

/* eslint-disable @next/next/no-img-element -- 预览是内联 SVG，尺寸固定，走 next/image 反而多一层优化器 */
import { Check } from "lucide-react";
import { cn } from "cn";
import { FIT_CLASS, iconBox } from "@/components/icons/icon-glyph";
import { ICON_FITS, type IconFitId } from "@/lib/icons/fit";

/** 预览用的示例标志：宽 164、高 50，四周留白，放在 300×100 的画布里 */
const DEMO_ART =
  '<rect x="95" y="25" width="110" height="50" rx="14"/>' +
  '<circle cx="78" cy="50" r="10"/>' +
  '<circle cx="222" cy="50" r="10"/>';

/** 画布尺寸要写死：只给 viewBox 的话内在尺寸不确定，object-fit 就不稳 */
function demoUri(width: number, height: number, viewBox: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">` +
    `<g fill="#94a3b8">${DEMO_ART}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 带透明留白的那一张 */
const PADDED_DEMO = demoUri(300, 100, "0 0 300 100");
/** 自动裁边后的样子：画布就是内容本身 */
const TRIMMED_DEMO = demoUri(164, 50, "68 25 164 50");

interface IconFitPickerProps {
  value: IconFitId;
  onChange: (next: IconFitId) => void;
  /** md 给设置页，sm 给编辑弹窗的图标区 */
  size?: "md" | "sm";
  disabled?: boolean;
  className?: string;
}

/** 图标摆法四选一：每格按真实的摆法渲染同一张示例图，差别一眼看得出来 */
export function IconFitPicker({
  value,
  onChange,
  size = "md",
  disabled = false,
  className,
}: IconFitPickerProps) {
  const box = size === "md" ? "size-11" : "size-8";

  return (
    <div
      role="group"
      aria-label="图标大小"
      className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4", className)}
    >
      {ICON_FITS.map((entry) => {
        const active = entry.id === value;
        const clipped = entry.id !== "contain";

        return (
          <button
            key={entry.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            title={entry.hint}
            onClick={() => onChange(entry.id)}
            className={cn(
              "focus-visible:outline-ring flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2 transition-colors focus-visible:outline-2 disabled:opacity-60",
              active ? "border-primary bg-accent" : "border-hairline hover:bg-secondary",
            )}
          >
            <span
              aria-hidden
              style={iconBox(true, entry.id)}
              className={cn(
                "plate-lift bg-glass-strong inline-grid shrink-0 place-items-center rounded-[26%] leading-none",
                box,
                entry.id === "contain" && "border-hairline border",
                clipped && "overflow-hidden",
              )}
            >
              <img
                src={entry.id === "auto" ? TRIMMED_DEMO : PADDED_DEMO}
                alt=""
                className={cn("relative size-[var(--icon-glyph,1.25rem)]", FIT_CLASS[entry.id])}
              />
            </span>
            <span
              className={cn(
                "flex items-center gap-1 leading-none",
                size === "md" ? "text-[12px]" : "text-[11px]",
                active && "text-primary font-medium",
              )}
            >
              {entry.label}
              {active ? <Check className="size-3" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
