import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Session tokens; only the SHA-256 digest is persisted. */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: createdAt(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  visibleOnHomepage: integer("visible_on_homepage", { mode: "boolean" }).notNull().default(true),
  /** 首页排布；空值表示默认（卡片），取值与 src/lib/settings/homepage.ts 的 LAYOUTS 一致 */
  layout: text("layout", { enum: ["card", "list", "compact"] }),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("public"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A null categoryId is the Inbox. */
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  iconType: text("icon_type", {
    enum: ["favicon", "emoji", "lucide", "simple-icons", "iconify", "upload", "none"],
  })
    .notNull()
    .default("favicon"),
  iconValue: text("icon_value"),
  /** 图标遮罩（描边 + 玻璃底），可按条目关掉 */
  iconPlate: integer("icon_plate", { mode: "boolean" }).notNull().default(true),
  /** 单色图标按主题前景色渲染（CSS mask 上色） */
  iconMono: integer("icon_mono", { mode: "boolean" }).notNull().default(false),
  /** 图标在图标遮罩里的摆法；空值表示跟随设置页的默认，取值与 src/lib/icons/fit.ts 一致 */
  iconFit: text("icon_fit", { enum: ["contain", "auto", "cover", "fill"] }),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("public"),
  sortOrder: integer("sort_order").notNull().default(0),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: createdAt(),
});

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })],
);

export const iconSets = sqliteTable("icon_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  source: text("source", { enum: ["library", "upload"] }).notNull(),
  version: text("version"),
  metadata: text("metadata", { mode: "json" }),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: updatedAt(),
});

export const backups = sqliteTable("backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  trigger: text("trigger", { enum: ["manual", "auto"] })
    .notNull()
    .default("manual"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type IconSet = typeof iconSets.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Backup = typeof backups.$inferSelect;
export type Visibility = "public" | "private";
export type IconType = Item["iconType"];
