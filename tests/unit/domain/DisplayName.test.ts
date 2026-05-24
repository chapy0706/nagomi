import { describe, expect, it } from "vitest";
import { DisplayName } from "@/src/domain/value-objects/DisplayName";

describe("DisplayName.parse", () => {
  it("通常の名前は有効", () => {
    const d = DisplayName.parse("田中 太郎");
    expect(d.value).toBe("田中 太郎");
  });

  it("1文字は有効", () => {
    expect(DisplayName.parse("A").value).toBe("A");
  });

  it("30文字は有効", () => {
    expect(DisplayName.parse("a".repeat(30)).value).toBe("a".repeat(30));
  });

  it("前後の空白はトリムされる", () => {
    expect(DisplayName.parse("  太郎  ").value).toBe("太郎");
  });

  it("空文字は無効", () => {
    expect(() => DisplayName.parse("")).toThrow();
  });

  it("空白のみは無効", () => {
    expect(() => DisplayName.parse("   ")).toThrow();
  });

  it("31文字は無効", () => {
    expect(() => DisplayName.parse("a".repeat(31))).toThrow();
  });

  it("< を含む名前は無効", () => {
    expect(() => DisplayName.parse("田中<太郎>")).toThrow();
  });

  it("& を含む名前は無効", () => {
    expect(() => DisplayName.parse("Alice&Bob")).toThrow();
  });

  it("管理者 を含む名前は無効", () => {
    expect(() => DisplayName.parse("管理者A")).toThrow();
  });

  it("admin を含む名前は無効（大文字小文字問わず）", () => {
    expect(() => DisplayName.parse("Admin")).toThrow();
    expect(() => DisplayName.parse("ADMIN太郎")).toThrow();
  });

  it("system を含む名前は無効", () => {
    expect(() => DisplayName.parse("system")).toThrow();
  });

  it("数値は無効", () => {
    expect(() => DisplayName.parse(123)).toThrow();
  });
});

describe("DisplayName.initial", () => {
  it("seq=1 で User1 を生成する", () => {
    expect(DisplayName.initial(1).value).toBe("User1");
  });

  it("seq=99 で User99 を生成する", () => {
    expect(DisplayName.initial(99).value).toBe("User99");
  });
});

describe("DisplayName.equals", () => {
  it("同じ値は等しい", () => {
    expect(DisplayName.parse("太郎").equals(DisplayName.parse("太郎"))).toBe(true);
  });

  it("異なる値は等しくない", () => {
    expect(DisplayName.parse("太郎").equals(DisplayName.parse("花子"))).toBe(false);
  });
});
