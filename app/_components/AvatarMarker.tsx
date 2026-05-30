import { AvatarImage } from "@/app/_components/AvatarImage";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";

type AvatarMarkerProps = {
  displayName: string;
  avatarUrl?: string;
  employeeId: string;
  x: number;
  y: number;
  status?: PresenceStatus;
  isSelf?: boolean;
};

const STATUS_RING: Record<PresenceStatus, string> = {
  available: "ring-status-available",
  busy: "ring-status-busy",
  away: "ring-status-away",
  in_call: "ring-status-incall",
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  available: "ログイン中",
  busy: "取り込み中",
  away: "離席中",
  in_call: "通話中",
};

export function AvatarMarker({
  displayName,
  avatarUrl,
  employeeId,
  x,
  y,
  status,
  isSelf,
}: AvatarMarkerProps) {
  const ringColor = status ? STATUS_RING[status] : "ring-gray-300";
  const ringWidth = isSelf ? "ring-2" : "ring-2";

  return (
    <div
      className={`absolute flex flex-col items-center pointer-events-none select-none ${isSelf ? "z-10" : "z-0"}`}
      style={{
        transform: `translate(${x - 24}px, ${y - 24}px)`,
        transition: "transform 200ms ease",
        willChange: "transform",
      }}
    >
      <div
        className={`rounded-full ${ringWidth} ${ringColor}`}
        title={status ? STATUS_LABEL[status] : undefined}
      >
        <AvatarImage displayName={displayName} avatarUrl={avatarUrl} seed={employeeId} size={48} />
      </div>
      <span className="mt-1 px-1 text-xs text-gray-800 bg-white/80 rounded whitespace-nowrap">
        {displayName}
      </span>
    </div>
  );
}
