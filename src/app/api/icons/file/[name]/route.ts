import { binaryBody, jsonError } from "@/lib/api/http";
import { readUpload, uploadContentType } from "@/lib/icons/uploads";

export const dynamic = "force-dynamic";

/** 上传的图标；SVG 走 CSP + sandbox 当静态内容发。 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = readUpload(name);
  if (!body) return jsonError("图标不存在：请重新上传。", 404);

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
