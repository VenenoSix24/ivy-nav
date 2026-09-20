import { cookies } from "next/headers";
import { AmbientBackground } from "@/components/portal/ambient-background";
import { PortalShell } from "@/components/portal/portal-shell";
import { getSession } from "@/lib/auth/session";
import { EDIT_MODE_COOKIE } from "@/lib/portal/edit-mode";
import { getPortalData } from "@/lib/portal/queries";

// 内容随时可能被管理员改动，不做静态化，每次请求都重新取数
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  // 是否附带 Private 内容由服务器按会话判定，匿名访问者拿到的响应里没有这些数据
  const session = await getSession();
  const isAdmin = session !== null;
  const data = getPortalData({ includePrivate: isAdmin });
  const [store, { edit }] = await Promise.all([cookies(), searchParams]);
  // 编辑模式记在 Cookie 里，设置页打开后可跨页面保持；?edit=1 仍可直接进入
  const editMode = store.get(EDIT_MODE_COOKIE)?.value === "1" || edit === "1";

  return (
    <>
      <AmbientBackground />
      <PortalShell data={data} initialEditMode={isAdmin && editMode} />
    </>
  );
}
