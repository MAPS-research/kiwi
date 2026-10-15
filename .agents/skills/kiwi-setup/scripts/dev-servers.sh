#!/usr/bin/env bash
# Start, stop or check Kiwi's two development servers — the backend (kiwi/,
# port 3000) and the frontend (kiwi-ui/, port 3001) — in the background, so
# they keep running after the command (or the agent's turn) ends.
#
# Usage: dev-servers.sh start  [backend|frontend|all]   (default: all)
#        dev-servers.sh stop   [backend|frontend|all]
#        dev-servers.sh status
#        dev-servers.sh logs   backend|frontend          (last 40 lines)
#        add --root <repo> to any command if not run from inside the repository
#
# Uses the Node version pinned in .nvmrc, through nvm or fnm if the Node on
# PATH differs. Logs and process ids go to logs/ at the repository root
# (gitignored). `start` waits until the server answers and prints the end of
# its log if it doesn't.

set -u

CMD="${1:-}"; shift || true
WHICH="all"; ROOT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    backend|frontend|all) WHICH="$1"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
case "$CMD" in start|stop|status|logs) ;; *) sed -n '2,15p' "$0"; exit 2 ;; esac

is_repo() { [ -f "$1/kiwi/compose.yml" ] && [ -d "$1/kiwi-ui" ]; }
if [ -z "$ROOT" ]; then
  d="$PWD"
  while [ "$d" != "/" ]; do is_repo "$d" && { ROOT="$d"; break; }; d="$(dirname "$d")"; done
fi
[ -z "$ROOT" ] && ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
is_repo "$ROOT" || { echo "Kiwi repository not found; pass --root <path>." >&2; exit 2; }
ROOT="$(cd "$ROOT" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

env_get() {
  [ -f "$2" ] || return 0
  grep -E "^[[:space:]]*$1=" "$2" | tail -1 | cut -d= -f2- |
    sed -e 's/[[:space:]]*#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
        -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}
API_PORT="$(env_get PORT "$ROOT/kiwi/.env")"; : "${API_PORT:=3000}"

dir_of()  { [ "$1" = backend ] && echo "$ROOT/kiwi" || echo "$ROOT/kiwi-ui"; }
url_of()  { [ "$1" = backend ] && echo "http://localhost:$API_PORT/docs-json" || echo "http://localhost:3001/"; }
port_of() { [ "$1" = backend ] && echo "$API_PORT" || echo 3001; }
npm_script_of() { [ "$1" = backend ] && echo start:dev || echo dev; }
up() { [ "$(curl -s -o /dev/null -m 3 -w '%{http_code}' "$(url_of "$1")" 2>/dev/null)" = 200 ]; }

# Prints a shell prefix that activates the pinned Node, or fails.
node_prefix() {
  local want have nvm_sh
  want="$(tr -d '[:space:]' < "$ROOT/kiwi/.nvmrc")"
  have="$(node -v 2>/dev/null || true)"
  if [ "$have" = "$want" ]; then echo ":"; return; fi
  nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$nvm_sh" ] && [ -d "${NVM_DIR:-$HOME/.nvm}/versions/node/$want" ]; then
    echo "source '$nvm_sh' && nvm use $want >/dev/null"; return
  fi
  if command -v fnm >/dev/null 2>&1 && fnm list 2>/dev/null | grep -q "$want"; then
    echo "eval \"\$(fnm env)\" && fnm use $want >/dev/null"; return
  fi
  echo "Node $want is not available (found ${have:-none}). Install it first (SKILL.md, step 2)." >&2
  return 1
}

start_one() {
  local name="$1" dir pid prefix waited=0 limit=240
  dir="$(dir_of "$name")"
  if up "$name"; then echo "$name: already running on :$(port_of "$name")"; return 0; fi
  [ -d "$dir/node_modules" ] || { echo "$name: dependencies missing — run npm install in $dir first." >&2; return 1; }
  prefix="$(node_prefix)" || return 1
  # `set -m` gives the server its own process group, so `stop` can end the
  # whole tree (npm → nest/vite → node) and closing this shell doesn't.
  set -m
  (cd "$dir" && eval "$prefix" && exec nohup npm run "$(npm_script_of "$name")") \
    > "$LOGS/$name.log" 2>&1 < /dev/null &
  pid=$!
  set +m
  echo "$pid" > "$LOGS/$name.pid"
  echo "$name: starting (log: logs/$name.log) …"
  while [ "$waited" -lt "$limit" ]; do
    if up "$name"; then echo "$name: ready on :$(port_of "$name") after ${waited}s"; return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name: the process exited. End of logs/$name.log:" >&2
      tail -n 40 "$LOGS/$name.log" >&2
      return 1
    fi
    sleep 3; waited=$((waited + 3))
  done
  echo "$name: not answering after ${limit}s (still running as pid $pid). End of logs/$name.log:" >&2
  tail -n 40 "$LOGS/$name.log" >&2
  return 1
}

stop_one() {
  local name="$1" pid port pids
  pid="$(cat "$LOGS/$name.pid" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
  fi
  rm -f "$LOGS/$name.pid"
  sleep 2
  port="$(port_of "$name")"
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      echo "$name: something still listens on :$port (pid $(echo $pids)); not started by this script, left alone."
      return 0
    fi
  fi
  echo "$name: stopped"
}

status_one() {
  local name="$1" pid
  pid="$(cat "$LOGS/$name.pid" 2>/dev/null || true)"
  if up "$name"; then echo "$name: running on :$(port_of "$name")${pid:+ (pid $pid)}"
  else echo "$name: not running"; fi
}

targets() { [ "$WHICH" = all ] && echo "backend frontend" || echo "$WHICH"; }

rc=0
case "$CMD" in
  start)  for t in $(targets); do start_one "$t" || rc=1; done ;;
  stop)   for t in $(targets); do stop_one "$t"; done ;;
  status) for t in backend frontend; do status_one "$t"; done ;;
  logs)   [ "$WHICH" = all ] && { echo "logs needs backend or frontend" >&2; exit 2; }
          tail -n 40 "$LOGS/$WHICH.log" 2>/dev/null || echo "No log yet for $WHICH." ;;
esac
exit $rc
