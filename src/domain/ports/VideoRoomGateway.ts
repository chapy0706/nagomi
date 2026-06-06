export type VideoRoomConfig = {
  readonly roomId: string;
  readonly displayName: string;
  readonly startWithVideoMuted: boolean;
  readonly startWithAudioMuted: boolean;
};

export type VideoRoomEventHandlers = {
  readonly onParticipantJoined?: (participantId: string) => void;
  readonly onParticipantLeft?: (participantId: string) => void;
  readonly onDominantSpeakerChanged?: (participantId: string) => void;
  readonly onReadyToClose: () => void;
};

export type VideoRoomGateway = {
  join(
    container: HTMLElement,
    config: VideoRoomConfig,
    events: VideoRoomEventHandlers
  ): Promise<void>;
  leave(): void;
};
