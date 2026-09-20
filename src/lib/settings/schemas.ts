import { z } from "zod";
import { paletteSchema } from "./appearance";

/**
 * 界面偏好的写入口。布局不在这里 —— 它按分类各存一份，走 /api/categories/:id。
 * 用 strictObject：把布局误发到这里就该报错，而不是被静默忽略。
 */
export const settingsPatchSchema = z.strictObject({
  palette: paletteSchema,
});
