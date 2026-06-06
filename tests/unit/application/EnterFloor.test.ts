import { describe, expect, it, vi } from "vitest";
import { EnterFloor } from "@/src/application/use-cases/EnterFloor";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type {
  PresenceGateway,
  PresenceHandlers,
  PresencePayload,
} from "@/src/domain/ports/PresenceGateway";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);

const noopHandlers: PresenceHandlers = {
  onSync: () => {},
  onJoin: () => {},
  onLeave: () => {},
};

function makeEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: "uuid-1",
    employeeId: EmployeeId.parse("100000001"),
    displayName: "Test User",
    isActive: true,
    authUserId: "auth-uuid",
    consentAcceptedAt: new Date(),
    avatarUrl: undefined,
    ...overrides,
  };
}

function makeRepo(employee: Employee | undefined): EmployeeRepository {
  return {
    findByEmployeeId: async () => undefined,
    findByAuthUserId: async () => employee,
    recordConsent: async () => {},
    updateDisplayName: async () => {},
    updateAvatarUrl: async () => {},
  };
}

function makeFakeGateway() {
  const joined: { payload: PresencePayload; handlers: PresenceHandlers }[] = [];
  const gateway: PresenceGateway = {
    join: vi.fn(async (payload, handlers) => {
      joined.push({ payload, handlers });
    }),
    updatePosition: vi.fn(async () => {}),
    updateStatus: vi.fn(async () => {}),
    updateRoom: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
  };
  return { gateway, joined };
}

describe("EnterFloor", () => {
  it("有効な社員はフロアに参加でき位置を返す", async () => {
    const { gateway, joined } = makeFakeGateway();
    const useCase = new EnterFloor(makeRepo(makeEmployee()), gateway);
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      floor,
      occupiedPositions: [],
      handlers: noopHandlers,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(floor.containsPosition(result.position)).toBe(true);
    }
    expect(joined).toHaveLength(1);
  });

  it("gateway.join に employeeId・displayName・status を渡す", async () => {
    const emp = makeEmployee({ displayName: "花子" });
    const { gateway, joined } = makeFakeGateway();
    const useCase = new EnterFloor(makeRepo(emp), gateway);
    await useCase.execute({
      authUserId: "auth-uuid",
      floor,
      occupiedPositions: [],
      handlers: noopHandlers,
    });

    expect(joined[0].payload.employeeId).toBe(emp.employeeId.value);
    expect(joined[0].payload.displayName).toBe("花子");
    expect(joined[0].payload.status).toBe("available");
  });

  it("社員が見つからない場合はエラーを返しjoinしない", async () => {
    const { gateway, joined } = makeFakeGateway();
    const useCase = new EnterFloor(makeRepo(undefined), gateway);
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      floor,
      occupiedPositions: [],
      handlers: noopHandlers,
    });

    expect(result.success).toBe(false);
    expect(joined).toHaveLength(0);
  });

  it("is_active = false の社員はエラーを返しjoinしない", async () => {
    const { gateway, joined } = makeFakeGateway();
    const useCase = new EnterFloor(makeRepo(makeEmployee({ isActive: false })), gateway);
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      floor,
      occupiedPositions: [],
      handlers: noopHandlers,
    });

    expect(result.success).toBe(false);
    expect(joined).toHaveLength(0);
  });

  it("既存アバターがいる場合は距離が離れた位置を返す", async () => {
    const { gateway } = makeFakeGateway();
    const useCase = new EnterFloor(makeRepo(makeEmployee()), gateway);
    const { Position } = await import("@/src/domain/value-objects/Position");
    const occupied = [Position.create(50, 50)];
    const result = await useCase.execute({
      authUserId: "auth-uuid",
      floor,
      occupiedPositions: occupied,
      handlers: noopHandlers,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.position.distanceTo(occupied[0])).toBeGreaterThanOrEqual(80);
    }
  });
});
