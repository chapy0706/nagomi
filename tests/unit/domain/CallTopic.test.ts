import { describe, expect, it } from "vitest";
import { CallTopic, type CallTopicKind } from "@/src/domain/value-objects/CallTopic";

describe("CallTopic.of", () => {
  it("有効な kind から VO を生成できる", () => {
    expect(CallTopic.of("casual").kind).toBe("casual");
    expect(CallTopic.of("counseling").kind).toBe("counseling");
    expect(CallTopic.of("meeting").kind).toBe("meeting");
  });

  it("KINDS には3種類すべてが含まれる", () => {
    expect(CallTopic.KINDS).toEqual(["counseling", "casual", "meeting"]);
  });
});

describe("CallTopic.parse", () => {
  it("有効な文字列は VO に変換される", () => {
    const result = CallTopic.parse("casual");
    expect(result?.kind).toBe("casual");
  });

  it("無効な文字列は undefined", () => {
    expect(CallTopic.parse("unknown")).toBeUndefined();
    expect(CallTopic.parse("")).toBeUndefined();
  });

  it("非文字列は undefined", () => {
    expect(CallTopic.parse(123)).toBeUndefined();
    expect(CallTopic.parse(null)).toBeUndefined();
    expect(CallTopic.parse(undefined)).toBeUndefined();
    expect(CallTopic.parse({})).toBeUndefined();
  });
});

describe("CallTopic.isValidKind", () => {
  it("有効な kind は true", () => {
    expect(CallTopic.isValidKind("casual")).toBe(true);
  });

  it("無効な値は false", () => {
    expect(CallTopic.isValidKind("unknown")).toBe(false);
    expect(CallTopic.isValidKind(null)).toBe(false);
    expect(CallTopic.isValidKind(123)).toBe(false);
  });
});

describe("CallTopic.equals", () => {
  it("同じ kind なら等しい", () => {
    const a = CallTopic.of("casual");
    const b = CallTopic.of("casual");
    expect(a.equals(b)).toBe(true);
  });

  it("異なる kind なら等しくない", () => {
    const a = CallTopic.of("casual");
    const b = CallTopic.of("counseling");
    expect(a.equals(b)).toBe(false);
  });
});

describe("CallTopic.KINDS の型安全", () => {
  it("KINDS の各要素は CallTopicKind として使用可能", () => {
    for (const kind of CallTopic.KINDS) {
      const k: CallTopicKind = kind;
      expect(CallTopic.of(k).kind).toBe(k);
    }
  });
});
