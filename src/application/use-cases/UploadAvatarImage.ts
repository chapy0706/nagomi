import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { StorageGateway } from "@/src/domain/ports/StorageGateway";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);

export type UploadAvatarImageInput = {
  authUserId: string;
  file: Blob;
  mimeType: string;
  fileSize: number;
};

export type UploadAvatarImageResult =
  | { success: true; url: string }
  | { success: false; errorMessage: string };

export class UploadAvatarImage {
  constructor(
    private readonly storageGateway: StorageGateway,
    private readonly employeeRepository: EmployeeRepository
  ) {}

  async execute(input: UploadAvatarImageInput): Promise<UploadAvatarImageResult> {
    if (input.fileSize > MAX_FILE_SIZE) {
      return { success: false, errorMessage: "画像は2MB以下にしてください" };
    }
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      return { success: false, errorMessage: "PNG・JPEG・WebP 形式の画像を選択してください" };
    }

    const employee = await this.employeeRepository.findByAuthUserId(input.authUserId);
    if (!employee?.isActive) {
      return { success: false, errorMessage: "アカウントが無効です" };
    }

    const url = await this.storageGateway.uploadAvatarImage(
      input.authUserId,
      employee.employeeId,
      input.file,
      input.mimeType
    );
    await this.employeeRepository.updateAvatarUrl(employee.employeeId, url);
    return { success: true, url };
  }
}
