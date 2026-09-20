import { Lock, Star } from "lucide-react";

interface ItemStateProps {
  visibility: "public" | "private";
  featured: boolean;
}

/**
 * 管理视图里标出 Private 与置顶。三种布局共用一套判断，免得各写一遍。
 * 只负责画，定位交给各自的形状 —— 紧凑布局里它是角标上的小锁，列表里是一枚胶囊。
 */
export function ItemState({ visibility, featured }: ItemStateProps) {
  if (visibility !== "private" && !featured) return null;

  return (
    <span className="flex shrink-0 items-center gap-1">
      {visibility === "private" ? (
        <span
          title="Private：只有登录后可见"
          className="text-muted-foreground bg-secondary inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] leading-none"
        >
          <Lock className="size-3" />
          Private
        </span>
      ) : null}
      {featured ? (
        <span title="置顶" className="text-accent-foreground inline-grid size-6 place-items-center">
          <Star className="size-3.5 fill-current" />
        </span>
      ) : null}
    </span>
  );
}

/**
 * 紧凑布局用的角标：地方只有拇指大，Private 缩成一枚小锁。
 *
 * 摆在顶部那条留白带的**中间**：这条带子的左右两端分别是拖动把手与右上角菜单，
 * 挤到任一端都会和它们叠在一起。角标只在管理视图出现，而管理视图一定有那条带子。
 */
export function ItemStateCompact({ visibility, featured }: ItemStateProps) {
  if (visibility !== "private" && !featured) return null;

  return (
    <span className="pointer-events-none absolute inset-x-7 top-1.5 flex items-center justify-center gap-0.5">
      {visibility === "private" ? (
        <Lock aria-label="Private：只有登录后可见" className="text-muted-foreground size-3" />
      ) : null}
      {featured ? (
        <Star aria-label="置顶" className="text-accent-foreground size-3 fill-current" />
      ) : null}
    </span>
  );
}
