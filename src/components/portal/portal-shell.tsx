"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { EditableGrid } from "@/components/editor/editable-grid";
import { EditToolbar } from "@/components/editor/edit-toolbar";
import { ItemDialog } from "@/components/editor/item-dialog";
import { CategoryNav } from "@/components/portal/category-nav";
import { CategorySection } from "@/components/portal/category-section";
import { EmptyState } from "@/components/portal/empty-state";
import { PortalFooter } from "@/components/portal/portal-footer";
import { PortalHeader } from "@/components/portal/portal-header";
import { SearchBar } from "@/components/portal/search-bar";
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
import { portalRequest, type PortalResult } from "@/lib/portal/client";
import { clearEditModeCookie } from "@/lib/portal/edit-mode";
import { matchesQuery } from "@/lib/portal/search";
import {
  ALL_CATEGORIES,
  INBOX,
  type CategoryFilter,
  type PortalData,
  type PortalItem,
} from "@/lib/portal/types";
import { site } from "@/lib/site";

interface PortalShellProps {
  data: PortalData;
  initialEditMode?: boolean;
}

interface EditorState {
  key: string;
  item: PortalItem | null;
  categoryId: number | null;
}

interface Section {
  filter: CategoryFilter;
  title: string;
  description: string | null;
  categoryId: number | null;
  items: PortalItem[];
}

export function PortalShell({ data, initialEditMode = false }: PortalShellProps) {
  const [portal, setPortal] = useState<PortalData>(data);
  const [editing, setEditing] = useState(initialEditMode);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PortalItem | null>(null);

  const searching = query.trim().length > 0;

  const tabCategories = useMemo(
    () =>
      editing
        ? portal.categories
        : portal.categories.filter((category) => category.visibleOnHomepage),
    [portal.categories, editing],
  );

  const scopedItems = useMemo(() => {
    if (editing) return portal.items;
    const homeIds = new Set(portal.categories.filter((c) => c.visibleOnHomepage).map((c) => c.id));
    return portal.items.filter((item) => item.categoryId !== null && homeIds.has(item.categoryId));
  }, [portal.items, portal.categories, editing]);

  const categoryNames = useMemo(
    () => new Map(portal.categories.map((category) => [category.id, category.name])),
    [portal.categories],
  );

  const matchedItems = useMemo(
    () =>
      scopedItems.filter((item) =>
        matchesQuery(
          {
            title: item.title,
            description: item.description,
            url: item.url,
            domain: item.domain,
            tags: item.tags,
            categoryName:
              item.categoryId === null ? null : (categoryNames.get(item.categoryId) ?? null),
          },
          query,
        ),
      ),
    [scopedItems, query, categoryNames],
  );

  const sections = useMemo<Section[]>(() => {
    const list: Section[] = [];

    for (const category of tabCategories) {
      if (active !== ALL_CATEGORIES && active !== category.id) continue;
      const items = matchedItems.filter((item) => item.categoryId === category.id);
      if (items.length === 0) continue;
      list.push({
        filter: category.id,
        title: category.name,
        description: category.description,
        categoryId: category.id,
        items,
      });
    }

    // Inbox 只在管理视图里出现，公开页面看不到未归档条目
    if (editing && (active === ALL_CATEGORIES || active === INBOX)) {
      const items = matchedItems.filter((item) => item.categoryId === null);
      if (items.length > 0) {
        list.push({
          filter: INBOX,
          title: "Inbox",
          description: "还没归档的条目",
          categoryId: null,
          items,
        });
      }
    }

    return list;
  }, [tabCategories, matchedItems, active, editing]);

  function applyResult(result: PortalResult, successMessage?: string) {
    if (result.ok) {
      setPortal(result.portal);
      if (successMessage) toast.success(successMessage);
      return;
    }
    toast.error(result.error);
  }

  async function mutate(
    path: string,
    body?: unknown,
    method: "POST" | "PATCH" | "DELETE" = "POST",
    successMessage?: string,
  ) {
    applyResult(await portalRequest(path, body, method), successMessage);
  }

  function itemPayload(item: PortalItem) {
    return {
      title: item.title,
      url: item.url,
      description: item.description,
      categoryId: item.categoryId,
      tagNames: item.tags,
      iconType: item.iconType,
      iconValue: item.iconValue,
      visibility: item.visibility,
      featured: item.featured,
    };
  }

  const canDrag = editing && !searching;

  return (
    <>
      <PortalHeader />

      <main className="relative z-10 mx-auto w-full max-w-[1080px] px-4 pb-28 sm:px-6">
        {editing ? (
          <div className="mt-4">
            <EditToolbar
              onAddItem={() => setEditor({ key: "new", item: null, categoryId: null })}
              onExit={() => {
                document.cookie = clearEditModeCookie();
                setEditing(false);
              }}
              searchActive={searching}
            />
          </div>
        ) : null}

        <section className="mt-14 text-center sm:mt-24">
          <h1 className="text-[clamp(42px,7vw,72px)] leading-[1.02] font-semibold tracking-[-0.055em]">
            Welcome back.
          </h1>
          <p className="text-muted-foreground mt-4 text-[15px] sm:text-[17px]">{site.slogan}</p>
          <SearchBar value={query} onChange={setQuery} />
        </section>

        <CategoryNav categories={tabCategories} active={active} onSelect={setActive} />

        {/* 换分类时重挂载一次，让入场动画重放，而不是整页刷新（设计文档 §28） */}
        <div key={active} className="mt-6 space-y-12 sm:mt-8 sm:space-y-16">
          {sections.map((section) => (
            <CategorySection
              key={String(section.filter)}
              id={`category-${String(section.filter)}`}
              title={section.title}
              description={section.description}
              items={section.items}
              action={
                editing ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setEditor({
                        key: `new-${String(section.filter)}`,
                        item: null,
                        categoryId: section.categoryId,
                      })
                    }
                    className="h-8 rounded-full px-3 text-[12px]"
                  >
                    <Plus className="size-3.5" />
                    添加
                  </Button>
                ) : null
              }
            >
              {editing ? (
                <EditableGrid
                  items={section.items}
                  categories={portal.categories}
                  sortable={canDrag}
                  onReorder={(orderedIds) => void mutate("/api/items/reorder", { orderedIds })}
                  onEdit={(item) => setEditor({ key: `item-${item.id}`, item, categoryId: null })}
                  onDuplicate={(item) =>
                    void mutate(
                      "/api/items",
                      { ...itemPayload(item), title: `${item.title} 副本` },
                      "POST",
                      "已复制",
                    )
                  }
                  onMove={(item, categoryId) =>
                    void mutate(`/api/items/${item.id}`, { categoryId }, "PATCH", "已移动分类")
                  }
                  onToggleVisibility={(item) =>
                    void mutate(
                      `/api/items/${item.id}`,
                      { visibility: item.visibility === "public" ? "private" : "public" },
                      "PATCH",
                      item.visibility === "public" ? "已设为 Private" : "已设为 Public",
                    )
                  }
                  onToggleFeatured={(item) =>
                    void mutate(
                      `/api/items/${item.id}`,
                      { featured: !item.featured },
                      "PATCH",
                      item.featured ? "已取消置顶" : "已置顶",
                    )
                  }
                  onDelete={(item) => setPendingDelete(item)}
                />
              ) : undefined}
            </CategorySection>
          ))}
        </div>

        {sections.length === 0 ? (
          searching ? (
            <EmptyState
              title={`没有匹配「${query.trim()}」的结果`}
              hint="换个关键词，或清空搜索看看全部内容。"
            />
          ) : active !== ALL_CATEGORIES ? (
            <EmptyState title="这个分类还没有内容" hint="切换到「全部」看看其它分类。" />
          ) : editing ? (
            <EmptyState title="还没有内容" hint="点上方「新建项目」开始添加。" />
          ) : (
            <EmptyState title="还没有内容" hint="登录后可以添加网站与项目。" />
          )
        ) : null}
      </main>

      <PortalFooter />

      {editor ? (
        <ItemDialog
          key={editor.key}
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          item={editor.item}
          defaultCategoryId={editor.categoryId}
          categories={portal.categories}
          onSaved={(next) => setPortal(next)}
        />
      ) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{pendingDelete?.title}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，需要重新添加。它所在的分类不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target) void mutate(`/api/items/${target.id}`, undefined, "DELETE", "已删除");
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
