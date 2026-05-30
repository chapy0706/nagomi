import { describe, expect, it, vi } from "vitest";
import { LeaveFloor } from "@/src/application/use-cases/LeaveFloor";
import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";

function makeFakeGateway() {
  let leaveCount = 0;
  const gateway: PresenceGateway = {
    join: vi.fn(async () => {}),
    updatePosition: vi.fn(async () => {}),
    updateStatus: vi.fn(async () => {}),
    leave: vi.fn(async () => {
      leaveCount++;
    }),
  };
  return { gateway, getLeaveCount: () => leaveCount };
}

describe("LeaveFloor", () => {
  it("presenceGateway.leave を呼び出す", async () => {
    const { gateway, getLeaveCount } = makeFakeGateway();
    const useCase = new LeaveFloor(gateway);
    await useCase.execute();
    expect(getLeaveCount()).toBe(1);
  });

  it("複数回呼んでも各回 leave が呼ばれる", async () => {
    const { gateway, getLeaveCount } = makeFakeGateway();
    const useCase = new LeaveFloor(gateway);
    await useCase.execute();
    await useCase.execute();
    expect(getLeaveCount()).toBe(2);
  });
});
