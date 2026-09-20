"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "cn";
import { BrandMark } from "@/components/portal/brand-mark";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { useScrolled } from "@/hooks/use-scrolled";
import { site } from "@/lib/site";

/** 滚动感知的悬浮顶栏：停在顶部时透明，滚动后浮起毛玻璃。
 *  玻璃必须挂在绝对定位的内层：带 backdrop-filter 的 sticky 外壳会让 iOS 底色取样整个失败（WebKit bug 319479）。 */
export function PortalHeader() {
  const scrolled = useScrolled();

  return (
    <header data-scrolled={scrolled ? "true" : undefined} className="sticky top-0 z-40">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 border-b transition-colors duration-300",
          scrolled
            ? "border-border/50 bg-background/60 backdrop-blur-2xl backdrop-saturate-150"
            : "border-transparent",
        )}
      />
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${site.fullName} 首页`}
          className="focus-visible:outline-ring flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandMark className="size-6" />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-[-0.03em]">{site.name}</span>
            <span className="text-muted-foreground/50 text-[13px]">·</span>
            <span className="text-muted-foreground text-[13px] tracking-[0.02em]">
              {site.nameZh}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle />

          <Link
            href="/settings"
            aria-label="设置"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-grid size-9 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
