import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import type { Pin } from "@/src/domain/value-objects/Pin";

export type AuthResult =
  | { success: true; authUserId: string }
  | { success: false; reason: "invalid_credentials" | "unknown" };

export type AuthGateway = {
  signIn(employeeId: EmployeeId, pin: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getAuthUserId(): Promise<string | undefined>;
  updatePassword(newPin: Pin): Promise<void>;
};
