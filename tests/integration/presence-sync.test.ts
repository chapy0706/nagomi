import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import type { PresencePayload } from "@/src/domain/ports/PresenceGateway";
import { SupabasePresenceGateway } from "@/src/infrastructure/supabase/SupabasePresenceGateway";

const RUN = process.env.RUN_INTEGRATION_TESTS === "true";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe.skipIf(!RUN)("presence-sync integration", () => {
  const gateways: SupabasePresenceGateway[] = [];

  afterEach(async () => {
    await Promise.all(gateways.map((g) => g.leave()));
    gateways.length = 0;
  });

  function makeGateway() {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const gw = new SupabasePresenceGateway(client);
    gateways.push(gw);
    return gw;
  }

  it("クライアントAがjoinするとクライアントBのonSyncに届く", async () => {
    const gwA = makeGateway();
    const gwB = makeGateway();

    const payloadA: PresencePayload = {
      employeeId: "100000001",
      displayName: "Alice",
      avatarUrl: undefined,
      x: 100,
      y: 200,
      status: "available",
    };

    const synced: PresencePayload[][] = [];

    await gwB.join(
      {
        employeeId: "100000002",
        displayName: "Bob",
        avatarUrl: undefined,
        x: 200,
        y: 200,
        status: "available",
      },
      { onSync: (ps) => synced.push([...ps]), onJoin: () => {}, onLeave: () => {} }
    );

    await sleep(500);

    await gwA.join(payloadA, { onSync: () => {}, onJoin: () => {}, onLeave: () => {} });

    await sleep(1000);

    const found = synced.flat().some((p) => p.employeeId === payloadA.employeeId);
    expect(found).toBe(true);
  });

  it("クライアントAがleaveするとクライアントBのonLeaveに届く", async () => {
    const gwA = makeGateway();
    const gwB = makeGateway();

    const leftIds: string[] = [];

    await gwB.join(
      {
        employeeId: "100000002",
        displayName: "Bob",
        avatarUrl: undefined,
        x: 200,
        y: 200,
        status: "available",
      },
      { onSync: () => {}, onJoin: () => {}, onLeave: (id) => leftIds.push(id) }
    );

    await gwA.join(
      {
        employeeId: "100000001",
        displayName: "Alice",
        avatarUrl: undefined,
        x: 100,
        y: 200,
        status: "available",
      },
      { onSync: () => {}, onJoin: () => {}, onLeave: () => {} }
    );

    await sleep(1000);
    await gwA.leave();
    await sleep(1000);

    expect(leftIds).toContain("100000001");
  });
});
