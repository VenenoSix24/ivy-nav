import { z } from "zod";
import { iconFitSchema } from "@/lib/icons/fit";
import { paletteSchema } from "./appearance";

/** 界面偏好的写入口：配色与图标摆法的默认值；布局按分类各存一份，不在这里 */
export const settingsPatchSchema = z
  .strictObject({
    palette: paletteSchema.optional(),
    iconFit: iconFitSchema.optional(),
  })
  // 每一项都可选，整份都是空的就是发错了
  .refine((value) => value.palette !== undefined || value.iconFit !== undefined, {
    message: "没有要改的设置项：请提供配色或图标摆法。",
  });
