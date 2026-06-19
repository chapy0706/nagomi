import { and, eq, isNull } from "drizzle-orm";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { DisplayName } from "@/src/domain/value-objects/DisplayName";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import type { getDb } from "./client";
import { employees } from "./schema";

type Row = typeof employees.$inferSelect;

function toEmployee(row: Row): Employee {
  return {
    id: row.id,
    employeeId: EmployeeId.parse(row.employeeId),
    displayName: row.displayName,
    isActive: row.isActive,
    authUserId: row.authUserId ?? undefined,
    consentAcceptedAt: row.consentAcceptedAt ?? undefined,
    tutorialCompletedAt: row.tutorialCompletedAt ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
  };
}

export class PostgresEmployeeRepository implements EmployeeRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined> {
    const rows = await this.db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId.value))
      .limit(1);
    return rows[0] ? toEmployee(rows[0]) : undefined;
  }

  async findByAuthUserId(authUserId: string): Promise<Employee | undefined> {
    const rows = await this.db
      .select()
      .from(employees)
      .where(eq(employees.authUserId, authUserId))
      .limit(1);
    return rows[0] ? toEmployee(rows[0]) : undefined;
  }

  async recordConsent(employeeId: EmployeeId): Promise<void> {
    await this.db
      .update(employees)
      .set({ consentAcceptedAt: new Date() })
      .where(eq(employees.employeeId, employeeId.value));
  }

  async completeTutorial(authUserId: string): Promise<void> {
    await this.db
      .update(employees)
      .set({ tutorialCompletedAt: new Date() })
      .where(and(eq(employees.authUserId, authUserId), isNull(employees.tutorialCompletedAt)));
  }

  async updateDisplayName(employeeId: EmployeeId, displayName: DisplayName): Promise<void> {
    await this.db
      .update(employees)
      .set({ displayName: displayName.value })
      .where(eq(employees.employeeId, employeeId.value));
  }

  async updateAvatarUrl(employeeId: EmployeeId, url: string | undefined): Promise<void> {
    await this.db
      .update(employees)
      .set({ avatarUrl: url ?? null })
      .where(eq(employees.employeeId, employeeId.value));
  }
}
