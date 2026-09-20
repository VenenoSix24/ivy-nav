import { z } from "zod";
import { iconFitSchema } from "@/lib/icons/fit";
import { iconTypeValues, visibilityValues } from "@/lib/portal/schemas";
import { parseHttpUrl } from "@/lib/utils/url";

export const BACKUP_FORMAT = "ivy-nav";
export const BACKUP_VERSION = 1;

const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  description: z.string().max(200).nullish(),
  sortOrder: z.number().int().min(0).optional(),
  visibleOnHomepage: z.boolean().optional(),
  visibility: z.enum(visibilityValues).optional(),
  layout: z.enum(["card", "list", "compact"]).nullish(),
});

const itemSchema = z.object({
  title: z.string().trim().min(1).max(80),
  // 导入同样要过协议校验
  url: z
    .string()
    .trim()
    .min(1)
    .refine((value) => parseHttpUrl(value) !== null, {
      message: "只支持 http 与 https",
    }),
  description: z.string().max(300).nullish(),
  iconType: z.enum(iconTypeValues).optional(),
  iconValue: z.string().max(500).nullish(),
  iconPlate: z.boolean().optional(),
  iconMono: z.boolean().optional(),
  iconFit: iconFitSchema.nullish(),
  visibility: z.enum(visibilityValues).optional(),
  sortOrder: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  /** 用分类名而不是分类编号 */
  categoryName: z.string().max(40).nullish(),
  tags: z.array(z.string().max(30)).max(12).optional(),
});

export const backupDocumentSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  // 版本必须严格相等
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().optional(),
  categories: z.array(categorySchema).max(500),
  items: z.array(itemSchema).max(5000),
  tags: z
    .array(z.object({ name: z.string().trim().min(1).max(30) }))
    .max(1000)
    .optional(),
  settings: z
    .array(z.object({ key: z.string().trim().min(1).max(100), value: z.unknown() }))
    .max(200)
    .optional(),
  iconSets: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        source: z.enum(["library", "upload"]),
        version: z.string().max(40).nullish(),
        metadata: z.unknown().optional(),
      }),
    )
    .max(100)
    .optional(),
});

export type BackupDocument = z.infer<typeof backupDocumentSchema>;

export interface ParseResult {
  ok: boolean;
  document?: BackupDocument;
  error?: string;
}

/** 逐条给出「哪里不对」，供导入失败时定位 */
export function parseBackupDocument(input: unknown): ParseResult {
  const parsed = backupDocumentSchema.safeParse(input);
  if (parsed.success) return { ok: true, document: parsed.data };

  const issue = parsed.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "文件内容";
  const versionIssue =
    input &&
    typeof input === "object" &&
    (input as { version?: unknown }).version !== BACKUP_VERSION;

  if (versionIssue) {
    return {
      ok: false,
      error: `备份版本不匹配：当前只支持 version ${BACKUP_VERSION}，请确认文件来自本项目的导出。`,
    };
  }

  return {
    ok: false,
    error: `备份文件解析失败（${path}）：${issue?.message ?? "格式不符合预期"}。`,
  };
}

export function isBackupDocument(input: unknown): input is BackupDocument {
  return backupDocumentSchema.safeParse(input).success;
}
