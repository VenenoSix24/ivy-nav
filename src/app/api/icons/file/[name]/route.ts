import { binaryBody, jsonError } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { readUpload, uploadContentType } from "@/lib/icons/uploads";
import { hasGuestVisibleIcon } from "@/lib/portal/queries";

export const dynamic = "force-dynamic";

/** 上传的图标；SVG 走 CSP + sandbox 当静态内容发。 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = readUpload(name);
  if (!body) return jsonError("图标不存在：请重新上传。", 404);

  // 匿名只拿得到「匿名看得见的条目」在用的那份图标
  const session = await getSession();
  if (!session && !hasGuestVisibleIcon(name)) {
    return jsonError("图标不存在：请重新上传。", 404);
  }

  const contentType = uploadContentType(name);

  return new Response(binaryBody(body), {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    },
  });
}
