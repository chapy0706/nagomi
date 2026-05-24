"use server";

import { redirect } from "next/navigation";
import { UpdateDisplayName } from "@/src/application/use-cases/UpdateDisplayName";
import { UploadAvatarImage } from "@/src/application/use-cases/UploadAvatarImage";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { SupabaseStorageGateway } from "@/src/infrastructure/supabase/SupabaseStorageGateway";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ProfileActionState = {
  errorMessage: string | undefined;
  successMessage: string | undefined;
};

async function getAuthUserId(): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}

export async function updateDisplayNameAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const authUserId = await getAuthUserId();

  const adminClient = createSupabaseAdminClient();
  const employeeRepository = new SupabaseEmployeeRepository(adminClient);
  const useCase = new UpdateDisplayName(employeeRepository);

  const result = await useCase.execute({
    authUserId,
    newDisplayName: formData.get("displayName"),
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage, successMessage: undefined };
  }
  return { errorMessage: undefined, successMessage: "表示名を更新しました" };
}

export async function uploadAvatarAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const authUserId = await getAuthUserId();

  const file = formData.get("avatar");
  if (!(file instanceof Blob) || file.size === 0) {
    return { errorMessage: "ファイルを選択してください", successMessage: undefined };
  }

  const mimeType = file.type;
  const adminClient = createSupabaseAdminClient();
  const serverClient = await createSupabaseServerClient();
  const employeeRepository = new SupabaseEmployeeRepository(adminClient);
  const storageGateway = new SupabaseStorageGateway(serverClient);
  const useCase = new UploadAvatarImage(storageGateway, employeeRepository);

  const result = await useCase.execute({
    authUserId,
    file,
    mimeType,
    fileSize: file.size,
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage, successMessage: undefined };
  }
  return { errorMessage: undefined, successMessage: "アバター画像を更新しました" };
}
