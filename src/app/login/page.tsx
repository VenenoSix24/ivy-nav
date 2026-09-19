import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AmbientBackground } from "@/components/portal/ambient-background";
import { LoginForm } from "@/components/auth/login-form";
import { getSession, needsSetup } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/settings");

  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-16">
      <AmbientBackground />
      <LoginForm mode={needsSetup() ? "setup" : "login"} />
    </main>
  );
}
