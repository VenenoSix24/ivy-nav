import { iconifySource } from "./iconify";
import { simpleIconsSource } from "./simple-icons";
import { listIconSets, iconSetSourceById } from "./sets";
import type { LibrarySource } from "./types";

/**
 * 图标库的登记处。顺序就是界面上那排胶囊的顺序，也是默认挑选的优先级 ——
 * 品牌标志（Simple Icons）最好用，聚合库（Iconify）最全，Lucide 那种线性图标排最后。
 *
 * Lucide 不在这张表里：它整套都在本地、由前端直接渲染成组件（跟着主题变色），
 * 走这条路反而要绕一圈 HTTP，所以它在选择器里单独一档（由选择器直接渲染）。
 */
const BUILT_IN: LibrarySource[] = [simpleIconsSource, iconifySource];

export function libraryList(): Array<{
  id: string;
  label: string;
  hint: string;
  colorModes: string[];
  removable: boolean;
}> {
  const sets = listIconSets().map((set) => {
    const source = iconSetSourceById(set.id);
    return {
      id: `set:${set.id}`,
      label: set.name,
      hint: source?.hint ?? `${set.count} 个图标（自建集）`,
      colorModes: ["original"],
      removable: true,
    };
  });

  return [
    ...BUILT_IN.map((source) => ({
      id: source.id,
      label: source.label,
      hint: source.hint,
      colorModes: source.colorModes as string[],
      removable: false,
    })),
    ...sets,
  ];
}

export function findSource(id: string): LibrarySource | null {
  const builtIn = BUILT_IN.find((source) => source.id === id);
  if (builtIn) return builtIn;

  // `set:<编号>`：自建集存在库里，每次现取
  const match = /^set:(\d+)$/.exec(id);
  if (!match) return null;
  return iconSetSourceById(Number(match[1]));
}

export type { IconHit, LibrarySearchResult, LibrarySource } from "./types";
