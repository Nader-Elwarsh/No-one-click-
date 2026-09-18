#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${WORKSHOP_TEST_PORT:-8765}"
TMP="$(mktemp -d)"
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
sleep 1
run_page(){
  local page="$1" marker="$2"
  local out="$TMP/${page}.html"
  chromium --headless --no-sandbox --disable-gpu --allow-file-access-from-files --virtual-time-budget=2500 --dump-dom "http://127.0.0.1:${PORT}/${page}" >"$out" 2>"$TMP/${page}.err"
  grep -q "$marker" "$out"
  grep -v 'org.freedesktop.DBus' "$TMP/${page}.err" | grep -v 'UPower' >"$TMP/${page}.filtered.err" || true
  test ! -s "$TMP/${page}.filtered.err" || { cat "$TMP/${page}.filtered.err" >&2; return 1; }
}
run_page "compcodes.html" "id=\"compSearch\""
grep -q "أكتر من" "$TMP/compcodes.html.html"
run_page "settings.html" "data-action=\"backup\""
grep -q "settings-events.js" "$TMP/settings.html.html"
run_page "index.html" "الورشة الفنية"
chromium --headless --no-sandbox --disable-gpu --virtual-time-budget=6000 --dump-dom "http://127.0.0.1:${PORT}/browser-interactive.html" >"$TMP/interactive.html" 2>"$TMP/interactive.err"
grep -q "INTERACTIVE_PASS" "$TMP/interactive.html"
echo "browser-smoke: PASS (Chromium loaded compressor, settings, and home pages)"
