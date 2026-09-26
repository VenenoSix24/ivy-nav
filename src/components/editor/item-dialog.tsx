"use client";

import { useEffect, useState } from "react";
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
import type { IconFitId } from "@/lib/icons/fit";
import { TagInput } from "@/components/editor/tag-input";
import { portalRequest } from "@/lib/portal/client";
import { parseHttpUrl } from "@/lib/utils/url";
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
  /** 条目没自己设过「图标大小」时用的默认值 */
  defaultIconFit: IconFitId;

  /** 已有标签，标签框里输入时做匹配提示 */
  tagSuggestions?: string[];
  onSaved: (portal: PortalData) => void;
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
  defaultCategoryId,
  categories,
  defaultIconFit,
  tagSuggestions,
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
  const [iconPlate, setIconPlate] = useState(item?.iconPlate ?? true);
  const [iconMono, setIconMono] = useState(item?.iconMono ?? false);
  const [iconFit, setIconFit] = useState<IconFitId>(item?.iconFitOwn ?? defaultIconFit);
  /** 用户有没有在这一轮里动过「图标大小」 */
  const [iconFitTouched, setIconFitTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** 标题是不是用户自己写过的 */
  const [titleTouched, setTitleTouched] = useState(item !== null);
  const [titleHint, setTitleHint] = useState<string | null>(null);

  /** 只填了网址就保存时，自动从网页取一次标题 */
  useEffect(() => {
    const target = url.trim();
    if (!target || titleTouched || !parseHttpUrl(target)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/site-meta?url=${encodeURIComponent(target)}`);
        const payload: unknown = await response.json().catch(() => null);
        const found = (payload as { title?: unknown } | null)?.title;
        if (cancelled) return;
        if (typeof found === "string" && found.trim()) {
          setTitle(found.trim());
          setTitleHint("标题取自网页，可自行修改");
        } else {
          setTitleHint("没读到网页标题，自己填一个吧");
        }
      } catch {
        if (!cancelled) setTitleHint("没读到网页标题，自己填一个吧");
      }
    }, 900);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, titleTouched]);

  const categoryItems = [
    { label: "未分类（Inbox）", value: INBOX_VALUE },
    ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
  ];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fallback = parseHttpUrl(url)?.hostname.replace(/^www\./, "") ?? "";
    const finalTitle = title.trim() || fallback;
    if (!finalTitle) {
      setError("请填标题，或先填一个网址（标题会从网址推断）。");
      return;
    }

    setError(null);
    setPending(true);

    const payload = {
      title: finalTitle,
      url,
      description: description.trim() ? description : null,
      categoryId: categoryValue === INBOX_VALUE ? null : Number(categoryValue),
      tagNames: tags,
      visibility,
      featured,
      iconType,
      iconValue,
      iconPlate,
      iconMono,
      iconFit: iconFitTouched ? iconFit : (item?.iconFitOwn ?? null),
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
                onChange={(event) => {
                  setTitle(event.target.value);
                  setTitleTouched(true);
                  setTitleHint(null);
                }}
                maxLength={80}
                placeholder="填写网址后将自动获取"
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
              {titleHint ? (
                <p className="text-muted-foreground text-[12px]" role="status">
                  {titleHint}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-url">网址</Label>
              <Input
                id="item-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                placeholder="example.com"
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
                placeholder="这里填写描述哦～"
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
              spec={{
                type: iconType,
                value: iconValue,
                plate: iconPlate,
                mono: iconMono,
                fit: iconFit,
              }}
              onChange={(next) => {
                setIconType(next.type);
                setIconValue(next.value);
                setIconPlate(next.plate ?? true);
                setIconMono(next.mono ?? false);
                if (next.fit && next.fit !== iconFit) {
                  setIconFit(next.fit);
                  setIconFitTouched(true);
                }
              }}
              url={url}
              title={title}
              initialFetched={item !== null && item.iconType === "favicon"}
            />

            <div className="space-y-2">
              <Label htmlFor="item-tags">标签</Label>
              <TagInput
                id="item-tags"
                value={tags}
                onChange={setTags}
                suggestions={tagSuggestions}
              />
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
