#!/usr/bin/env bash
# Gộp code dùng chung (docs/js/shared) thành apps-script/Shared.gs để dán vào Apps Script.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=apps-script/Shared.gs
{
  echo "// ⚠️ FILE SINH TỰ ĐỘNG từ docs/js/shared bằng scripts/build-gas.sh — đừng sửa tay."
  echo "// Sửa ở docs/js/shared rồi chạy lại: npm run build:gas"
  for f in lunar canchi holidays monthGrid occurrence; do
    echo
    echo "// ───── $f.js ─────"
    cat "docs/js/shared/$f.js"
  done
} > "$OUT"
echo "✅ $OUT"
