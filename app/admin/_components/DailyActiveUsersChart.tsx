"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  data: { day: string; active_users: number }[];
};

function formatDay(day: string): string {
  const d = new Date(day);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function DailyActiveUsersChart({ data }: Props) {
  const formatted = data.map((r) => ({ label: formatDay(r.day), value: r.active_users }));

  if (formatted.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">データがありません</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip
          formatter={(value) => [value ?? 0, "アクティブ人数"]}
          labelFormatter={(label) => `${label}`}
        />
        <Bar dataKey="value" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
