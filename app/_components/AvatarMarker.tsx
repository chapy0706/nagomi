import { AvatarImage } from "@/app/_components/AvatarImage";

type AvatarMarkerProps = {
  displayName: string;
  avatarUrl?: string;
  employeeId: string;
  x: number;
  y: number;
  isSelf?: boolean;
};

export function AvatarMarker({
  displayName,
  avatarUrl,
  employeeId,
  x,
  y,
  isSelf,
}: AvatarMarkerProps) {
  return (
    <div
      className={`absolute flex flex-col items-center pointer-events-none select-none ${isSelf ? "z-10" : "z-0"}`}
      style={{
        transform: `translate(${x - 24}px, ${y - 24}px)`,
        transition: "transform 200ms ease",
        willChange: "transform",
      }}
    >
      <div className={`rounded-full ${isSelf ? "ring-2 ring-blue-500" : ""}`}>
        <AvatarImage displayName={displayName} avatarUrl={avatarUrl} seed={employeeId} size={48} />
      </div>
      <span className="mt-1 px-1 text-xs text-gray-800 bg-white/80 rounded whitespace-nowrap">
        {displayName}
      </span>
    </div>
  );
}
