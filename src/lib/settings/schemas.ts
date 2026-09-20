import { z } from "zod";
import { paletteSchema } from "./appearance";
import { layoutSchema } from "./homepage";

/**
 * 界面偏好的写入口。两项都是可选的，但至少要给一项 —— 空请求说明调用方搞错了，
 * 与其静默成功不如直接报出来（开发规范 §2.3）。
 */
export const settingsPatchSchema = z
  .object({
    palette: paletteSchema.optional(),
    layout: layoutSchema.optional(),
  })
  .refine((value) => value.palette !== undefined || value.layout !== undefined, {
    message: "没有要改的设置：请至少给出一项。",
  });

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
