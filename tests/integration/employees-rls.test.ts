import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// 明示的なオプトインが必要。RUN_INTEGRATION_TESTS=true make test/integ で実行する
const runIntegration = !!process.env.RUN_INTEGRATION_TESTS;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

describe.skipIf(!runIntegration)("employees RLS", () => {
  let adminClient: SupabaseClient;
  let userAClient: SupabaseClient;
  const createdEmployeeIds: string[] = [];
  const createdAuthUserIds: string[] = [];

  const testUserA = {
    email: "rls-test-a@employees.internal",
    password: "rls-test-password-a",
    employeeId: "900000001",
    displayName: "RLS Test User A",
  };

  const testUserB = {
    email: "rls-test-b@employees.internal",
    password: "rls-test-password-b",
    employeeId: "900000002",
    displayName: "RLS Test User B",
  };

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // テスト用の auth ユーザーを作成
    const { data: authA } = await adminClient.auth.admin.createUser({
      email: testUserA.email,
      password: testUserA.password,
      email_confirm: true,
    });
    if (authA.user) createdAuthUserIds.push(authA.user.id);

    const { data: authB } = await adminClient.auth.admin.createUser({
      email: testUserB.email,
      password: testUserB.password,
      email_confirm: true,
    });
    if (authB.user) createdAuthUserIds.push(authB.user.id);

    // employees レコードを作成（auth_user_id を紐付け）
    const { data: empA } = await adminClient
      .from("employees")
      .insert({
        employee_id: testUserA.employeeId,
        display_name: testUserA.displayName,
        auth_user_id: authA.user?.id,
        is_active: true,
      })
      .select("id")
      .single();
    if (empA) createdEmployeeIds.push(empA.id);

    const { data: empB } = await adminClient
      .from("employees")
      .insert({
        employee_id: testUserB.employeeId,
        display_name: testUserB.displayName,
        auth_user_id: authB.user?.id,
        is_active: true,
      })
      .select("id")
      .single();
    if (empB) createdEmployeeIds.push(empB.id);

    // User A としてサインイン
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: session } = await anonClient.auth.signInWithPassword({
      email: testUserA.email,
      password: testUserA.password,
    });
    userAClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      },
    });
  });

  afterAll(async () => {
    // テストデータを削除（ログ系以外はアプリから DELETE 可能なのは service_role のみ）
    if (createdEmployeeIds.length > 0) {
      await adminClient.from("employees").delete().in("id", createdEmployeeIds);
    }
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

  it("認証済みユーザーは自分のレコードのみ参照できる", async () => {
    const { data, error } = await userAClient.from("employees").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.employee_id).toBe(testUserA.employeeId);
  });

  it("他のユーザーのレコードは参照できない", async () => {
    const { data } = await userAClient.from("employees").select("*");
    const found = data?.find(
      (e: { employee_id: string }) => e.employee_id === testUserB.employeeId
    );
    expect(found).toBeUndefined();
  });

  it("未認証では参照できない", async () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anonClient.from("employees").select("*");
    expect(data).toHaveLength(0);
  });

  it("認証済みユーザーは INSERT できない", async () => {
    const { error } = await userAClient.from("employees").insert({
      employee_id: "900000099",
      display_name: "Unauthorized",
    });
    expect(error).not.toBeNull();
  });

  it("認証済みユーザーは UPDATE できない", async () => {
    const { error } = await userAClient
      .from("employees")
      .update({ display_name: "Hacked" })
      .eq("employee_id", testUserA.employeeId);
    expect(error).not.toBeNull();
  });
});
