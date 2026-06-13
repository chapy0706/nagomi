import { expect, test } from "@playwright/test";

// モバイルビューポートでの基本動作テスト
// Mobile Chrome / Mobile Safari プロジェクトで実行される

test.describe("モバイル: 認証ミドルウェア", () => {
  test("未認証ユーザーはログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ログイン画面はモバイルで表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "nagomi" })).toBeVisible();
  });
});

test.describe("モバイル: ログインフォームのアクセシビリティ", () => {
  test("社員ID入力フィールドがタッチ可能なサイズ（44px以上）", async ({ page }) => {
    await page.goto("/login");
    const input = page.getByLabel("社員ID");
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("PIN入力フィールドがタッチ可能なサイズ（44px以上）", async ({ page }) => {
    await page.goto("/login");
    const input = page.getByLabel("PIN");
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("ログインボタンがタッチ可能なサイズ（44px以上）", async ({ page }) => {
    await page.goto("/login");
    const button = page.getByRole("button", { name: "ログイン" });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("ログインページがビューポート幅に収まる", async ({ page }) => {
    await page.goto("/login");
    // 横スクロールが発生しないことを確認
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px の誤差を許容
  });
});

test.describe("モバイル: チュートリアルページ", () => {
  test("未認証でチュートリアルページにアクセスするとログインにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/onboarding/tutorial");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("モバイル: 設定ページ群", () => {
  test("未認証で設定ページにアクセスするとログインにリダイレクトされる", async ({ page }) => {
    await page.goto("/settings/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});
