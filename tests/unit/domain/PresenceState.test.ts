import { describe, expect, it } from "vitest";
import { PresenceState } from "@/src/domain/value-objects/PresenceState";

describe("PresenceState", () => {
  describe("初期状態", () => {
    it("available で生成すると effectiveStatus は available", () => {
      const state = PresenceState.of("available");
      expect(state.effectiveStatus).toBe("available");
      expect(state.manualStatus).toBe("available");
      expect(state.isInCall).toBe(false);
    });

    it("busy で生成すると effectiveStatus は busy", () => {
      const state = PresenceState.of("busy");
      expect(state.effectiveStatus).toBe("busy");
    });

    it("away で生成すると effectiveStatus は away", () => {
      const state = PresenceState.of("away");
      expect(state.effectiveStatus).toBe("away");
    });
  });

  describe("手動ステータス切り替え", () => {
    it("withManualStatus で手動ステータスを変更できる", () => {
      const state = PresenceState.of("available").withManualStatus("busy");
      expect(state.manualStatus).toBe("busy");
      expect(state.effectiveStatus).toBe("busy");
    });

    it("通話中に手動ステータスを変えても effectiveStatus は in_call のまま", () => {
      const state = PresenceState.of("available").enterCall().withManualStatus("away");
      expect(state.effectiveStatus).toBe("in_call");
      expect(state.manualStatus).toBe("away");
    });
  });

  describe("通話による派生ステータス", () => {
    it("enterCall すると effectiveStatus が in_call になる", () => {
      const state = PresenceState.of("available").enterCall();
      expect(state.effectiveStatus).toBe("in_call");
      expect(state.isInCall).toBe(true);
    });

    it("exitCall すると通話前の手動ステータスに戻る", () => {
      const state = PresenceState.of("busy").enterCall().exitCall();
      expect(state.effectiveStatus).toBe("busy");
      expect(state.manualStatus).toBe("busy");
      expect(state.isInCall).toBe(false);
    });

    it("away の状態から通話 → 終了すると away に戻る", () => {
      const state = PresenceState.of("away").enterCall().exitCall();
      expect(state.effectiveStatus).toBe("away");
    });
  });

  describe("isCallable", () => {
    it("available のユーザーは通話招待可能", () => {
      expect(PresenceState.of("available").isCallable()).toBe(true);
    });

    it("busy のユーザーは通話招待不可", () => {
      expect(PresenceState.of("busy").isCallable()).toBe(false);
    });

    it("away のユーザーは通話招待可能", () => {
      expect(PresenceState.of("away").isCallable()).toBe(true);
    });

    it("通話中のユーザーは通話招待不可", () => {
      expect(PresenceState.of("available").enterCall().isCallable()).toBe(false);
    });
  });

  describe("イミュータビリティ", () => {
    it("enterCall は元のインスタンスを変更しない", () => {
      const original = PresenceState.of("available");
      original.enterCall();
      expect(original.isInCall).toBe(false);
    });

    it("withManualStatus は元のインスタンスを変更しない", () => {
      const original = PresenceState.of("available");
      original.withManualStatus("busy");
      expect(original.manualStatus).toBe("available");
    });
  });
});
