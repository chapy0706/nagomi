import { describe, expect, it } from "vitest";
import { Pin } from "@/src/domain/value-objects/Pin";

describe("Pin.parse", () => {
  it("6桁の数字は有効", () => {
    const pin = Pin.parse("123456");
    expect(pin.value).toBe("123456");
  });

  it("8桁の数字は有効", () => {
    const pin = Pin.parse("12345678");
    expect(pin.value).toBe("12345678");
  });

  it("先頭がゼロでも有効", () => {
    const pin = Pin.parse("000000");
    expect(pin.value).toBe("000000");
  });

  it("5桁は無効", () => {
    expect(() => Pin.parse("12345")).toThrow();
  });

  it("空文字は無効", () => {
    expect(() => Pin.parse("")).toThrow();
  });

  it("数字以外を含む場合は無効", () => {
    expect(() => Pin.parse("12345a")).toThrow();
  });

  it("数字以外を含む場合は無効（記号）", () => {
    expect(() => Pin.parse("123-456")).toThrow();
  });

  it("undefined は無効", () => {
    expect(() => Pin.parse(undefined)).toThrow();
  });

  it("number 型は無効", () => {
    expect(() => Pin.parse(123456)).toThrow();
  });
});

describe("Pin.toString", () => {
  it("文字列表現を返す", () => {
    expect(Pin.parse("123456").toString()).toBe("123456");
  });
});
