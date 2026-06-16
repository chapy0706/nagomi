#!/bin/sh
# Coolify の「Environment Variables」画面にコピーする環境変数
# (Coolify UI: Service → Environment → Raw Editor に貼り付ける)

PORT=3001

# Supabase ダッシュボード → Settings → API → JWT Secret からコピー
JWT_SECRET=

# 疎通確認ステップ2-3でのみ true。Step7完了後は削除する
# WS_AUTH_DISABLED=true
