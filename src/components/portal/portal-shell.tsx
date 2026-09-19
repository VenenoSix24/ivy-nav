"use client";

import { useMemo, useState } from "react";
import { CategorySection } from "@/components/portal/category-section";
import { CategoryTabs } from "@/components/portal/category-tabs";
import { EmptyState } from "@/components/portal/empty-state";
import { PortalHeader } from "@/components/portal/portal-header";
import { SearchBar } from "@/components/portal/search-bar";
import { matchesQuery } from "@/lib/portal/search";
import { ALL_CATEGORIES, type CategoryFilter, type PortalData } from "@/lib/portal/types";
import { site } from "@/lib/site";

export function PortalShell({ data }: { data: PortalData }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CategoryFilter>(ALL_CATEGORIES);

  // 首页只呈现管理员选中要展示的分类（设计文档 §6）
  const homeCategories = useMemo(
    () => data.categories.filter((category) => category.visibleOnHomepage),
    [data.categories],
  );

  const categoryNames = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category.name])),
    [data.categories],
  );

  const scopedItems = useMemo(() => {
    const homeIds = new Set(homeCategories.map((category) => category.id));
    return data.items.filter((item) => item.categoryId !== null && homeIds.has(item.categoryId));
  }, [data.items, homeCategories]);

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

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of matchedItems) {
      if (item.categoryId === null) continue;
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    }
    return map;
  }, [matchedItems]);

  const sections = useMemo(
    () =>
      homeCategories
        .filter((category) => active === ALL_CATEGORIES || category.id === active)
        .map((category) => ({
          category,
          items: matchedItems.filter((item) => item.categoryId === category.id),
        }))
        .filter((section) => section.items.length > 0),
    [homeCategories, matchedItems, active],
  );

  const isSearching = query.trim().length > 0;

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1080px] px-4 pb-28 sm:px-6">
      <div className="pt-8">
        <PortalHeader />
      </div>

      <section className="mt-16 text-center sm:mt-24">
        <h1 className="text-[clamp(46px,7vw,72px)] leading-[1.02] font-semibold tracking-[-0.055em]">
          Welcome back.
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] sm:text-[17px]">{site.slogan}</p>
        <SearchBar value={query} onChange={setQuery} />
      </section>

      <div className="mt-10 sm:mt-14">
        <CategoryTabs
          categories={homeCategories}
          active={active}
          onChange={setActive}
          counts={counts}
          totalCount={matchedItems.length}
        />
      </div>

      {/* 换分类时重挂载一次，让入场动画重放，而不是整页刷新（设计文档 §28） */}
      <div key={active} className="mt-8 space-y-14 sm:mt-10 sm:space-y-16">
        {sections.map((section) => (
          <CategorySection
            key={section.category.id}
            category={section.category}
            items={section.items}
          />
        ))}
      </div>

      {sections.length === 0 ? (
        isSearching ? (
          <EmptyState
            title={`没有匹配「${query.trim()}」的结果`}
            hint="换个关键词，或清空搜索看看全部内容。"
          />
        ) : active !== ALL_CATEGORIES ? (
          <EmptyState title="这个分类还没有内容" hint="切换到 All 看看其它分类。" />
        ) : (
          <EmptyState title="还没有内容" hint="登录后可以添加网站与项目。" />
        )
      ) : null}
    </main>
  );
}
