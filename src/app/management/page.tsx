import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理",
  robots: { index: false, follow: false },
};

/** 前台编辑就是管理界面，这里只是把它变成一个能直接访问的入口。 */
export default async function ManagementPage() {
  const session = await getSession();
  redirect(session ? "/?edit=1" : "/login");
}
