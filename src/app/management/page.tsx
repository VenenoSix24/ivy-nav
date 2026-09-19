import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理",
  robots: { index: false, follow: false },
};

/**
 * 前台编辑就是管理界面。这里不再直接跳转，而是把编辑模式记在设置页会写的
 * 同一个 Cookie 里，再回到首页 —— 打开编辑这件事的入口只有设置页一处。
 */
export default async function ManagementPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await cookies();
  store.set("ivy_edit", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: false,
  });

  redirect("/");
}
