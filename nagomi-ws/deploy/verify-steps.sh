#!/bin/bash
# nagomi-ws デプロイ確認スクリプト（A1 上で実行する）
#
# 使い方:
#   chmod +x verify-steps.sh
#   WS_HOST=ws.nagomi.example.com ./verify-steps.sh
#
# 前提:
#   - A1 に wscat と curl が入っていること
#   - wscat がない場合: sudo npm i -g wscat

WS_HOST="${WS_HOST:-localhost}"
WS_PORT="${WS_PORT:-3001}"

echo "=== Step 3: コンテナ起動確認 ==="

# コンテナ名の確認
echo "--- 起動中コンテナ ---"
docker ps --filter "ancestor=nagomi-ws" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

# ログ確認（最新10行）
CONTAINER=$(docker ps --filter "ancestor=nagomi-ws" --format "{{.Names}}" | head -1)
if [ -n "$CONTAINER" ]; then
  echo "--- ログ (${CONTAINER}) ---"
  docker logs "$CONTAINER" --tail 10
fi

echo ""
echo "=== Step 3: health エンドポイント確認 ==="
# A1 内部から直接叩く
echo "curl http://localhost:${WS_PORT}/health"
curl -sf "http://localhost:${WS_PORT}/health" && echo " → OK" || echo " → FAILED"

echo ""
echo "=== Step 4: Cloudflare Tunnel 経由で確認 ==="
# Host ヘッダー付きで Traefik をバイパスして内部から確認
echo "curl -H 'Host: ${WS_HOST}' http://localhost/health"
curl -sf -H "Host: ${WS_HOST}" "http://localhost/health" && echo " → OK" || echo " → FAILED (Tunnel/Traefik 未設定の可能性)"

echo ""
echo "=== Step 5: 外部から WebSocket 接続確認 ==="
echo "以下を A1 または手元の端末で実行してください:"
echo ""
echo "  # wscat でハンドシェイクのみ確認（Ctrl-C で終了）"
echo "  wscat -c 'wss://${WS_HOST}/ws?token=test'"
echo ""
echo "  # ブラウザの開発者コンソールで確認:"
cat <<'JS'
  const ws = new WebSocket('wss://WS_HOST/ws?token=test');
  ws.onopen  = () => console.log('connected');
  ws.onmessage = (e) => console.log('recv:', e.data);
  ws.onerror = (e) => console.error('error:', e);
JS

echo ""
echo "=== Step 6: 2接続 Presence 同期確認 ==="
echo "ターミナルを2つ開き、それぞれ以下を実行してください:"
echo ""
echo "  端末1:"
echo "    wscat -c 'wss://${WS_HOST}/ws?token=test'"
echo "    接続後に以下を貼り付け:"
cat <<'JSON'
    {"type":"presence:join","payload":{"employeeId":"emp-1","displayName":"User1","x":100.0,"y":200.0,"status":"available"}}
JSON
echo ""
echo "  端末2:"
echo "    wscat -c 'wss://${WS_HOST}/ws?token=test'"
echo "    接続後に以下を貼り付け:"
cat <<'JSON'
    {"type":"presence:join","payload":{"employeeId":"emp-2","displayName":"User2","x":300.0,"y":400.0,"status":"available"}}
JSON
echo ""
echo "  期待動作:"
echo "    - 端末1が join すると、端末2に presence:joined が届く"
echo "    - 端末2が join すると、端末1に presence:joined が届く"
echo "    - どちらかが切断すると presence:left が届く"
