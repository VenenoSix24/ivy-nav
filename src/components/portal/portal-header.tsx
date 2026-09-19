"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { BrandMark } from "@/components/portal/brand-mark";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { site } from "@/lib/site";

/**
 * 顶栏只留品牌与两个图标按钮：分类交给搜索栏下方那条导航，编辑开关在设置页。
 * 顶栏越安静，越像"自己的空间"而不是工具面板。
 */
export function PortalHeader() {
  return (
    <header className="border-border/60 bg-background/75 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${site.fullName} 首页`}
          className="focus-visible:outline-ring flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandMark className="size-[22px] shrink-0" />
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
