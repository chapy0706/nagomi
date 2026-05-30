"use client";

import { useMemo } from "react";
import { selectEffectiveStatus, useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { UpdateStatus } from "@/src/application/use-cases/UpdateStatus";
import type { ManualStatus, PresenceGateway } from "@/src/domain/ports/PresenceGateway";

type StatusOption = {
  value: ManualStatus;
  label: string;
  icon: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "available", label: "ログイン中", icon: "●" },
  { value: "busy", label: "取り込み中", icon: "◆" },
  { value: "away", label: "離席中", icon: "○" },
];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-status-available",
  busy: "bg-status-busy",
  away: "bg-status-away",
  in_call: "bg-status-incall",
};

const STATUS_LABELS: Record<string, string> = {
  available: "ログイン中",
  busy: "取り込み中",
  away: "離席中",
  in_call: "通話中",
};

type StatusPillProps = {
  gateway: PresenceGateway;
};

export function StatusPill({ gateway }: StatusPillProps) {
  const updateStatus = useMemo(() => new UpdateStatus(gateway), [gateway]);
  const manualStatus = useSelfStatusStore((s) => s.manualStatus);
  const isInCall = useSelfStatusStore((s) => s.isInCall);
  const effectiveStatus = useSelfStatusStore(selectEffectiveStatus);
  const setManualStatus = useSelfStatusStore((s) => s.setManualStatus);

  const handleChange = async (next: ManualStatus) => {
    setManualStatus(next);
    if (!isInCall) {
      await updateStatus.execute(next).catch((err) => {
        console.error("[StatusPill] updateStatus failed:", err);
      });
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <span
        className={`inline-block w-3 h-3 rounded-full ${STATUS_COLORS[effectiveStatus]}`}
        aria-hidden="true"
      />
      {isInCall ? (
        <span className="text-sm font-medium text-gray-700">{STATUS_LABELS.in_call}</span>
      ) : (
        <select
          value={manualStatus}
          onChange={(e) => handleChange(e.target.value as ManualStatus)}
          className="text-sm font-medium text-gray-700 bg-transparent border-none cursor-pointer focus:outline-none"
          aria-label="ステータスを変更"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
