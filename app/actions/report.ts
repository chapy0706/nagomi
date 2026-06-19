"use server";

import { redirect } from "next/navigation";
import { SubmitReport } from "@/src/application/use-cases/SubmitReport";
import { REPORT_CATEGORIES, type ReportCategory } from "@/src/domain/entities/Report";
import {
  createEmployeeRepository,
  createReportGateway,
} from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ReportActionState = {
  success: boolean | undefined;
  errorMessage: string | undefined;
};

export async function submitReportAction(
  _prev: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
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

  const reportedEmployee = await createEmployeeRepository().findByAuthUserId(reportedAuthUserId);
  if (!reportedEmployee) {
    return { success: false, errorMessage: "通報対象のユーザーが見つかりません" };
  }

  const result = await new SubmitReport(createReportGateway(), SystemClock).execute({
    reportedEmployeeId: reportedEmployee.id,
    category: category as ReportCategory,
    content,
  });

  if (!result.success) {
    return { success: false, errorMessage: result.errorMessage };
  }
  return { success: true, errorMessage: undefined };
}
