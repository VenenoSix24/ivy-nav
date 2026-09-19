import { z } from "zod";
import { normalizeUrl, parseHttpUrl } from "@/lib/utils/url";

export const visibilityValues = ["public", "private"] as const;

export const iconTypeValues = [
  "favicon",
  "emoji",
  "lucide",
  "simple-icons",
  "iconify",
  "upload",
  "none",
] as const;

/** 只接受 http(s)，并把裸域名补成 https —— 存进去之前就挡住 javascript: 之类（设计文档 §45）。 */
const urlField = z
  .string()
  .trim()
  .min(1, "网址不能为空：请填写后重试。")
  .refine((value) => parseHttpUrl(value) !== null, {
    message: "网址只支持 http 与 https：请检查后重试。",
  })
  .transform((value) => normalizeUrl(value) ?? value);

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "分类名不能为空：请填写后重试。")
    .max(40, "分类名过长：上限 40 个字符。"),
  description: z.string().trim().max(200, "分类说明过长：上限 200 个字符。").nullish(),
  visibleOnHomepage: z.boolean().optional(),
  visibility: z.enum(visibilityValues).optional(),
});

export const itemInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "标题不能为空：请填写后重试。")
    .max(80, "标题过长：上限 80 个字符。"),
  url: urlField,
  description: z.string().trim().max(300, "描述过长：上限 300 个字符。").nullish(),
  categoryId: z.number().int().positive().nullish(),
  tagNames: z
    .array(z.string().trim().max(30, "单个标签过长：上限 30 个字符。"))
    .max(12, "标签最多 12 个：请先合并或删除。")
    .optional(),
  iconType: z.enum(iconTypeValues).optional(),
  iconValue: z.string().trim().max(500, "图标值过长：上限 500 个字符。").nullish(),
  visibility: z.enum(visibilityValues).optional(),
  featured: z.boolean().optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1, "缺少排序结果：请重试。"),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ItemInput = z.infer<typeof itemInputSchema>;

/** 标签按大小写不敏感去重，顺手去掉用户习惯带的 # 前缀。 */
export function normalizeTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const name = raw.trim().replace(/^#+/, "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

/** 表单里标签用空格或逗号分隔，一个字段收完。 */
export function parseTagInput(value: string): string[] {
  return normalizeTagNames(value.split(/[,，\s]+/));
}
