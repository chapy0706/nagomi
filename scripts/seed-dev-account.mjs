/**
 * テストアカウント作成スクリプト（hosted Supabase 用）
 *
 * 使い方:
 *   node --env-file=.env.local scripts/seed-dev-account.mjs
 *
 * .env.local に以下が設定されていること:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
 *
 * 作成されるアカウント:
 *   社員番号 : 200016186
 *   PIN      : 000000
 *   表示名   : テストユーザー
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です\n" +
      "  node --env-file=.env.local scripts/seed-dev-account.mjs"
  );
  process.exit(1);
}

const EMPLOYEE_ID = "200016186";
const TEST_PIN = "000000";
const DISPLAY_NAME = "テストユーザー";
const EMAIL = `${EMPLOYEE_ID}@employees.internal`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- 1. auth ユーザーを作成または取得 ---
let authUserId;

const { data: createData, error: createError } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: TEST_PIN,
  email_confirm: true,
});

if (createError) {
  // 422 = User already registered
  if (createError.status === 422) {
    console.log("auth user が既に存在します。既存ユーザーを取得します...");
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("ユーザー一覧の取得に失敗:", listError.message);
      process.exit(1);
    }
    const existing = listData.users.find((u) => u.email === EMAIL);
    if (!existing) {
      console.error("既存ユーザーが見つかりませんでした");
      process.exit(1);
    }
    authUserId = existing.id;
    console.log("✓ 既存 auth user:", authUserId);
  } else {
    console.error("auth user 作成に失敗:", createError.message);
    process.exit(1);
  }
} else {
  authUserId = createData.user.id;
  console.log("✓ auth user を作成:", authUserId);
}

// --- 2. employees テーブルに upsert ---
const { error: empError } = await supabase.from("employees").upsert(
  {
    employee_id: EMPLOYEE_ID,
    display_name: DISPLAY_NAME,
    auth_user_id: authUserId,
    consent_accepted_at: new Date().toISOString(),
  },
  { onConflict: "employee_id" }
);

if (empError) {
  console.error("employees への upsert に失敗:", empError.message);
  process.exit(1);
}

console.log("✓ employees を更新しました");
console.log("");
console.log("=== テストアカウント ===");
console.log(`  社員番号 : ${EMPLOYEE_ID}`);
console.log(`  PIN      : ${TEST_PIN}`);
console.log(`  表示名   : ${DISPLAY_NAME}`);
console.log("========================");
