"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PortalCategory } from "@/lib/portal/types";

interface CategoryDialogProps {
  /** 为 null 时对话框关闭；调用方给它加 key，换一个分类就重挂载一次，草稿不会串 */
  category: PortalCategory | null;
  onOpenChange: (open: boolean) => void;
  /** 返回 true 表示保存成功，成功就自己关上 */
  onSave: (values: { name: string; description: string | null }) => Promise<boolean>;
}

/** 改分类的名字与描述。首页与「整理分类」面板共用同一个。 */
export function CategoryDialog({ category, onOpenChange, onSave }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>编辑分类</DialogTitle>
          <DialogDescription>描述会显示在首页该分区的标题旁边。</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const ok = await onSave({
              name,
              description: description.trim() ? description : null,
            });
            setBusy(false);
            if (ok) onOpenChange(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="inline-category-name">名称</Label>
            <Input
              id="inline-category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={40}
              className="h-10 rounded-xl text-[16px] sm:text-[14px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-category-description">描述</Label>
            <Textarea
              id="inline-category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="例如：自己做的项目"
              className="min-h-0 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="h-9 rounded-xl px-4 text-[13px]"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={busy || !name.trim()}
              className="h-9 rounded-xl px-4 text-[13px]"
            >
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
