import { cn } from "cn";
import { BrandMark } from "@/components/portal/brand-mark";
import { site } from "@/lib/site";

/** 页脚：品牌、口号与项目入口 */
export function PortalFooter() {
  return (
    <footer className="border-border/60 mt-6 border-t">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5 shrink-0" />
          <span className="text-[13px] font-medium">{site.fullName}</span>
        </div>

        <p className="text-muted-foreground text-[12px]">{site.slogan}</p>

        <div className="text-muted-foreground flex items-center gap-3 text-[12px]">
          <a
            href={site.repo}
            target="_blank"
            rel="noreferrer"
            className="hover:bg-secondary hover:text-foreground focus-visible:outline-ring inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <GithubMark className="size-3.5" />
            GitHub
          </a>
          <span className="tabular-nums">
            © {new Date().getFullYear()} {site.nameZh}
          </span>
        </div>
      </div>
    </footer>
  );
}

/** GitHub 标记：simple-icons 里那条路径，内联进来免得把整个包带进客户端 */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("shrink-0 fill-current", className)}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
