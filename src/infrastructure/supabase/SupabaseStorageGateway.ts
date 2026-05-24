import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageGateway } from "@/src/domain/ports/StorageGateway";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

const BUCKET = "avatars";
const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class SupabaseStorageGateway implements StorageGateway {
  constructor(private readonly client: SupabaseClient) {}

  async uploadAvatarImage(
    ownerId: string,
    employeeId: EmployeeId,
    file: Blob,
    mimeType: string
  ): Promise<string> {
    const ext = EXT_MAP[mimeType] ?? "bin";
    const path = `${ownerId}/${employeeId.value}.${ext}`;

    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, file, { contentType: mimeType, upsert: true });

    if (error) throw new Error(`アバター画像のアップロードに失敗しました: ${error.message}`);

    const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
