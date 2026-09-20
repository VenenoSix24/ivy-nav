/** 会执行代码或嵌入外部内容的元素，连内容一起删掉 */
const FORBIDDEN_ELEMENTS = ["script", "foreignObject", "iframe", "embed", "object", "handler"];

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const REMOTE_IN_STYLE = /url\s*\(|@import|expression\s*\(/i;

/** 只允许同文档内的引用（#fragment 与相对路径） */
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

/** style 里的 url() 与 @import 也要去掉 */
function dropRemoteStyles(svg: string): string {
  return svg
    .replace(/<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (match, raw: string) =>
      REMOTE_IN_STYLE.test(raw.replace(/^["']|["']$/g, "")) ? "" : match,
    );
}

/** 清洗用户上传的 SVG */
export function sanitizeSvg(source: string): string {
  // 去掉 DOCTYPE 与 ENTITY
  let out = source.replace(/<!DOCTYPE[\s\S]*?>/gi, "").replace(/<!ENTITY[^>]*>/gi, "");

  for (const tag of FORBIDDEN_ELEMENTS) {
    out = out.replace(
      new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, "gi"),
      "",
    );
    out = out.replace(new RegExp(`<\\s*${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = dropRemoteStyles(out);
  out = keepOnlyLocalReferences(out);

  return out;
}

/** 清洗后的内容还得是一份 SVG */
export function looksLikeSvg(source: string): boolean {
  const head = source.trimStart().slice(0, 512).toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}
