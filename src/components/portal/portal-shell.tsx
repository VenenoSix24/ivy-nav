"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CategoryDialog } from "@/components/editor/category-dialog";
import { CategoryMenu } from "@/components/editor/category-menu";
import { CategoryOrganizer } from "@/components/editor/category-organizer";
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
import { reorderWithin } from "@/lib/portal/reorder";
import { matchesQuery } from "@/lib/portal/search";
import {
  ALL_CATEGORIES,
  INBOX,
  type CategoryFilter,
  type PortalCategory,
  type PortalData,
  type PortalItem,
} from "@/lib/portal/types";
import { DEFAULT_LAYOUT, LAYOUTS, type LayoutId } from "@/lib/settings/homepage";
import { moveEntry } from "@/lib/utils/sort";
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
  /** 这个分区用哪种排布 */
  layout: LayoutId;
  items: PortalItem[];
}

export function PortalShell({ data, initialEditMode = false }: PortalShellProps) {
  const [portal, setPortal] = useState<PortalData>(data);
  const [editing, setEditing] = useState(initialEditMode);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PortalItem | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PortalCategory | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<PortalCategory | null>(null);

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

  /** 每个分类有几个条目 */
  const itemCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of portal.items) {
      if (item.categoryId === null) continue;
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [portal.items]);

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
        layout: category.layout ?? DEFAULT_LAYOUT,
        items,
      });
    }

    // Inbox 只在管理视图里出现
    if (editing && (active === ALL_CATEGORIES || active === INBOX)) {
      const items = matchedItems.filter((item) => item.categoryId === null);
      if (items.length > 0) {
        list.push({
          filter: INBOX,
          title: "Inbox",
          description: "还没归档的条目",
          categoryId: null,
          layout: DEFAULT_LAYOUT,
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

  /** 首页上看得见的分区（不含 Inbox）的顺序 */
  const visibleOrder = useMemo(
    () => sections.map((section) => section.categoryId).filter((id): id is number => id !== null),
    [sections],
  );

  /** 拖动排序：先按新顺序更新本地，失败就退回拖动前那一份 */
  async function submitOrder(
    path: string,
    orderedIds: number[],
    apply: (current: PortalData) => PortalData,
  ) {
    const before = portal;
    setPortal(apply(before));

    const result = await portalRequest(path, { orderedIds });
    if (result.ok) {
      setPortal(result.portal);
      return;
    }

    setPortal(before);
    toast.error(result.error);
  }

  function submitCategoryOrder(orderedIds: number[]) {
    void submitOrder("/api/categories/reorder", orderedIds, (current) => ({
      ...current,
      categories: orderedIds
        .map((id) => current.categories.find((category) => category.id === id))
        .filter((category): category is PortalCategory => category !== undefined),
    }));
  }

  function shiftCategory(category: PortalCategory, direction: -1 | 1) {
    const at = visibleOrder.indexOf(category.id);
    const targetId = at < 0 ? null : (visibleOrder[at + direction] ?? null);
    if (targetId === null) return;

    const from = portal.categories.findIndex((entry) => entry.id === category.id);
    const to = portal.categories.findIndex((entry) => entry.id === targetId);
    if (from < 0 || to < 0) return;
    submitCategoryOrder(moveEntry(portal.categories, from, to).map((entry) => entry.id));
  }

  function pinCategory(category: PortalCategory) {
    const from = portal.categories.findIndex((entry) => entry.id === category.id);
    if (from <= 0) return;
    submitCategoryOrder(moveEntry(portal.categories, from, 0).map((entry) => entry.id));
  }

  async function saveCategory(values: { name: string; description: string | null }) {
    const target = editingCategory;
    if (!target) return false;

    const result = await portalRequest(`/api/categories/${target.id}`, values, "PATCH");
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setPortal(result.portal);
    toast.success("已保存分类");
    return true;
  }

  async function createCategory(name: string) {
    const result = await portalRequest("/api/categories", { name }, "POST");
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setPortal(result.portal);
    toast.success(`已创建「${name}」`);
    return true;
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
      iconPlate: item.iconPlate,
      iconMono: item.iconMono,
      iconFit: item.iconFitOwn,
      visibility: item.visibility,
      featured: item.featured,
    };
  }

  const canDrag = editing && !searching;

  return (
    <>
      <PortalHeader />

      <main className="relative z-10 mx-auto w-full max-w-[1080px] px-4 pb-10 sm:px-6">
        {editing ? (
          <EditToolbar
            className="mt-4"
            onAddItem={() => setEditor({ key: "new", item: null, categoryId: null })}
            onOrganize={() => setOrganizing(true)}
            onExit={() => {
              document.cookie = clearEditModeCookie();
              setEditing(false);
              toast.success("改动已保存");
            }}
            searchActive={searching}
          />
        ) : null}

        <section className="mt-14 text-center sm:mt-24">
          <h1 className="text-[clamp(42px,7vw,72px)] leading-[1.02] font-semibold tracking-[-0.055em]">
            Welcome back.
          </h1>
          <p className="text-muted-foreground mt-4 text-[15px] sm:text-[17px]">{site.slogan}</p>
          <SearchBar value={query} onChange={setQuery} />
        </section>

        <CategoryNav
          categories={tabCategories}
          active={active}
          onSelect={setActive}
          className="mt-9 sm:mt-12"
        />

        <div key={active} className="mt-10 space-y-12 sm:mt-14 sm:space-y-16">
          {sections.map((section) => {
            const sectionCategory =
              section.categoryId === null
                ? null
                : (portal.categories.find((category) => category.id === section.categoryId) ??
                  null);

            return (
              <CategorySection
                key={String(section.filter)}
                id={`category-${String(section.filter)}`}
                title={section.title}
                description={section.description}
                items={section.items}
                layout={section.layout}
                action={
                  editing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="glass"
                        onClick={() =>
                          setEditor({
                            key: `new-${String(section.filter)}`,
                            item: null,
                            categoryId: section.categoryId,
                          })
                        }
                        className="text-primary h-8 rounded-full px-3 text-[12px]"
                      >
                        <Plus className="size-3.5" />
                        添加
                      </Button>
                      {sectionCategory ? (
                        <CategoryMenu
                          category={sectionCategory}
                          position={{
                            index: Math.max(0, visibleOrder.indexOf(sectionCategory.id)),
                            total: visibleOrder.length,
                          }}
                          onEdit={() => setEditingCategory(sectionCategory)}
                          onLayout={(next) =>
                            void mutate(
                              `/api/categories/${sectionCategory.id}`,
                              { layout: next },
                              "PATCH",
                              `「${sectionCategory.name}」改用${
                                LAYOUTS.find((entry) => entry.id === next)?.label ?? next
                              }布局`,
                            )
                          }
                          onShift={(direction) => shiftCategory(sectionCategory, direction)}
                          onPin={() => pinCategory(sectionCategory)}
                          onToggleHomepage={() =>
                            void mutate(
                              `/api/categories/${sectionCategory.id}`,
                              { visibleOnHomepage: !sectionCategory.visibleOnHomepage },
                              "PATCH",
                              sectionCategory.visibleOnHomepage ? "已从首页隐藏" : "已放回首页",
                            )
                          }
                          onToggleVisibility={() =>
                            void mutate(
                              `/api/categories/${sectionCategory.id}`,
                              {
                                visibility:
                                  sectionCategory.visibility === "private" ? "public" : "private",
                              },
                              "PATCH",
                              sectionCategory.visibility === "private"
                                ? `「${sectionCategory.name}」已公开`
                                : `「${sectionCategory.name}」已整类隐藏`,
                            )
                          }
                          onDelete={() => setPendingCategoryDelete(sectionCategory)}
                        />
                      ) : null}
                    </div>
                  ) : null
                }
              >
                {editing ? (
                  <EditableGrid
                    items={section.items}
                    layout={section.layout}
                    categories={portal.categories}
                    sortable={canDrag}
                    onReorder={(orderedIds) =>
                      void submitOrder("/api/items/reorder", orderedIds, (current) => ({
                        ...current,
                        items: reorderWithin(current.items, orderedIds),
                      }))
                    }
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
            );
          })}
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
          defaultIconFit={portal.defaultIconFit}
          onSaved={(next) => setPortal(next)}
        />
      ) : null}

      <CategoryOrganizer
        open={organizing}
        onOpenChange={setOrganizing}
        categories={portal.categories}
        counts={itemCounts}
        onReorder={submitCategoryOrder}
        onCreate={createCategory}
        onEdit={(category) => setEditingCategory(category)}
      />

      <CategoryDialog
        key={editingCategory?.id ?? "none"}
        category={editingCategory}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
        onSave={saveCategory}
      />

      <AlertDialog
        open={pendingCategoryDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCategoryDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类「{pendingCategoryDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCategoryDelete && (itemCounts.get(pendingCategoryDelete.id) ?? 0) > 0
                ? `分类里的 ${itemCounts.get(pendingCategoryDelete.id)} 个条目不会被删除，会退到 Inbox 等重新归档。`
                : "该分类下没有条目，删除后无法恢复。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingCategoryDelete;
                setPendingCategoryDelete(null);
                if (target)
                  void mutate(`/api/categories/${target.id}`, undefined, "DELETE", "已删除分类");
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
