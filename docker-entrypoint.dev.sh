#!/bin/sh
set -e

echo "📦 DBセットアップ中..."
mkdir -p /app/data
npx drizzle-kit generate 2>/dev/null || true
npx drizzle-kit migrate 2>/dev/null || true
npx tsx src/lib/db/seed.ts 2>/dev/null || true

echo "🚀 開発サーバー起動..."
exec npm run dev
