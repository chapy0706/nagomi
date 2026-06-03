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
  onClick?: () => void;
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

const baseStyle = (x: number, y: number) => ({
  transform: `translate(${x - 24}px, ${y - 24}px)`,
  transition: "transform 200ms ease",
  willChange: "transform",
});

function AvatarInner({
  displayName,
  avatarUrl,
  employeeId,
  status,
}: Pick<AvatarMarkerProps, "displayName" | "avatarUrl" | "employeeId" | "status">) {
  const ringColor = status ? STATUS_RING[status] : "ring-gray-300";
  return (
    <>
      <div
        className={`rounded-full ring-2 ${ringColor}`}
        title={status ? STATUS_LABEL[status] : undefined}
      >
        <AvatarImage displayName={displayName} avatarUrl={avatarUrl} seed={employeeId} size={48} />
      </div>
      <span className="mt-1 px-1 text-xs text-gray-800 bg-white/80 rounded whitespace-nowrap">
        {displayName}
      </span>
    </>
  );
}

export function AvatarMarker({
  displayName,
  avatarUrl,
  employeeId,
  x,
  y,
  status,
  isSelf,
  onClick,
}: AvatarMarkerProps) {
  if (!isSelf && onClick) {
    return (
      <button
        type="button"
        className="absolute flex flex-col items-center z-0 pointer-events-auto cursor-pointer select-none"
        style={baseStyle(x, y)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={`${displayName} に招待を送る`}
      >
        <AvatarInner
          displayName={displayName}
          avatarUrl={avatarUrl}
          employeeId={employeeId}
          status={status}
        />
      </button>
    );
  }

  return (
    <div
      className={`absolute flex flex-col items-center pointer-events-none select-none ${isSelf ? "z-10" : "z-0"}`}
      style={baseStyle(x, y)}
    >
      <AvatarInner
        displayName={displayName}
        avatarUrl={avatarUrl}
        employeeId={employeeId}
        status={status}
      />
    </div>
  );
}
