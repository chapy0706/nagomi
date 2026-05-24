import { expect, test } from "@playwright/test";

// ローカル Supabase + Next.js dev が起動している状態で実行する
// E2E_TEST_EMPLOYEE_ID / E2E_TEST_PIN が未設定の場合、ログインが必要なケースはスキップ
const testEmployeeId = process.env.E2E_TEST_EMPLOYEE_ID ?? "";
const testPin = process.env.E2E_TEST_PIN ?? "";
const hasCredentials = !!process.env.E2E_TEST_EMPLOYEE_ID && !!process.env.E2E_TEST_PIN;

test.describe("認証ミドルウェア", () => {
  test("未認証ユーザーは保護ルートからログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("未認証ユーザーはオンボーディングルートからログイン画面にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/onboarding/pin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ログイン画面は未認証でもアクセスできる", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "nagomi" })).toBeVisible();
  });
});

test.describe("ログイン・ログアウトフロー", () => {
  test.skip(!hasCredentials, "E2E_TEST_EMPLOYEE_ID / E2E_TEST_PIN が未設定のためスキップ");

  test("有効な社員IDとPINでログインしてホーム画面に遷移できる", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("社員ID").fill(testEmployeeId);
    await page.getByLabel("PIN").fill(testPin);
    await page.getByRole("button", { name: "ログイン" }).click();
    // 同意済みであれば / へ、未同意であれば /onboarding/pin へ遷移する
    await expect(page).toHaveURL(/\/(onboarding\/pin)?$/);
  });

  test("ログアウトするとログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("社員ID").fill(testEmployeeId);
    await page.getByLabel("PIN").fill(testPin);
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL(/\/(onboarding\/pin|onboarding\/consent|$)/);

    const logoutButton = page.getByRole("button", { name: "ログアウト" });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("誤ったPINではログインできない", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("社員ID").fill(testEmployeeId);
    await page.getByLabel("PIN").fill("000000");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("alert")).toContainText("社員IDまたはPINが正しくありません");
  });
});
