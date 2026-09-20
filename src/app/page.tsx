import { cookies } from "next/headers";
import { AmbientBackground } from "@/components/portal/ambient-background";
import { PortalShell } from "@/components/portal/portal-shell";
import { getSession } from "@/lib/auth/session";
import { EDIT_MODE_COOKIE } from "@/lib/portal/edit-mode";
import { getPortalData } from "@/lib/portal/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session !== null;
  const data = getPortalData({ includePrivate: isAdmin });
  const [store, { edit }] = await Promise.all([cookies(), searchParams]);
  // 编辑模式记在 Cookie 里，也可用 ?edit=1 直接进入
  const editMode = store.get(EDIT_MODE_COOKIE)?.value === "1" || edit === "1";

  return (
    <>
      <AmbientBackground />
      <PortalShell data={data} initialEditMode={isAdmin && editMode} />
    </>
  );
}
