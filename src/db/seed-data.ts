import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { categories, items, itemTags, tags } from "./schema";

interface CategorySeed {
  name: string;
  description: string;
  visibleOnHomepage: boolean;
}

interface ItemSeed {
  category: string | null;
  title: string;
  description: string;
  url: string;
  iconType: "favicon" | "emoji";
  iconValue: string | null;
  tags: string[];
  visibility?: "public" | "private";
  featured?: boolean;
}

const CATEGORY_SEED: CategorySeed[] = [
  { name: "My Projects", description: "自己做的项目", visibleOnHomepage: true },
  { name: "Frequently Used", description: "每天都会打开", visibleOnHomepage: true },
  { name: "Development", description: "开发与部署", visibleOnHomepage: true },
  { name: "Design", description: "设计与素材", visibleOnHomepage: false },
  { name: "Resources", description: "资料与阅读", visibleOnHomepage: false },
  { name: "Tools", description: "在线工具", visibleOnHomepage: false },
  { name: "Entertainment", description: "影音娱乐", visibleOnHomepage: false },
];

const ITEM_SEED: ItemSeed[] = [
  {
    category: "My Projects",
    title: "RoundMemo",
    description: "私有的 360° 全景照片纪念相册。",
    url: "https://github.com/VenenoSix24/RoundMemo",
    iconType: "emoji",
    iconValue: "🪐",
    tags: ["Project", "Self-hosted"],
    featured: true,
  },
  {
    category: "My Projects",
    title: "LocalType",
    description: "把手机变成局域网无线键盘。",
    url: "https://github.com/VenenoSix24/LocalType",
    iconType: "emoji",
    iconValue: "⌨️",
    tags: ["Project"],
  },
  {
    category: "My Projects",
    title: "Flux",
    description: "本地与 SMB 媒体播放器。",
    url: "https://github.com/VenenoSix24",
    iconType: "emoji",
    iconValue: "✦",
    tags: ["Project", "iOS"],
  },
  {
    category: "Frequently Used",
    title: "GitHub",
    description: "代码托管与协作。",
    url: "https://github.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Dev"],
    featured: true,
  },
  {
    category: "Frequently Used",
    title: "ChatGPT",
    description: "日常使用的 AI 助手。",
    url: "https://chatgpt.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["AI"],
  },
  {
    category: "Frequently Used",
    title: "Figma",
    description: "设计与原型协作。",
    url: "https://www.figma.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Design"],
  },
  {
    category: "Development",
    title: "Vercel",
    description: "前端部署平台。",
    url: "https://vercel.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Deploy"],
  },
  {
    category: "Development",
    title: "Cloudflare",
    description: "DNS、CDN 与 Tunnel。",
    url: "https://dash.cloudflare.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Infra"],
  },
  {
    category: "Development",
    title: "npm",
    description: "包管理与检索。",
    url: "https://www.npmjs.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Dev"],
  },
  {
    category: "Design",
    title: "Dribbble",
    description: "设计灵感。",
    url: "https://dribbble.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Inspiration"],
  },
  {
    category: "Resources",
    title: "MDN Web Docs",
    description: "Web 平台文档。",
    url: "https://developer.mozilla.org",
    iconType: "favicon",
    iconValue: null,
    tags: ["Docs"],
  },
  {
    category: "Resources",
    title: "Hacker News",
    description: "技术与创业讨论。",
    url: "https://news.ycombinator.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Reading"],
  },
  {
    category: "Tools",
    title: "Excalidraw",
    description: "手绘风白板。",
    url: "https://excalidraw.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Diagram"],
  },
  {
    category: "Entertainment",
    title: "YouTube",
    description: "视频。",
    url: "https://www.youtube.com",
    iconType: "favicon",
    iconValue: null,
    tags: ["Video"],
  },
  {
    category: "Entertainment",
    title: "个人服务器",
    description: "内网入口，只有登录后才能看到。",
    url: "https://example.com",
    iconType: "emoji",
    iconValue: "🔒",
    tags: ["Private"],
    visibility: "private",
  },
];

export interface SeedResult {
  categories: number;
  items: number;
  tags: number;
}

/**
 * Demo content so a fresh install shows the real layout instead of an empty page.
 * Refuses to run on a database that already has categories, so it can be invoked
 * repeatedly without duplicating anything.
 */
export function seedDatabase(db: Db): SeedResult {
  const existing = db.select({ id: categories.id }).from(categories).all();
  if (existing.length > 0) return { categories: 0, items: 0, tags: 0 };

  const categoryIds = new Map<string, number>();
  CATEGORY_SEED.forEach((entry, index) => {
    const [row] = db
      .insert(categories)
      .values({
        name: entry.name,
        description: entry.description,
        sortOrder: index,
        visibleOnHomepage: entry.visibleOnHomepage,
        visibility: "public",
      })
      .returning({ id: categories.id })
      .all();
    if (row) categoryIds.set(entry.name, row.id);
  });

  const tagIds = new Map<string, number>();
  const itemOrder = new Map<string, number>();
  let itemCount = 0;

  for (const entry of ITEM_SEED) {
    const groupKey = entry.category ?? "__inbox__";
    const sortOrder = itemOrder.get(groupKey) ?? 0;
    itemOrder.set(groupKey, sortOrder + 1);

    const [item] = db
      .insert(items)
      .values({
        categoryId: entry.category ? (categoryIds.get(entry.category) ?? null) : null,
        title: entry.title,
        description: entry.description,
        url: entry.url,
        iconType: entry.iconType,
        iconValue: entry.iconValue,
        visibility: entry.visibility ?? "public",
        featured: entry.featured ?? false,
        sortOrder,
      })
      .returning({ id: items.id })
      .all();

    if (!item) continue;
    itemCount += 1;

    for (const name of entry.tags) {
      let tagId = tagIds.get(name);
      if (tagId === undefined) {
        db.insert(tags).values({ name }).onConflictDoNothing().run();
        const row = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
        if (!row) continue;
        tagId = row.id;
        tagIds.set(name, tagId);
      }
      db.insert(itemTags).values({ itemId: item.id, tagId }).onConflictDoNothing().run();
    }
  }

  return { categories: categoryIds.size, items: itemCount, tags: tagIds.size };
}
