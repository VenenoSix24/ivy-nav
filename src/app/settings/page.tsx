import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AmbientBackground } from "@/components/portal/ambient-background";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import { AccountSettings } from "@/components/settings/account-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { EditModeSettings } from "@/components/settings/edit-mode-settings";
import { DataSettings } from "@/components/settings/data-settings";
import { PortalSettings } from "@/components/settings/portal-settings";
import { getAdminPortalData } from "@/lib/portal/admin";
import { EDIT_MODE_COOKIE } from "@/lib/portal/edit-mode";
import { getPreferredPalette } from "@/lib/settings/appearance-server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "设置",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [portal, store] = [getAdminPortalData(), await cookies()];
  const editMode = store.get(EDIT_MODE_COOKIE)?.value === "1";

  return (
    <>
      <AmbientBackground />
      <main className="relative z-10 mx-auto w-full max-w-[720px] px-4 pb-24 sm:px-6">
        <header className="flex items-center justify-between pt-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center gap-1.5 rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <ArrowLeft className="size-4" />
            回到首页
          </Link>
          <ThemeToggle />
        </header>

        <h1 className="mt-12 text-[28px] font-semibold tracking-[-0.03em]">设置</h1>
        <p className="text-muted-foreground mt-2 text-[13px]">
          外观、前台编辑、首页分类、数据、账号与会话。
        </p>

        <div className="mt-8 space-y-4">
          <AppearanceSettings initialPalette={getPreferredPalette()} />
          <EditModeSettings initialEnabled={editMode} />
          <PortalSettings initialPortal={portal} />
          <DataSettings />
          <AccountSettings
            username={session.username}
            sessionExpiresAt={session.expiresAt.toISOString()}
          />
        </div>
      </main>
    </>
  );
}
