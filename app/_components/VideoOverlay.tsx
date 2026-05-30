"use client";

import { useEffect, useRef } from "react";
import { useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { JitsiVideoRoomGateway } from "@/src/infrastructure/jitsi/JitsiVideoRoomGateway";

type VideoOverlayProps = {
  displayName: string;
};

export function VideoOverlay({ displayName }: VideoOverlayProps) {
  const isOpen = useVideoStore((s) => s.isOpen);
  const roomId = useVideoStore((s) => s.roomId);
  const close = useVideoStore((s) => s.close);
  const enterCall = useSelfStatusStore((s) => s.enterCall);
  const exitCall = useSelfStatusStore((s) => s.exitCall);

  const containerRef = useRef<HTMLDivElement>(null);
  const gatewayRef = useRef<JitsiVideoRoomGateway | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !roomId || !containerRef.current) return;

    const gateway = new JitsiVideoRoomGateway();
    gatewayRef.current = gateway;
    enterCall();

    gateway
      .join(
        containerRef.current,
        {
          roomId,
          displayName,
          startWithVideoMuted: true,
          startWithAudioMuted: false,
        },
        {
          onReadyToClose: () => close(),
        }
      )
      .catch((err) => console.error("[VideoOverlay] join failed:", err));

    return () => {
      gatewayRef.current?.leave();
      gatewayRef.current = undefined;
      exitCall();
    };
  }, [isOpen, roomId, displayName, enterCall, exitCall, close]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black">
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
