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
}

/**
 * 顶栏：品牌、分类、外观、设置。分类常驻顶部，滚到任何位置都能切换。
 * 分类多的时候让导航自己横向滚动，而不是把整行挤变形。
 */
export function PortalHeader({
  isAdmin,
  editing,
  onToggleEdit,
  categories,
  active,
  onSelect,
}: PortalHeaderProps) {
  return (
    <header className="border-border/60 bg-background/75 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:outline-ring flex shrink-0 items-baseline gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{site.name}</span>
          <span className="text-muted-foreground text-[12px]">{site.nameZh}</span>
        </Link>

        <CategoryNav
          categories={categories}
          active={active}
          onSelect={onSelect}
          className="min-w-0 flex-1"
        />

        <div className="flex shrink-0 items-center gap-0.5">
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
