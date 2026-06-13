"use client";

type Props = {
  data: { day_of_week: number; hour: number; sessions: number }[];
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmap({ data }: Props) {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const point of data) {
    matrix[point.day_of_week][point.hour] = point.sessions;
  }

  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">データがありません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Hour labels */}
        <div className="flex mb-1">
          <div className="w-7 shrink-0" />
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
              {h % 3 === 0 ? `${h}` : ""}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DAY_LABELS.map((day, dow) => (
          <div key={day} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-7 shrink-0 text-[10px] text-gray-500 text-right pr-1">{day}</div>
            {HOURS.map((h) => {
              const count = matrix[dow][h];
              const intensity = count / maxSessions;
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-sm"
                  style={{
                    backgroundColor:
                      count === 0 ? "#f3f4f6" : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                  }}
                  title={`${day}曜 ${h}時: ${count}セッション`}
                />
              );
            })}
          </div>
        ))}

        <p className="mt-2 text-[10px] text-gray-400 text-right">直近30日 JST</p>
      </div>
    </div>
  );
}
