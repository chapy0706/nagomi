import type { DisplayName } from "@/src/domain/value-objects/DisplayName";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

export type Employee = {
  id: string;
  employeeId: EmployeeId;
  displayName: string;
  isActive: boolean;
  authUserId: string | undefined;
  consentAcceptedAt: Date | undefined;
  tutorialCompletedAt: Date | undefined;
  avatarUrl: string | undefined;
};

export type EmployeeRepository = {
  findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined>;
  findByAuthUserId(authUserId: string): Promise<Employee | undefined>;
  recordConsent(employeeId: EmployeeId): Promise<void>;
  completeTutorial(authUserId: string): Promise<void>;
  updateDisplayName(employeeId: EmployeeId, displayName: DisplayName): Promise<void>;
  updateAvatarUrl(employeeId: EmployeeId, url: string | undefined): Promise<void>;
};
