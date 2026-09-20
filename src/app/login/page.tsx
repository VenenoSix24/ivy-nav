import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AmbientBackground } from "@/components/portal/ambient-background";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { needsSetup } from "@/db/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/settings");

  return (
    // min-h-lvh 与布局视口一致，页面铺满整屏
    <main className="relative z-10 flex min-h-lvh items-center justify-center px-4 py-16">
      <AmbientBackground />
      <LoginForm needsSetup={needsSetup()} />
    </main>
  );
}
