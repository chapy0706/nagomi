"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  data: { category: string; report_count: number; distinct_targets: number }[];
};

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "ハラスメント",
  inappropriate_speech: "不適切発言",
  rule_violation: "規約違反",
  other: "その他",
};

const CATEGORY_COLORS: Record<string, string> = {
  harassment: "#ef4444",
  inappropriate_speech: "#f97316",
  rule_violation: "#8b5cf6",
  other: "#6b7280",
};

const DEFAULT_COLOR = "#9ca3af";

export function ReportSummaryChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">通報はありません</p>;
  }

  const formatted = data.map((r) => ({
    label: CATEGORY_LABELS[r.category] ?? r.category,
    count: r.report_count,
    category: r.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [value ?? 0, "件数"]} />
        <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={24}>
          {formatted.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? DEFAULT_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
