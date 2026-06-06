export type RoomActivitySnapshot = {
  /** 直近30秒間の dominant speaker 切り替え回数 */
  readonly recentSpeakerEventCount: number;
  /** スナップショット送信時刻 (ISO 8601) */
  readonly emittedAt: string;
};

export type RoomActivityUnsubscribe = () => void;

/**
 * 通話ルーム単位の「盛り上がり度」シグナルの送受信ポート。
 * - 通話中のクライアントが定期的に snapshot を送信する
 * - フロア表示中のクライアントが snapshot を受信して可視化する
 */
export type RoomActivityGateway = {
  broadcastActivity(roomId: string, snapshot: RoomActivitySnapshot): Promise<void>;
  subscribeToActivity(
    roomId: string,
    onReceive: (snapshot: RoomActivitySnapshot) => void
  ): Promise<RoomActivityUnsubscribe>;
};
