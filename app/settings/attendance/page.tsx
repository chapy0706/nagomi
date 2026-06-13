import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseAttendanceRepository } from "@/src/infrastructure/supabase/SupabaseAttendanceRepository";
import { getSessionContext } from "@/src/infrastructure/supabase/session";

export const metadata = { title: "在席履歴 | nagomi" };

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AttendancePage() {
  const { authUserId, employee } = await getSessionContext();
  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3_600_000);

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseAttendanceRepository(adminClient);
  const logs = await repo.findByEmployeeAuthId(authUserId, { since: thirtyDaysAgo });

  const monthTotal = logs
    .filter((l) => l.loggedInAt >= monthStart)
    .reduce((sum, l) => sum + l.durationMs(now), 0);

  // 日付ごとにグループ化（loggedInAt の日付をキーにする）
  const byDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = isoDate(log.loggedInAt);
    const group = byDate.get(key) ?? [];
    group.push(log);
    byDate.set(key, group);
  }
  const sortedDates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">在席履歴</h1>

      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">今月の合計在席時間</p>
        <p className="text-3xl font-bold text-indigo-600">{formatDuration(monthTotal)}</p>
      </section>

      <section className="space-y-4">
        {sortedDates.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">過去30日間の在席記録がありません</p>
        )}
        {sortedDates.map((dateKey) => {
          const dayLogs = byDate.get(dateKey) ?? [];
          const dayTotal = dayLogs.reduce((sum, l) => sum + l.durationMs(now), 0);
          const labelDate = dayLogs[0] ? dayLogs[0].loggedInAt : new Date(dateKey);

          return (
            <div key={dateKey} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">{formatDate(labelDate)}</p>
                <p className="text-sm font-semibold text-gray-900">{formatDuration(dayTotal)}</p>
              </div>
              <ul className="space-y-2">
                {dayLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between text-xs text-gray-500"
                  >
                    <span>
                      {formatTime(log.loggedInAt)}
                      {" 〜 "}
                      {log.loggedOutAt ? formatTime(log.loggedOutAt) : "在席中"}
                    </span>
                    <span className="flex items-center gap-1">
                      {log.loggedOutAt && (
                        <span className="text-gray-400">{formatDuration(log.durationMs(now))}</span>
                      )}
                      {log.source === "inferred" && log.loggedOutAt && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-600">
                          推定
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </main>
  );
}
