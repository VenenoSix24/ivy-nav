/** 浏览器导出的书签文件（Netscape 格式）解析 */

export interface BookmarkLink {
  title: string;
  url: string;
  description: string | null;
}

export interface BookmarkFolder {
  name: string;
  folders: BookmarkFolder[];
  links: BookmarkLink[];
}

/** 扫描出来的一个标签 */
interface TagToken {
  kind: "tag";
  closing: boolean;
  name: string;
  attrs: Record<string, string>;
}

interface TextToken {
  kind: "text";
  value: string;
}

type Token = TagToken | TextToken;

const STRUCTURAL = new Set(["a", "h3", "dl", "dt", "dd", "p"]);

/** 解析书签 HTML，返回目录树 */
export function parseBookmarksHtml(html: string): BookmarkFolder {
  const root: BookmarkFolder = { name: "", folders: [], links: [] };
  const stack: BookmarkFolder[] = [root];

  let capture: "h3" | "a" | null = null;
  let captured = "";
  let href = "";
  let pendingFolderName: string | null = null;
  let describing: BookmarkLink | null = null;
  let described = "";

  const current = () => stack[stack.length - 1] ?? root;

  for (const token of scan(html)) {
    if (token.kind === "text") {
      if (capture !== null) captured += token.value;
      else if (describing !== null) described += token.value;
      continue;
    }

    const { closing, name, attrs } = token;

    // 说明文字到下一条书签或目录为止
    if (STRUCTURAL.has(name)) {
      if (describing !== null) {
        const text = decodeEntities(described).replace(/\s+/g, " ").trim();
        if (text) describing.description = text;
        describing = null;
        described = "";
      }
    }

    if (closing) {
      if (name === "h3" && capture === "h3") {
        pendingFolderName = decodeEntities(captured).trim();
        capture = null;
        captured = "";
      } else if (name === "a" && capture === "a") {
        const title = decodeEntities(captured).replace(/\s+/g, " ").trim();
        const link: BookmarkLink = { title, url: href, description: null };
        current().links.push(link);
        describing = link;
        capture = null;
        captured = "";
        href = "";
      } else if (name === "dl") {
        // 最外层那个 </DL> 不弹
        if (stack.length > 1) stack.pop();
      }
      continue;
    }

    switch (name) {
      case "h3":
        capture = "h3";
        captured = "";
        break;
      case "a":
        capture = "a";
        captured = "";
        href = attrs.href ?? "";
        break;
      case "dl": {
        const folderName = pendingFolderName;
        pendingFolderName = null;
        if (folderName) {
          const folder: BookmarkFolder = { name: folderName, folders: [], links: [] };
          current().folders.push(folder);
          stack.push(folder);
        } else {
          // 没有前置 <H3> 的 <DL> 原地再压一层
          stack.push(current());
        }
        break;
      }
      case "dd":
        // <DD> 挂在前面那条书签上
        if (describing === null) {
          const last = current().links[current().links.length - 1];
          if (last) {
            describing = last;
            described = "";
          }
        }
        break;
      case "dt":
        capture = null;
        captured = "";
        break;
      default:
        break;
    }
  }

  return root;
}

/** 按序吐出文本与标签 */
function* scan(html: string): Generator<Token> {
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf("<", index);
    if (open === -1) {
      yield { kind: "text", value: html.slice(index) };
      return;
    }
    if (open > index) yield { kind: "text", value: html.slice(index, open) };

    if (html.startsWith("<!--", open)) {
      const end = html.indexOf("-->", open + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", open) || html.startsWith("<?", open)) {
      const end = html.indexOf(">", open);
      index = end === -1 ? html.length : end + 1;
      continue;
    }

    let cursor = open + 1;
    let quote = "";
    while (cursor < html.length) {
      const char = html[cursor]!;
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        break;
      }
      cursor += 1;
    }

    const raw = html.slice(open + 1, cursor);
    index = cursor + 1;

    const closing = raw.startsWith("/");
    const body = closing ? raw.slice(1) : raw;
    const name = /^[a-z0-9]+/i.exec(body.trim())?.[0].toLowerCase();
    if (!name) continue;

    yield { kind: "tag", closing, name, attrs: closing ? {} : parseAttrs(body) };
  }
}

const ATTR = /([a-z0-9_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

function parseAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of body.matchAll(ATTR)) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const ENTITY = /&(#x?[0-9a-f]+|[a-z]+);/gi;

export function decodeEntities(value: string): string {
  if (!value.includes("&")) return value;

  return value.replace(ENTITY, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** 文件里的书签总数（含无标题、网址非法的） */
export function countLinks(folder: BookmarkFolder): number {
  return folder.links.length + folder.folders.reduce((sum, child) => sum + countLinks(child), 0);
}
