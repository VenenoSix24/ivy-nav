import Link from "next/link";
import { Pencil, Settings } from "lucide-react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

interface PortalHeaderProps {
  isAdmin: boolean;
  editing: boolean;
  onToggleEdit: () => void;
}

export function PortalHeader({ isAdmin, editing, onToggleEdit }: PortalHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="focus-visible:outline-ring flex items-baseline gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <span className="text-[15px] font-semibold tracking-[-0.02em]">{site.name}</span>
        <span className="text-muted-foreground text-[13px]">{site.nameZh}</span>
      </Link>

      <div className="flex items-center gap-1">
        {isAdmin ? (
          <Button
            variant={editing ? "default" : "ghost"}
            onClick={onToggleEdit}
            className={cn("h-9 rounded-full px-3 text-[12px]")}
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">{editing ? "退出编辑" : "编辑模式"}</span>
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
    </header>
  );
}
