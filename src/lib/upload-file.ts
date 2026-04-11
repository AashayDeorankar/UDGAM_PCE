/**
 * Upload a file to S3 via presigned PUT URL from the API.
 * File goes to: S3 bucket, key = {branchCode}/{notes|ppt|papers}/{timestamp}_{fileName}
 */
import { getApiBase } from "@/lib/api-base";

export async function uploadResourceFile(
  file: File,
  branchCode: string,
  category: string
): Promise<{ url: string } | { error: string }> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/upload-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchCode,
        category,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: (err as { error?: string }).error || res.statusText || "Failed to get upload URL" };
    }
    const { uploadUrl, fileUrl } = (await res.json()) as { uploadUrl: string; fileUrl: string };
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    if (!putRes.ok) {
      return { error: `S3 upload failed: ${putRes.status} ${putRes.statusText}` };
    }
    return { url: fileUrl };
  } catch (err) {
    console.error("[Upload] error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to upload file",
    };
  }
}
