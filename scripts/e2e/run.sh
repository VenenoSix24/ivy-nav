#!/usr/bin/env bash
# 接口回归：每个套件用独立的临时数据库、独立端口、独立管理员账号。
# 用法：pnpm e2e [套件名]；套件跑在 pnpm start 的产物上，需要先 pnpm build。
set -u

cd "$(dirname "$0")/../.." || exit 1

if [ ! -d .next ]; then
  echo "没有 .next：先跑 pnpm build" >&2
  exit 1
fi

ONLY="${1:-}"
TMP="scripts/e2e/.tmp"
PORT_BASE=3110
PASSWORD="e2e-password-123"
FAILED=0
RAN=0

if [ -n "$ONLY" ] && [ ! -f "scripts/e2e/suites/$ONLY.mjs" ]; then
  echo "没有这个套件：$ONLY" >&2
  echo "可选：$(ls scripts/e2e/suites | sed 's/\.mjs//' | tr '\n' ' ')" >&2
  exit 1
fi

# 账号按套件分
user_of() {
  case "$1" in
    security|restore) echo "a" ;;
    *) echo "ivy" ;;
  esac
}

run_suite() {
  local name=$1 port=$2
  local dir="$TMP/$name"
  local user
  user=$(user_of "$name")

  rm -rf "$dir"
  mkdir -p "$dir/data"

  DATABASE_PATH="$dir/data/portal.db" pnpm db:seed >/dev/null 2>&1
  DATABASE_PATH="$dir/data/portal.db" ADMIN_PASSWORD="$PASSWORD" pnpm admin:create "$user" >/dev/null 2>&1

  # 回归不碰第三方图标服务
  DATABASE_PATH="$dir/data/portal.db" PORT="$port" SESSION_COOKIE_SECURE=false \
    FAVICON_FALLBACK_SOURCES=false \
    nohup pnpm start >"$dir/server.log" 2>&1 &
  local server=$!

  # 等端口真的起来
  local up=0
  for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "http://127.0.0.1:$port/"; then up=1; break; fi
    sleep 0.5
  done
  if [ "$up" -ne 1 ]; then
    echo "FAIL  $name：服务器没起来，看 $dir/server.log"
    kill "$server" 2>/dev/null
    FAILED=$((FAILED + 1))
    return
  fi

  echo "======== $name (:${port}) ========"
  if BASE="http://127.0.0.1:$port" DATA_DIR="$dir/data" E2E_USER="$user" E2E_PASSWORD="$PASSWORD" \
     node "scripts/e2e/suites/$name.mjs"; then
    :
  else
    FAILED=$((FAILED + 1))
  fi
  RAN=$((RAN + 1))

  kill "$server" 2>/dev/null
  wait "$server" 2>/dev/null
}

port=$PORT_BASE
for suite in edit backup security restore palette layout bookmarks; do
  if [ -n "$ONLY" ] && [ "$ONLY" != "$suite" ]; then
    port=$((port + 1))
    continue
  fi
  run_suite "$suite" "$port"
  port=$((port + 1))
done

echo
if [ "$FAILED" -ne 0 ]; then
  echo "跑完 $RAN 个套件，$FAILED 个有失败项"
  exit 1
fi
echo "跑完 $RAN 个套件，全部通过"
