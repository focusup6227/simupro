#!/usr/bin/env bash
# After `npm run build`, copies Next standalone output + static assets for cPanel Node hosting.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "Run: npm run build  (missing .next/standalone/server.js)"
  exit 1
fi

OUT="$ROOT/cpanel-deploy"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -r .next/standalone/. "$OUT/"

mkdir -p "$OUT/.next/static"
cp -r .next/static/. "$OUT/.next/static/"

mkdir -p "$OUT/public"
[[ -f favicon.ico ]] && cp favicon.ico "$OUT/public/"
[[ -d public ]] && cp -r public/. "$OUT/public/" 2>/dev/null || true

[[ -f .env.example ]] && cp .env.example "$OUT/.env.example"

ARCHIVE="$ROOT/simupro-cpanel-standalone-$(date +%Y%m%d-%H%M).zip"
(cd "$OUT" && zip -rq "$ARCHIVE" .)
echo "Packaged: $ARCHIVE ($(du -sh "$ARCHIVE" | cut -f1))"
echo "Upload & extract on server, then run Node from this folder: node server.js"
