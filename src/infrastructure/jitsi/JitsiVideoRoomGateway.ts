import type {
  VideoRoomConfig,
  VideoRoomEventHandlers,
  VideoRoomGateway,
} from "@/src/domain/ports/VideoRoomGateway";

type JitsiOptions = {
  roomName: string;
  parentNode: HTMLElement;
  width: string | number;
  height: string | number;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  userInfo?: { displayName: string };
};

type JitsiAPI = {
  addEventListeners(listeners: Record<string, (data: unknown) => void>): void;
  dispose(): void;
};

type JitsiWindow = typeof window & {
  JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiAPI;
};

const JITSI_DOMAIN = "meet.jit.si";
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "local";

// Singleton: script is loaded once per page lifecycle
let scriptLoadPromise: Promise<void> | undefined;

function loadJitsiScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if ((window as JitsiWindow).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = undefined;
      reject(new Error("Jitsi external_api.js の読み込みに失敗しました"));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function isParticipantEvent(data: unknown): data is { id: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof (data as { id: unknown }).id === "string"
  );
}

export class JitsiVideoRoomGateway implements VideoRoomGateway {
  private api: JitsiAPI | undefined;

  async join(
    container: HTMLElement,
    config: VideoRoomConfig,
    events: VideoRoomEventHandlers
  ): Promise<void> {
    await loadJitsiScript();

    const roomName = `nagomi-${APP_ENV}-${config.roomId}`;
    const JitsiMeetExternalAPI = (window as JitsiWindow).JitsiMeetExternalAPI;

    this.api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName,
      parentNode: container,
      width: "100%",
      height: "100%",
      userInfo: { displayName: config.displayName },
      configOverwrite: {
        startWithVideoMuted: config.startWithVideoMuted,
        startWithAudioMuted: config.startWithAudioMuted,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ["microphone", "hangup", "chat", "raisehand", "tileview"],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
      },
    });

    this.api.addEventListeners({
      readyToClose: () => events.onReadyToClose(),
      participantJoined: (data: unknown) => {
        if (events.onParticipantJoined && isParticipantEvent(data)) {
          events.onParticipantJoined(data.id);
        }
      },
      participantLeft: (data: unknown) => {
        if (events.onParticipantLeft && isParticipantEvent(data)) {
          events.onParticipantLeft(data.id);
        }
      },
      dominantSpeakerChanged: (data: unknown) => {
        if (events.onDominantSpeakerChanged && isParticipantEvent(data)) {
          events.onDominantSpeakerChanged(data.id);
        }
      },
    });
  }

  leave(): void {
    this.api?.dispose();
    this.api = undefined;
  }
}
