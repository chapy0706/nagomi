"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  data: { topic: string; call_count: number }[];
};

const TOPIC_LABELS: Record<string, string> = {
  counseling: "悩み相談",
  casual: "雑談",
  meeting: "面談",
};

const COLORS: Record<string, string> = {
  counseling: "#6366f1",
  casual: "#10b981",
  meeting: "#f59e0b",
};

const DEFAULT_COLOR = "#6b7280";

export function TopicPieChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">データがありません</p>;
  }

  const formatted = data.map((r) => ({
    name: TOPIC_LABELS[r.topic] ?? r.topic,
    value: r.call_count,
    topic: r.topic,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={formatted}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={75}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {formatted.map((entry) => (
            <Cell key={entry.topic} fill={COLORS[entry.topic] ?? DEFAULT_COLOR} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value ?? 0, "通話数"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
