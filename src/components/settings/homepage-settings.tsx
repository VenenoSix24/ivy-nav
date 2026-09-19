"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { portalRequest } from "@/lib/portal/client";
import type { PortalCategory, PortalData } from "@/lib/portal/types";
import { moveEntry } from "@/lib/utils/sort";

interface HomepageSettingsProps {
  initialPortal: PortalData;
}

export function HomepageSettings({ initialPortal }: HomepageSettingsProps) {
  const [portal, setPortal] = useState(initialPortal);
  const [newName, setNewName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PortalCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<PortalCategory | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const itemCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of portal.items) {
      if (item.categoryId === null) continue;
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [portal.items]);

  const inboxCount = portal.items.filter((item) => item.categoryId === null).length;

  async function run(
    path: string,
    body?: unknown,
    method: "POST" | "PATCH" | "DELETE" = "POST",
    successMessage?: string,
  ) {
    setBusy(true);
    const result = await portalRequest(path, body, method);
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return false;
    }

    setPortal(result.portal);
    if (successMessage) toast.success(successMessage);
    return true;
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await run("/api/categories", { name }, "POST", `已创建「${name}」`)) {
      setNewName("");
    }
  }

  function move(category: PortalCategory, direction: -1 | 1) {
    const list = portal.categories;
    const from = list.findIndex((entry) => entry.id === category.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return;
    const orderedIds = moveEntry(list, from, to).map((entry) => entry.id);
    void run("/api/categories/reorder", { orderedIds }, "POST");
  }

  return (
    <>
      <SettingsSection
        title="首页分类"
        description="只有打开开关的分类会出现在首页；顺序决定首页分区的先后，也决定顶部标签的顺序。"
      >
        <ul className="divide-border divide-y">
          {portal.categories.map((category, index) => (
            <li key={category.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{category.name}</span>
                <span className="text-muted-foreground text-[12px] tabular-nums">
                  {itemCounts.get(category.id) ?? 0} items
                  {category.description ? `｜${category.description}` : ""}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`把「${category.name}」上移`}
                  disabled={index === 0 || busy}
                  onClick={() => move(category, -1)}
                  className="rounded-full"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`把「${category.name}」下移`}
                  disabled={index === portal.categories.length - 1 || busy}
                  onClick={() => move(category, 1)}
                  className="rounded-full"
                >
                  <ArrowDown className="size-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`编辑「${category.name}」的名称与描述`}
                  disabled={busy}
                  onClick={() => {
                    setEditingCategory(category);
                    setDraftName(category.name);
                    setDraftDescription(category.description ?? "");
                  }}
                  className="rounded-full"
                >
                  <Pencil className="size-3.5" />
                </Button>

                <Switch
                  aria-label={`「${category.name}」是否显示在首页`}
                  checked={category.visibleOnHomepage}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    void run(
                      `/api/categories/${category.id}`,
                      { visibleOnHomepage: checked },
                      "PATCH",
                      checked ? "已显示在首页" : "已从首页隐藏",
                    )
                  }
                />

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除「${category.name}」`}
                  disabled={busy}
                  onClick={() => setPendingDelete(category)}
                  className="text-muted-foreground hover:text-destructive rounded-full"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={createCategory} className="border-border mt-4 flex gap-2 border-t pt-4">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="新分类名"
            maxLength={40}
            className="h-9 rounded-xl text-[13px]"
          />
          <Button
            type="submit"
            disabled={busy || !newName.trim()}
            className="h-9 rounded-xl px-4 text-[13px]"
          >
            <Plus className="size-3.5" />
            新建分类
          </Button>
        </form>

        {inboxCount > 0 ? (
          <p className="text-muted-foreground mt-3 text-[12px]">
            Inbox 里还有 {inboxCount} 个未归档条目，在首页的编辑模式里可以把它们归到分类下。
          </p>
        ) : null}
      </SettingsSection>

      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>描述会显示在首页该分区的标题旁边。</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const target = editingCategory;
              if (!target) return;
              const ok = await run(
                `/api/categories/${target.id}`,
                { name: draftName, description: draftDescription.trim() ? draftDescription : null },
                "PATCH",
                "已保存分类",
              );
              if (ok) setEditingCategory(null);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="category-name">名称</Label>
              <Input
                id="category-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                required
                maxLength={40}
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">描述</Label>
              <Textarea
                id="category-description"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
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
                onClick={() => setEditingCategory(null)}
                disabled={busy}
                className="h-9 rounded-xl px-4 text-[13px]"
              >
                取消
              </Button>
              <Button type="submit" disabled={busy} className="h-9 rounded-xl px-4 text-[13px]">
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类「{pendingDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (itemCounts.get(pendingDelete.id) ?? 0) > 0
                ? `分类里的 ${itemCounts.get(pendingDelete.id)} 个条目不会被删除，会退到 Inbox 等重新归档。`
                : "该分类下没有条目，删除后无法恢复。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target)
                  void run(`/api/categories/${target.id}`, undefined, "DELETE", "已删除分类");
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
