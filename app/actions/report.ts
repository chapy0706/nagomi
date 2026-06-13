"use server";

import { redirect } from "next/navigation";
import { SubmitReport } from "@/src/application/use-cases/SubmitReport";
import { REPORT_CATEGORIES, type ReportCategory } from "@/src/domain/entities/Report";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { SupabaseReportGateway } from "@/src/infrastructure/supabase/SupabaseReportGateway";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ReportActionState = {
  success: boolean | undefined;
  errorMessage: string | undefined;
};

/**
 * 通報を送信する Server Action。
 *
 * admin クライアント（service_role）経由で INSERT することで、
 * DB 書き込み時に通報者の認証情報が記録されない。
 * reportedAuthUserId を受け取り、employees.id（内部UUID）へ変換してから保存する。
 */
export async function submitReportAction(
  _prev: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  // セッション検証のみ（通報者IDはDBに書かない）
  const serverClient = await createSupabaseServerClient();
  const { data: authData } = await serverClient.auth.getUser();
  if (!authData.user) redirect("/login");

  const reportedAuthUserId = formData.get("reportedAuthUserId");
  const category = formData.get("category");
  const content = formData.get("content");

  if (
    typeof reportedAuthUserId !== "string" ||
    typeof category !== "string" ||
    typeof content !== "string"
  ) {
    return { success: false, errorMessage: "入力値が不正です" };
  }

  if (!REPORT_CATEGORIES.includes(category as ReportCategory)) {
    return { success: false, errorMessage: "無効なカテゴリです" };
  }

  const adminClient = createSupabaseAdminClient();

  // authUserId → employees.id（内部UUID）に変換
  const empRepo = new SupabaseEmployeeRepository(adminClient);
  const reportedEmployee = await empRepo.findByAuthUserId(reportedAuthUserId);
  if (!reportedEmployee) {
    return { success: false, errorMessage: "通報対象のユーザーが見つかりません" };
  }

  // admin client で INSERT（通報者の auth context は DB に渡らない）
  const gateway = new SupabaseReportGateway(adminClient);
  const useCase = new SubmitReport(gateway, SystemClock);

  const result = await useCase.execute({
    reportedEmployeeId: reportedEmployee.id,
    category: category as ReportCategory,
    content,
  });

  if (!result.success) {
    return { success: false, errorMessage: result.errorMessage };
  }
  return { success: true, errorMessage: undefined };
}
