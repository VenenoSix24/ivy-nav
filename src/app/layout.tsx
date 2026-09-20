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
  // 图标与分享卡片由 app/ 目录下的同名文件接管
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
  // 铺满到屏幕边缘，底部那条安全区交给页面自己兜
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-palette={getPreferredPalette()} suppressHydrationWarning>
      {/* min-h-lvh 与布局视口一致，不跟着悬浮工具栏伸缩 */}
      <body className="min-h-lvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
          {/* iOS 26 Safari 的底色取样条：浏览器读它的 background-color 当底色，别改 */}
          <div
            aria-hidden
            className="safari-band bg-background pointer-events-none fixed bottom-0 left-0 h-3 w-full opacity-0"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
