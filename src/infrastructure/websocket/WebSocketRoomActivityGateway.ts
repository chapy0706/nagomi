import type {
  RoomActivityGateway,
  RoomActivitySnapshot,
  RoomActivityUnsubscribe,
} from "@/src/domain/ports/RoomActivityGateway";
import type { WebSocketClient } from "./WebSocketClient";

export class WebSocketRoomActivityGateway implements RoomActivityGateway {
  constructor(private readonly client: WebSocketClient) {}

  async broadcastActivity(roomId: string, snapshot: RoomActivitySnapshot): Promise<void> {
    this.client.send({ type: "room:activity", room_id: roomId, snapshot });
  }

  async subscribeToActivity(
    roomId: string,
    onReceive: (snapshot: RoomActivitySnapshot) => void
  ): Promise<RoomActivityUnsubscribe> {
    this.client.send({ type: "room:subscribe", room_id: roomId });

    const unsub = this.client.on("room:activity", (msg) => {
      if (msg.roomId === roomId) {
        onReceive(msg.snapshot);
      }
    });

    return () => {
      this.client.send({ type: "room:unsubscribe", room_id: roomId });
      unsub();
    };
  }
}
