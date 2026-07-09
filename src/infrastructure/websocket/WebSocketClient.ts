/// nagomi-ws への共有 WebSocket 接続管理クラス
///
/// 設計上の選択:
///   - 1ページセッション = 1接続。複数ゲートウェイが同一接続を共有する
///   - 切断時は指数バックオフで再接続（最大 30 秒間隔）
///   - 接続用トークンは本体の /api/ws-token から取得する（案A-1）。
///     refresh_token はサーバー側に留まり、ブラウザには access token だけが渡る。
///   - 「接続時に一度だけ検証」方式。接続中の access token 失効は接続の信頼で吸収し、
///     再接続時に新しいトークンを取り直して再検証する。

import type { ClientMessage, ServerMessage, ServerMessageType } from "./types";

type Listener<T extends ServerMessage> = (msg: T) => void;
type ListenerMap = {
  [K in ServerMessageType]?: Set<Listener<Extract<ServerMessage, { type: K }>>>;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export class WebSocketClient {
  private ws: WebSocket | undefined;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private readonly listeners: ListenerMap = {};

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    await this.doConnect();
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on<K extends ServerMessageType>(
    type: K,
    listener: Listener<Extract<ServerMessage, { type: K }>>
  ): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set() as ListenerMap[K];
    }
    (this.listeners[type] as Set<Listener<Extract<ServerMessage, { type: K }>>>).add(listener);
    return () => {
      (this.listeners[type] as Set<Listener<Extract<ServerMessage, { type: K }>>>).delete(listener);
    };
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.ws?.close();
    this.ws = undefined;
  }

  /// WS 接続用トークンを本体エンドポイント（/api/ws-token）から取得する。
  /// 失敗（未認証・失効・一時障害）は undefined を返し、呼び出し側で再試行する。
  private async fetchToken(): Promise<string | undefined> {
    try {
      const res = await fetch("/api/ws-token", { cache: "no-store" });
      if (!res.ok) return undefined;
      const data: unknown = await res.json();
      if (typeof data === "object" && data !== null && "access_token" in data) {
        const token = (data as { access_token: unknown }).access_token;
        return typeof token === "string" ? token : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async doConnect(): Promise<void> {
    if (this.closed) return;

    // 接続直前に毎回トークンを取り直す（再接続時の再検証を兼ねる）。
    const token = await this.fetchToken();
    if (this.closed) return;
    if (!token) {
      // トークンが取れない → 接続せず、バックオフで再試行する。
      this.scheduleReconnect();
      return;
    }

    const fullUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(fullUrl);

    ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return;
      this.dispatch(parsed as ServerMessage);
    };

    ws.onclose = () => {
      if (this.closed) return;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose が続けて呼ばれるので、ここでは再接続しない
    };

    this.ws = ws;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => void this.doConnect(), delay);
  }

  private dispatch(msg: ServerMessage): void {
    const set = this.listeners[msg.type] as
      | Set<Listener<Extract<ServerMessage, { type: typeof msg.type }>>>
      | undefined;
    set?.forEach((listener) => {
      listener(msg as never);
    });
  }
}

// ---------------------------------------------------------------------------
// モジュールレベルシングルトン（1ブラウザタブ = 1接続）
// ---------------------------------------------------------------------------

let _instance: WebSocketClient | undefined;

export function getWebSocketClient(): WebSocketClient {
  if (!_instance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";
    _instance = new WebSocketClient(wsUrl);
    _instance.connect().catch((err) => console.error("[WebSocketClient] connect failed:", err));
  }
  return _instance;
}
