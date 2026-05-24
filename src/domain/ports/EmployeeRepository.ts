import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

export type Employee = {
  id: string;
  employeeId: EmployeeId;
  displayName: string;
  isActive: boolean;
  authUserId: string | undefined;
};

export type EmployeeRepository = {
  findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined>;
};
