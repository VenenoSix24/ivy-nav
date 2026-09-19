/** 会执行代码或嵌入外部内容的元素，一律连内容一起删掉。 */
const FORBIDDEN_ELEMENTS = ["script", "foreignObject", "iframe", "embed", "object", "handler"];

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * 只允许同文档内的引用（#fragment 与相对路径）：外部地址既能外传数据，
 * 也能把图标变成远程加载入口。
 */
function keepOnlyLocalReferences(svg: string): string {
  return svg.replace(
    /\s(href|xlink:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, _attribute: string, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, "").trim();
      const isLocal = value.startsWith("#") || (!HAS_SCHEME.test(value) && !value.startsWith("//"));
      return isLocal ? match : "";
    },
  );
}

/**
 * 用户上传的 SVG 不能直接信任。这里的清洗是纵深防御的一层：
 * 真正兜底的是 /api/icons/file 上的 CSP sandbox，以及图标只用 <img> 渲染
 * （通过 img 加载的 SVG 不会执行脚本）。
 */
export function sanitizeSvg(source: string): string {
  let out = source;

  for (const tag of FORBIDDEN_ELEMENTS) {
    out = out.replace(
      new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, "gi"),
      "",
    );
    out = out.replace(new RegExp(`<\\s*${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = keepOnlyLocalReferences(out);

  return out;
}

/** 清洗后的内容还必须确实是一份 SVG，别把 HTML 当图标存进来。 */
export function looksLikeSvg(source: string): boolean {
  const head = source.trimStart().slice(0, 512).toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}
