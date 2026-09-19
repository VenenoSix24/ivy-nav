"use client";

import Link from "next/link";
import { Pencil, Settings } from "lucide-react";
import { CategoryNav } from "@/components/portal/category-nav";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { Button } from "@/components/ui/button";
import type { CategoryFilter, PortalCategory } from "@/lib/portal/types";
import { site } from "@/lib/site";

interface PortalHeaderProps {
  isAdmin: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  categories: PortalCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  counts: Map<number, number>;
  totalCount: number;
}

/**
 * 顶栏：品牌、分类导航、外观与设置。分类就在这里切换，
 * 所以它常驻在页面顶部，滚动时始终可点。
 */
export function PortalHeader({
  isAdmin,
  editing,
  onToggleEdit,
  categories,
  active,
  onSelect,
  counts,
  totalCount,
}: PortalHeaderProps) {
  return (
    <header className="border-border/70 bg-background/70 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:outline-ring flex shrink-0 items-baseline gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{site.name}</span>
          <span className="text-muted-foreground hidden text-[13px] sm:inline">{site.nameZh}</span>
        </Link>

        <CategoryNav
          categories={categories}
          active={active}
          onSelect={onSelect}
          counts={counts}
          totalCount={totalCount}
          className="flex-1"
        />

        <div className="flex shrink-0 items-center gap-1">
          {isAdmin ? (
            <Button
              variant={editing ? "default" : "ghost"}
              onClick={onToggleEdit}
              aria-label={editing ? "退出编辑模式" : "进入编辑模式"}
              className="h-9 rounded-full px-3 text-[12px]"
            >
              <Pencil className="size-3.5" />
              <span className="hidden lg:inline">{editing ? "退出编辑" : "编辑模式"}</span>
            </Button>
          ) : null}

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
