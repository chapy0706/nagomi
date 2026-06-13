import { redirect } from "next/navigation";
import { DailyActiveUsersChart } from "@/app/admin/_components/DailyActiveUsersChart";
import { DailyCallsChart } from "@/app/admin/_components/DailyCallsChart";
import { DeletionAuditTable } from "@/app/admin/_components/DeletionAuditTable";
import { HourlyHeatmap } from "@/app/admin/_components/HourlyHeatmap";
import { ReportSummaryChart } from "@/app/admin/_components/ReportSummaryChart";
import { SatisfactionChart } from "@/app/admin/_components/SatisfactionChart";
import { TopicPieChart } from "@/app/admin/_components/TopicPieChart";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export const metadata = { title: "管理ダッシュボード | nagomi" };

type DailyActiveUser = { day: string; active_users: number };
type HeatmapPoint = { day_of_week: number; hour: number; sessions: number };
type DailyCall = { day: string; call_count: number };
type TopicCount = { topic: string; call_count: number };
type ReportCount = { category: string; report_count: number; distinct_targets: number };
type SatisfactionRow = {
  week: string;
  survey_type: string;
  count: number;
  avg_rating: number | null;
  avg_nps_score: number | null;
};
type DeletionAuditRow = {
  executed_at: string;
  table_name: string;
  deleted_count: number;
  retention_months: number;
};

export default async function AdminDashboard() {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createSupabaseAdminClient();

  // is_admin をダブルチェック（middleware に加えてサーバー側でも確認）
  const { data: emp } = await adminClient
    .from("employees")
    .select("is_admin")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!emp?.is_admin) redirect("/");

  // 集計ビューからデータを取得
  const [
    activeUsersRes,
    heatmapRes,
    callsRes,
    topicRes,
    reportRes,
    satisfactionRes,
    deletionAuditRes,
  ] = await Promise.all([
    adminClient.from("v_admin_daily_active_users").select("day, active_users"),
    adminClient.from("v_admin_hourly_heatmap").select("day_of_week, hour, sessions"),
    adminClient.from("v_admin_daily_calls").select("day, call_count"),
    adminClient.from("v_admin_topic_distribution").select("topic, call_count"),
    adminClient.from("v_admin_report_summary").select("category, report_count, distinct_targets"),
    adminClient
      .from("v_admin_satisfaction_summary")
      .select("week, survey_type, count, avg_rating, avg_nps_score"),
    adminClient
      .from("v_admin_deletion_audit")
      .select("executed_at, table_name, deleted_count, retention_months"),
  ]);

  const dailyActiveUsers = (activeUsersRes.data ?? []) as DailyActiveUser[];
  const hourlyHeatmap = (heatmapRes.data ?? []) as HeatmapPoint[];
  const dailyCalls = (callsRes.data ?? []) as DailyCall[];
  const topicDistribution = (topicRes.data ?? []) as TopicCount[];
  const reportSummary = (reportRes.data ?? []) as ReportCount[];
  const satisfactionSummary = (satisfactionRes.data ?? []) as SatisfactionRow[];
  const deletionAudit = (deletionAuditRes.data ?? []) as DeletionAuditRow[];

  // サマリ集計
  const totalCalls = dailyCalls.reduce((s, r) => s + r.call_count, 0);
  const totalReports = reportSummary.reduce((s, r) => s + r.report_count, 0);
  const peakActiveUsers = Math.max(...dailyActiveUsers.map((r) => r.active_users), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          集計データのみを表示します。個人の利用ログは含みません。
        </p>
      </header>

      {/* サマリカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">直近30日 最大同時アクティブ人数</p>
          <p className="text-3xl font-bold text-indigo-600">{peakActiveUsers}</p>
          <p className="text-xs text-gray-400 mt-1">人 / 日</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">直近30日 通話件数</p>
          <p className="text-3xl font-bold text-emerald-600">{totalCalls}</p>
          <p className="text-xs text-gray-400 mt-1">件</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">直近90日 通報件数</p>
          <p className="text-3xl font-bold text-amber-600">{totalReports}</p>
          <p className="text-xs text-gray-400 mt-1">件</p>
        </div>
      </div>

      {/* グラフグリッド */}
      <div className="space-y-6">
        {/* 日次アクティブユーザー（全幅） */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            日次アクティブユーザー数
            <span className="ml-2 text-xs font-normal text-gray-400">直近30日</span>
          </h2>
          <DailyActiveUsersChart data={dailyActiveUsers} />
        </section>

        {/* 通話件数 + トピック別（2カラム） */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              日次通話件数
              <span className="ml-2 text-xs font-normal text-gray-400">直近30日</span>
            </h2>
            <DailyCallsChart data={dailyCalls} />
          </section>
          <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              トピック別通話比率
              <span className="ml-2 text-xs font-normal text-gray-400">直近30日</span>
            </h2>
            <TopicPieChart data={topicDistribution} />
          </section>
        </div>

        {/* 時間帯ヒートマップ（全幅） */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            時間帯別利用ヒートマップ
            <span className="ml-2 text-xs font-normal text-gray-400">直近30日のログイン分布</span>
          </h2>
          <HourlyHeatmap data={hourlyHeatmap} />
        </section>

        {/* 満足度サマリ（全幅） */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            満足度推移
            <span className="ml-2 text-xs font-normal text-gray-400">直近90日・週次</span>
          </h2>
          <p className="text-xs text-gray-400 mb-4">回答者の個人情報は含みません</p>
          <SatisfactionChart data={satisfactionSummary} />
        </section>

        {/* 通報集計（全幅） */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            通報集計（カテゴリ別）
            <span className="ml-2 text-xs font-normal text-gray-400">直近90日</span>
          </h2>
          <p className="text-xs text-gray-400 mb-4">通報者・対象者の個人情報は含みません</p>
          <ReportSummaryChart data={reportSummary} />
          {reportSummary.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              通報対象の実人数:{" "}
              <span className="font-semibold text-gray-700">
                {reportSummary.reduce((s, r) => s + r.distinct_targets, 0)}
              </span>{" "}
              人（重複あり）
            </p>
          )}
        </section>

        {/* ログ削除バッチ実行履歴（全幅） */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            ログ削除バッチ実行履歴
            <span className="ml-2 text-xs font-normal text-gray-400">直近90日・最新50件</span>
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            毎週月曜 03:00 JST に自動実行。削除件数のみを記録し、個人情報は含みません。
          </p>
          <DeletionAuditTable data={deletionAudit} />
        </section>
      </div>
    </main>
  );
}
