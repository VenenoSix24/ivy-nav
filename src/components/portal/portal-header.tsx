"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "cn";
import { BrandMark } from "@/components/portal/brand-mark";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { useScrolled } from "@/hooks/use-scrolled";
import { site } from "@/lib/site";

/**
 * 滚动感知的悬浮顶栏：停在顶部时完全透明、没有分隔线；往下滚动后
 * 才浮起一层毛玻璃与细线。这样首屏干净，滚动后又始终压得住内容。
 *
 * 玻璃挂在绝对定位的内层、`sticky` 外壳自己保持透明，是给 iOS 26 的 Safari 让路：
 * 那一版起浏览器底色由 Safari 自己「找」—— 它扫视口边缘的 fixed / sticky 元素、
 * 读它们的 background-color 与 backdrop-filter 算底色，而**带 backdrop-filter 的那个
 * 元素会让它整片放弃取样**（WebKit bug 319479）。取样失败就只剩一层素色兜底，
 * 悬浮工具栏下面那条白灰带就是这么来的。外壳干净、玻璃下沉一层，Safari 才认得出这一条。
 */
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

          {/* 管理入口不公开张扬，做成安静的设置图标（设计文档 §12） */}
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
