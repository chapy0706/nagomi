import type {
  PresenceGateway,
  PresenceHandlers,
  PresencePayload,
  PresenceStatus,
} from "@/src/domain/ports/PresenceGateway";
import type { WebSocketClient } from "./WebSocketClient";

export class WebSocketPresenceGateway implements PresenceGateway {
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly client: WebSocketClient) {}

  async join(payload: PresencePayload, handlers: PresenceHandlers): Promise<void> {
    this.unsubscribers.push(
      this.client.on("presence:sync", (msg) => {
        handlers.onSync(msg.presences);
      }),
      this.client.on("presence:joined", (msg) => {
        handlers.onJoin(msg.presence);
      }),
      this.client.on("presence:left", (msg) => {
        handlers.onLeave(msg.employeeId);
      })
    );

    this.client.send({ type: "presence:join", payload });
  }

  async updatePosition(x: number, y: number): Promise<void> {
    this.client.send({ type: "presence:update_position", x, y });
  }

  async updateStatus(status: PresenceStatus): Promise<void> {
    this.client.send({ type: "presence:update_status", status });
  }

  async updateRoom(roomId: string | undefined): Promise<void> {
    this.client.send({ type: "presence:update_room", room_id: roomId ?? null });
  }

  async leave(): Promise<void> {
    this.client.send({ type: "presence:leave" });
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }
}
