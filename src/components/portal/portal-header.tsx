import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { site } from "@/lib/site";

export function PortalHeader() {
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
