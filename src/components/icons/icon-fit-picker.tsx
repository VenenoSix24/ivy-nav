"use client";

import { Check } from "lucide-react";
import { cn } from "cn";
import { IconGlyph, iconBox, type IconSpec } from "@/components/icons/icon-glyph";
import { ICON_FITS, type IconFitId } from "@/lib/icons/fit";

interface IconFitPickerProps {
  value: IconFitId;
  onChange: (next: IconFitId) => void;
  /** 给一个图标就按它渲染预览；不给则只列名字 */
  spec?: IconSpec;
  faviconSrc?: string;
  title?: string;
  /** md 给设置页，sm 给编辑弹窗的图标区 */
  size?: "md" | "sm";
  disabled?: boolean;
  className?: string;
}

/** 图标摆法四选一：有图标时四格按该档真实渲染同一个图标，差别直接看得出来 */
export function IconFitPicker({
  value,
  onChange,
  spec,
  faviconSrc = "",
  title = "",
  size = "md",
  disabled = false,
  className,
}: IconFitPickerProps) {
  const box = size === "md" ? "size-11" : "size-9";
  const plate = spec !== undefined && spec.type !== "emoji" && spec.plate !== false;

  return (
    <div
      role="group"
      aria-label="图标大小"
      className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4", className)}
    >
      {ICON_FITS.map((entry) => {
        const active = entry.id === value;

        return (
          <button
            key={entry.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            title={entry.hint}
            onClick={() => onChange(entry.id)}
            className={cn(
              "focus-visible:outline-ring flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2 transition-colors focus-visible:outline-2 disabled:opacity-60",
              active ? "border-primary bg-accent" : "border-hairline hover:bg-secondary",
            )}
          >
            {spec === undefined ? null : (
              <span
                aria-hidden
                style={iconBox(plate, entry.id)}
                className={cn(
                  "inline-grid shrink-0 place-items-center rounded-[26%] leading-none",
                  box,
                  plate && "plate-lift bg-glass-strong",
                  plate && entry.id === "contain" && "border-hairline border",
                )}
              >
                <IconGlyph
                  spec={{ ...spec, fit: entry.id }}
                  title={title}
                  faviconSrc={faviconSrc}
                />
              </span>
            )}
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
