"use client";

type DeletionAuditRow = {
  executed_at: string;
  table_name: string;
  deleted_count: number;
  retention_months: number;
};

type Props = {
  data: DeletionAuditRow[];
};

const TABLE_LABELS: Record<string, string> = {
  attendance_logs: "在席ログ",
  call_participation_logs: "通話参加ログ",
  satisfaction_responses: "満足度回答",
  reports: "通報",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DeletionAuditTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        削除実行履歴がありません。バッチは毎週月曜 03:00 JST に実行されます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">
              実行日時 (JST)
            </th>
            <th className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">
              対象テーブル
            </th>
            <th className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 text-right">
              削除件数
            </th>
            <th className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 text-right">
              保持期間
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={`${row.executed_at}-${row.table_name}`}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-3 py-2 text-gray-700 border-b border-gray-100 whitespace-nowrap">
                {formatDateTime(row.executed_at)}
              </td>
              <td className="px-3 py-2 text-gray-700 border-b border-gray-100">
                <span className="font-medium">
                  {TABLE_LABELS[row.table_name] ?? row.table_name}
                </span>
                <span className="ml-1 text-xs text-gray-400">({row.table_name})</span>
              </td>
              <td className="px-3 py-2 text-gray-700 border-b border-gray-100 text-right tabular-nums">
                {row.deleted_count.toLocaleString("ja-JP")} 件
              </td>
              <td className="px-3 py-2 text-gray-500 border-b border-gray-100 text-right">
                {row.retention_months} ヶ月
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
