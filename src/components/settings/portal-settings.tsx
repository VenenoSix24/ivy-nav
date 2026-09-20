"use client";

import { useState } from "react";
import { HomepageSettings } from "@/components/settings/homepage-settings";
import { LayoutSettings } from "@/components/settings/layout-settings";
import type { PortalData } from "@/lib/portal/types";

/**
 * 「首页布局」与「首页分类」共用同一份分类列表。
 *
 * 两块各自持有 state 的话，在下面新建一个分类，上面的布局清单要刷新页面才看得到 ——
 * 都是同一份数据，就该有同一个出处。
 */
export function PortalSettings({ initialPortal }: { initialPortal: PortalData }) {
  const [portal, setPortal] = useState(initialPortal);

  return (
    <>
      <LayoutSettings portal={portal} onPortal={setPortal} />
      <HomepageSettings portal={portal} onPortal={setPortal} />
    </>
  );
}
