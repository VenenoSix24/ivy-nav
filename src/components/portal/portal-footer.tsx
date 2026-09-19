import Link from "next/link";
import { BrandMark } from "@/components/portal/brand-mark";
import { site } from "@/lib/site";

/** 页脚：品牌、口号、几个入口。不放统计与装饰，保持安静。 */
export function PortalFooter() {
  return (
    <footer className="border-border/60 mt-6 border-t">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5 shrink-0" />
          <span className="text-[13px] font-medium">{site.fullName}</span>
        </div>

        <p className="text-muted-foreground text-[12px]">{site.slogan}</p>

        <div className="text-muted-foreground flex items-center gap-4 text-[12px]">
          <Link href="/" className="hover:text-foreground transition-colors">
            首页
          </Link>
          <Link href="/settings" className="hover:text-foreground transition-colors">
            设置
          </Link>
          <span className="tabular-nums">
            © {new Date().getFullYear()} {site.nameZh}
          </span>
        </div>
      </div>
    </footer>
  );
}
