"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clearEditModeCookie, editModeCookie } from "@/lib/portal/edit-mode";

interface EditModeSettingsProps {
  initialEnabled: boolean;
}

export function EditModeSettings({ initialEnabled }: EditModeSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);

  function toggle(next: boolean) {
    document.cookie = next ? editModeCookie() : clearEditModeCookie();
    setEnabled(next);
    toast.success(next ? "已打开编辑模式" : "已关闭编辑模式");
    router.refresh();
  }

  return (
    <SettingsSection
      title="前台编辑"
      description="启用后可在首页增删改条目、拖动排序，并编辑分类的名称、描述与布局。"
    >
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="edit-mode" className="text-[13px] font-normal">
          编辑模式
        </Label>
        <Switch id="edit-mode" checked={enabled} onCheckedChange={toggle} />
      </div>

      {enabled ? (
        <p className="mt-4 text-[13px]">
          <Link
            href="/"
            className="text-primary focus-visible:outline-ring rounded-md font-medium focus-visible:outline-2"
          >
            回到首页开始编辑 →
          </Link>
        </p>
      ) : null}
    </SettingsSection>
  );
}
