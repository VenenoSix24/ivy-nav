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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IconPicker } from "@/components/icons/icon-picker";
import { TagInput } from "@/components/editor/tag-input";
import { portalRequest } from "@/lib/portal/client";
import type {
  IconType,
  PortalCategory,
  PortalData,
  PortalItem,
  Visibility,
} from "@/lib/portal/types";

const INBOX_VALUE = "inbox";

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PortalItem | null;
  defaultCategoryId: number | null;
  categories: PortalCategory[];
  onSaved: (portal: PortalData) => void;
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  defaultCategoryId,
  categories,
  onSaved,
}: ItemDialogProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [categoryValue, setCategoryValue] = useState(
    item
      ? item.categoryId === null
        ? INBOX_VALUE
        : String(item.categoryId)
      : defaultCategoryId === null
        ? INBOX_VALUE
        : String(defaultCategoryId),
  );
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [visibility, setVisibility] = useState<Visibility>(item?.visibility ?? "public");
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [iconType, setIconType] = useState<IconType>(item?.iconType ?? "favicon");
  const [iconValue, setIconValue] = useState<string | null>(item?.iconValue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const categoryItems = [
    { label: "未分类（Inbox）", value: INBOX_VALUE },
    ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
  ];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const payload = {
      title,
      url,
      description: description.trim() ? description : null,
      categoryId: categoryValue === INBOX_VALUE ? null : Number(categoryValue),
      tagNames: tags,
      visibility,
      featured,
      iconType,
      iconValue,
    };

    const result = item
      ? await portalRequest(`/api/items/${item.id}`, payload, "PATCH")
      : await portalRequest("/api/items", payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved(result.portal);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,46rem)] flex-col sm:max-w-[520px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{item ? "编辑项目" : "新建项目"}</DialogTitle>
          <DialogDescription>
            网址只支持 http 与 https；Private 的条目只有登录后可见。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5">
            <div className="space-y-2">
              <Label htmlFor="item-title">标题</Label>
              <Input
                id="item-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={80}
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-url">网址</Label>
              <Input
                id="item-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                placeholder="github.com"
                autoCapitalize="none"
                spellCheck={false}
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">描述</Label>
              <Textarea
                id="item-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                rows={2}
                className="min-h-0 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-category">分类</Label>
              <Select
                value={categoryValue}
                onValueChange={(value) => setCategoryValue(String(value))}
                items={categoryItems}
              >
                <SelectTrigger id="item-category" className="h-10 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <IconPicker
              spec={{ type: iconType, value: iconValue }}
              onChange={(next) => {
                setIconType(next.type);
                setIconValue(next.value);
              }}
              url={url}
              title={title}
            />

            <div className="space-y-2">
              <Label htmlFor="item-tags">标签</Label>
              <TagInput id="item-tags" value={tags} onChange={setTags} />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <Label htmlFor="item-visibility" className="text-[13px] font-normal">
                仅登录后可见（Private）
              </Label>
              <Switch
                id="item-visibility"
                checked={visibility === "private"}
                onCheckedChange={(checked) => setVisibility(checked ? "private" : "public")}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="item-featured" className="text-[13px] font-normal">
                置顶
              </Label>
              <Switch
                id="item-featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-destructive text-[13px] leading-relaxed">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="h-9 rounded-xl px-4 text-[13px]"
            >
              取消
            </Button>
            <Button type="submit" disabled={pending} className="h-9 rounded-xl px-4 text-[13px]">
              {pending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
