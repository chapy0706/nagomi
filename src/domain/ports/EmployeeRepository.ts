import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

export type Employee = {
  id: string;
  employeeId: EmployeeId;
  displayName: string;
  isActive: boolean;
  authUserId: string | undefined;
  consentAcceptedAt: Date | undefined;
};

export type EmployeeRepository = {
  findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined>;
  findByAuthUserId(authUserId: string): Promise<Employee | undefined>;
  recordConsent(employeeId: EmployeeId): Promise<void>;
};
