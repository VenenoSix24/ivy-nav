import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";

/**
 * settings 是一张键值表，值按 JSON 存。备份的导出/导入已经覆盖它，
 * 所以存在这里的偏好会跟着备份走（设计文档 §21 要求导出 Homepage layout 一类设置）。
 */
export function readSetting<T>(key: string): T | null {
  const row = getDb().select().from(settings).where(eq(settings.key, key)).get();
  return row ? (row.value as T) : null;
}

export function writeSetting(key: string, value: unknown): void {
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
    .run();
}
