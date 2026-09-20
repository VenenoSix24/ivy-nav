import { z } from "zod";
import { iconFitSchema } from "@/lib/icons/fit";
import { paletteSchema } from "./appearance";

/**
 * 界面偏好的写入口。布局不在这里 —— 它按分类各存一份，走 /api/categories/:id；
 * 条目图标怎么摆的**默认值**在这里，条目自己那份走 /api/items/:id。
 * 用 strictObject：把布局误发到这里就该报错，而不是被静默忽略。
 */
export const settingsPatchSchema = z
  .strictObject({
    palette: paletteSchema.optional(),
    iconFit: iconFitSchema.optional(),
  })
  // 每一项都是可选的（可以只改一项），但整份都是空的就是发错了
  .refine((value) => value.palette !== undefined || value.iconFit !== undefined, {
    message: "没有要改的设置项：请提供配色或图标摆法。",
  });
