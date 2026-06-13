/// nagomi-ws への共有 WebSocket 接続管理クラス
///
/// 設計上の選択:
///   - 1ページセッション = 1接続。複数ゲートウェイが同一接続を共有する
///   - 切断時は指数バックオフで再接続（最大 30 秒間隔）
///   - JWT 更新時（onAuthStateChange）は再接続して新トークンで認証
///   - Supabase クライアントはトークン取得のためだけに使う（選択インターフェース）

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientMessage, ServerMessage, ServerMessageType } from "./types";

type Listener<T extends ServerMessage> = (msg: T) => void;
type ListenerMap = {
  [K in ServerMessageType]?: Set<Listener<Extract<ServerMessage, { type: K }>>>;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export class WebSocketClient {
  private ws: WebSocket | undefined;
  private token: string | undefined;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private readonly listeners: ListenerMap = {};

  constructor(
    private readonly url: string,
    private readonly supabase: SupabaseClient
  ) {}

  async connect(): Promise<void> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session) return;
    this.token = session.access_token;

    // JWT 更新時に再接続して新トークンで認証
    this.supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "TOKEN_REFRESHED" && newSession) {
        this.token = newSession.access_token;
        this.reconnect();
      }
      if (event === "SIGNED_OUT") {
        this.disconnect();
      }
    });

    this.doConnect();
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

  private doConnect(): void {
    if (this.closed || !this.token) return;

    const fullUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
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

  private reconnect(): void {
    this.ws?.close();
    this.doConnect();
  }

  private scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
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

export function getWebSocketClient(supabase: SupabaseClient): WebSocketClient {
  if (!_instance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";
    _instance = new WebSocketClient(wsUrl, supabase);
    _instance.connect().catch((err) => console.error("[WebSocketClient] connect failed:", err));
  }
  return _instance;
}
