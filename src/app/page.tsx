import { AmbientBackground } from "@/components/portal/ambient-background";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPortalData } from "@/lib/portal/queries";

// 内容随时可能被管理员改动，不做静态化，每次请求都重新取数
export const dynamic = "force-dynamic";

export default function HomePage() {
  const data = getPortalData({ includePrivate: false });

  return (
    <>
      <AmbientBackground />
      <PortalShell data={data} />
    </>
  );
}
