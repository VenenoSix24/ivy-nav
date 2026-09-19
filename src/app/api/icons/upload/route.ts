import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { MAX_UPLOAD_BYTES, UploadError, saveUpload } from "@/lib/icons/uploads";

export async function POST(request: Request) {
  return withAdmin(async () => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("没有收到上传内容：请重新选择文件。", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("没有收到上传内容：请重新选择文件。", 400);

    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError("文件超过 512 KB：请压缩后重试。", 400);
    }

    try {
      const filename = saveUpload(Buffer.from(await file.arrayBuffer()), file.type);
      return jsonOk({ filename });
    } catch (error) {
      if (error instanceof UploadError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
