/// nagomi-ws → 本体 の内部イベント受信エンドポイント（在室証跡の記録）。
///
/// nagomi-ws が WebSocket の接続確立/切断時に呼ぶ。DB 永続化を本体 infra に集約し、
/// nagomi-ws は「イベントを送る」だけに留める（層の分離）。
///
/// 認証: 外部から接続イベントを捏造されないよう、nagomi-ws と共有する秘密
/// （WS_EVENTS_SECRET）を Authorization: Bearer で送り、定数時間比較で検証する。
/// coolify 内部網に加えた多層防御。検証失敗・秘密未設定はすべて拒否（フェイルセーフ）。

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { RecordPresenceSessionEnd } from "@/src/application/use-cases/RecordPresenceSessionEnd";
import { RecordPresenceSessionStart } from "@/src/application/use-cases/RecordPresenceSessionStart";
import { createPresenceSessionRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";

type WsEvent =
  | { type: "connected"; employeeAuthId: string; connectionId: string }
  | { type: "disconnected"; connectionId: string };

/// タイミング攻撃を避けるための定数時間比較（長さが違えば即 false）。
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/// 外部入力（unknown）を安全に WsEvent へ narrow する。
function parseEvent(body: unknown): WsEvent | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const record = body as Record<string, unknown>;
  const connectionId = record.connectionId;
  if (typeof connectionId !== "string" || connectionId === "") return undefined;

  if (record.type === "connected") {
    const employeeAuthId = record.employeeAuthId;
    if (typeof employeeAuthId !== "string" || employeeAuthId === "") return undefined;
    return { type: "connected", employeeAuthId, connectionId };
  }
  if (record.type === "disconnected") {
    return { type: "disconnected", connectionId };
  }
  return undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.WS_EVENTS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => undefined);
  const event = parseEvent(body);
  if (!event) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const repo = createPresenceSessionRepository();
  if (event.type === "connected") {
    await new RecordPresenceSessionStart(repo).execute({
      employeeAuthId: event.employeeAuthId,
      connectionId: event.connectionId,
    });
  } else {
    await new RecordPresenceSessionEnd(repo, SystemClock).execute({
      connectionId: event.connectionId,
    });
  }

  return NextResponse.json({ ok: true });
}
