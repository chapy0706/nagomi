"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SatisfactionRow = {
  week: string;
  survey_type: string;
  count: number;
  avg_rating: number | null;
  avg_nps_score: number | null;
};

type Props = {
  data: SatisfactionRow[];
};

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}w`;
}

export function SatisfactionChart({ data }: Props) {
  const sessionData = data.filter((r) => r.survey_type === "session");
  const npsData = data.filter((r) => r.survey_type === "nps");

  const weeks = [...new Set(data.map((r) => r.week))].sort();

  const chartData = weeks.map((week) => {
    const session = sessionData.find((r) => r.week === week);
    const nps = npsData.find((r) => r.week === week);
    return {
      week: formatWeek(week),
      sessionRating: session?.avg_rating ?? null,
      npsScore: nps?.avg_nps_score ?? null,
      sessionCount: session?.count ?? 0,
      npsCount: nps?.count ?? 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="rating" domain={[0, 5]} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="nps" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [value ?? "–", ""]} />
        <Legend />
        <Line
          yAxisId="rating"
          type="monotone"
          dataKey="sessionRating"
          name="セッション評価（1-5）"
          stroke="#6366f1"
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="nps"
          type="monotone"
          dataKey="npsScore"
          name="NPS スコア（0-10）"
          stroke="#10b981"
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
