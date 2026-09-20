import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getPreferredPalette } from "@/lib/settings/appearance-server";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${site.fullName} — ${site.slogan}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.fullName,
  openGraph: {
    title: `${site.fullName} — ${site.slogan}`,
    description: site.description,
    siteName: site.fullName,
    type: "website",
    locale: "zh_CN",
  },
  // 图标与分享卡片都由 app/ 目录下的文件约定接管：
  // icon.png / apple-icon.png / favicon.ico / opengraph-image.png
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  // 让页面铺到屏幕边缘。iOS Safari 的悬浮工具栏下方那条安全区默认落在布局视口之外，
  // 固定在视口上的背景层够不到那里，就露出一条素色底（看着像被拦腰截断）。
  // 铺满之后背景跟着铺满，底部留白改由 safe-bottom 给。
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-palette={getPreferredPalette()} suppressHydrationWarning>
      {/*
        min-h-lvh 而不是 dvh：开了 viewport-fit=cover 之后，布局视口就是整块屏幕
        （悬浮工具栏浮在页面之上），而 dvh 跟的是「工具栏展开时的那一小块」——
        页面会比屏幕矮一截，下面那条就露出素色底，看着像内容被截断。
        lvh 与布局视口一致，工具栏展开收起时也不会跟着跳。
      */}
      <body className="min-h-lvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
          {/*
            iOS 26 的 Safari 不再认 theme-color，浏览器底色改成自己「找」：它扫视口边缘的
            fixed / sticky 元素、读它们的 background-color 当底色（离底边 3px 内、宽过八成、
            高过 3px 才算数），找不到就自己兜一层白 —— 悬浮工具栏下面那条白灰带就是那层兜底。
            这一条就是给它抄的答案：颜色与页面底色一致，位置贴在屏幕最下沿。
            缩到全透明是为了它一个像素都不占（Safari 读的是样式，看不见也照样算数）。
            只在触屏 Safari 的窄屏上出现，别的浏览器不渲染（见 globals.css 的 .safari-band）。
          */}
          <div
            aria-hidden
            className="safari-band bg-background pointer-events-none fixed bottom-0 left-0 h-3 w-full opacity-0"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
