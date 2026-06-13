import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const RUN = process.env.RUN_INTEGRATION_TESTS === "true";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// 削除バッチの保持期間（関数定義と一致させる）
const ATTENDANCE_RETENTION_MONTHS = 3;
const CALL_RETENTION_MONTHS = 3;

describe.skipIf(!RUN)("log-deletion-batch integration", () => {
  // service_role クライアント（バッチ相当の権限）
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // テスト用の挿入済み ID を追跡し afterEach でクリーンアップ
  const insertedAttendanceIds: string[] = [];
  const insertedCallIds: string[] = [];

  beforeEach(() => {
    insertedAttendanceIds.length = 0;
    insertedCallIds.length = 0;
  });

  afterEach(async () => {
    // テストで挿入したデータを後始末（バッチが削除しなかった分）
    if (insertedAttendanceIds.length > 0) {
      await adminClient.from("attendance_logs").delete().in("id", insertedAttendanceIds);
    }
    if (insertedCallIds.length > 0) {
      await adminClient.from("call_participation_logs").delete().in("id", insertedCallIds);
    }
    // deletion_audit_logs は追記のみ（クリーンアップ不要）
  });

  function pastDate(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
  }

  it("保持期間を超えた attendance_logs が削除される", async () => {
    // 期限切れ（4ヶ月前）と保持対象（1ヶ月前）をそれぞれ挿入
    const expiredAt = pastDate(ATTENDANCE_RETENTION_MONTHS + 1);
    const recentAt = pastDate(1);

    const { data: expiredRow, error: e1 } = await adminClient
      .from("attendance_logs")
      .insert({ logged_in_at: expiredAt, employee_id: "test-deletion-batch" })
      .select("id")
      .single();
    expect(e1).toBeNull();
    const expiredId = expiredRow!.id as string;
    insertedAttendanceIds.push(expiredId);

    const { data: recentRow, error: e2 } = await adminClient
      .from("attendance_logs")
      .insert({ logged_in_at: recentAt, employee_id: "test-deletion-batch" })
      .select("id")
      .single();
    expect(e2).toBeNull();
    const recentId = recentRow!.id as string;
    insertedAttendanceIds.push(recentId);

    // バッチ実行
    const { error: runErr } = await adminClient.rpc("run_log_deletion");
    expect(runErr).toBeNull();

    // 期限切れレコードが消えていること
    const { data: expired } = await adminClient
      .from("attendance_logs")
      .select("id")
      .eq("id", expiredId);
    expect(expired).toHaveLength(0);

    // 保持対象レコードが残っていること
    const { data: recent } = await adminClient
      .from("attendance_logs")
      .select("id")
      .eq("id", recentId);
    expect(recent).toHaveLength(1);

    // insertedAttendanceIds から残ったレコードのみを残す（afterEach が削除できるように）
    const idx = insertedAttendanceIds.indexOf(expiredId);
    if (idx !== -1) insertedAttendanceIds.splice(idx, 1);
  });

  it("保持期間内の attendance_logs は削除されない", async () => {
    const recentAt = pastDate(1);

    const { data: row, error } = await adminClient
      .from("attendance_logs")
      .insert({ logged_in_at: recentAt, employee_id: "test-deletion-batch-retain" })
      .select("id")
      .single();
    expect(error).toBeNull();
    const id = row!.id as string;
    insertedAttendanceIds.push(id);

    const { error: runErr } = await adminClient.rpc("run_log_deletion");
    expect(runErr).toBeNull();

    const { data: after } = await adminClient.from("attendance_logs").select("id").eq("id", id);
    expect(after).toHaveLength(1);
  });

  it("バッチ実行後に deletion_audit_logs が追記される", async () => {
    const beforeCount = await adminClient
      .from("deletion_audit_logs")
      .select("id", { count: "exact", head: true });
    const countBefore = beforeCount.count ?? 0;

    const { error: runErr } = await adminClient.rpc("run_log_deletion");
    expect(runErr).toBeNull();

    const afterCount = await adminClient
      .from("deletion_audit_logs")
      .select("id", { count: "exact", head: true });
    const countAfter = afterCount.count ?? 0;

    // 対象テーブル4つ分のレコードが追記される
    expect(countAfter).toBeGreaterThanOrEqual(countBefore + 4);
  });

  it("保持期間を超えた call_participation_logs が削除される", async () => {
    const expiredAt = pastDate(CALL_RETENTION_MONTHS + 1);
    const recentAt = pastDate(1);

    const { data: expiredRow, error: e1 } = await adminClient
      .from("call_participation_logs")
      .insert({ joined_at: expiredAt, employee_id: "test-deletion-batch", room_id: "test-room" })
      .select("id")
      .single();
    expect(e1).toBeNull();
    const expiredId = expiredRow!.id as string;
    insertedCallIds.push(expiredId);

    const { data: recentRow, error: e2 } = await adminClient
      .from("call_participation_logs")
      .insert({ joined_at: recentAt, employee_id: "test-deletion-batch", room_id: "test-room" })
      .select("id")
      .single();
    expect(e2).toBeNull();
    const recentId = recentRow!.id as string;
    insertedCallIds.push(recentId);

    const { error: runErr } = await adminClient.rpc("run_log_deletion");
    expect(runErr).toBeNull();

    const { data: expired } = await adminClient
      .from("call_participation_logs")
      .select("id")
      .eq("id", expiredId);
    expect(expired).toHaveLength(0);

    const { data: recent } = await adminClient
      .from("call_participation_logs")
      .select("id")
      .eq("id", recentId);
    expect(recent).toHaveLength(1);

    const idx = insertedCallIds.indexOf(expiredId);
    if (idx !== -1) insertedCallIds.splice(idx, 1);
  });
});
