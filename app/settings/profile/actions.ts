"use server";

import { UpdateDisplayName } from "@/src/application/use-cases/UpdateDisplayName";
import { UploadAvatarImage } from "@/src/application/use-cases/UploadAvatarImage";
import {
  createEmployeeRepository,
  createStorageGateway,
} from "@/src/infrastructure/repositoryFactory";
import { getAuthUserIdOrRedirect } from "@/src/infrastructure/session";

export type ProfileActionState = {
  errorMessage: string | undefined;
  successMessage: string | undefined;
};

export async function updateDisplayNameAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const authUserId = await getAuthUserIdOrRedirect();

  const result = await new UpdateDisplayName(createEmployeeRepository()).execute({
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
  const authUserId = await getAuthUserIdOrRedirect();

  const file = formData.get("avatar");
  if (!(file instanceof Blob) || file.size === 0) {
    return { errorMessage: "ファイルを選択してください", successMessage: undefined };
  }

  const mimeType = file.type;
  const storageGateway = await createStorageGateway();
  const result = await new UploadAvatarImage(storageGateway, createEmployeeRepository()).execute({
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
