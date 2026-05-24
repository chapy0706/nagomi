import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

export type StorageGateway = {
  uploadAvatarImage(
    ownerId: string,
    employeeId: EmployeeId,
    file: Blob,
    mimeType: string
  ): Promise<string>;
};
