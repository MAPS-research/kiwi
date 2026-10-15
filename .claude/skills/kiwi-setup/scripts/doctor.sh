#!/usr/bin/env bash
# Kiwi setup doctor: reports prerequisites and how far a local setup has got.
# Read-only — it never starts, stops, installs or edits anything, so it is
# safe to run at any point, as often as you like.
#
# Usage: doctor.sh [--root <path to the kiwi repository>]
# Exit code: 0 when everything passes, 1 when something needs attention,
# 2 when the repository cannot be found.

set -u

ROOT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# --- Locate the repository ----------------------------------------------------
is_repo() { [ -f "$1/kiwi/compose.yml" ] && [ -d "$1/kiwi-ui" ]; }

if [ -z "$ROOT" ]; then
  dir="$PWD"
  while [ "$dir" != "/" ]; do
    if is_repo "$dir"; then ROOT="$dir"; break; fi
    if is_repo "$dir/kiwi"; then ROOT="$dir/kiwi"; break; fi
    dir="$(dirname "$dir")"
  done
fi
if [ -z "$ROOT" ]; then
  script_root="$(cd "$(dirname "$0")/../../../.." 2>/dev/null && pwd)"
  is_repo "$script_root" && ROOT="$script_root"
fi
if [ -z "$ROOT" ] || ! is_repo "$ROOT"; then
  echo "FAIL  Kiwi repository not found (looked for kiwi/compose.yml and kiwi-ui/)."
  echo "NEXT  Clone it: git clone https://github.com/MAPS-research/kiwi.git"
  exit 2
fi
ROOT="$(cd "$ROOT" && pwd)"
BE="$ROOT/kiwi"
FE="$ROOT/kiwi-ui"

# --- Output helpers -------------------------------------------------------------
FAILS=0
WARNS=0
NEXT=""
ok()   { printf '  ok    %s\n' "$*"; }
warn() { printf '  WARN  %s\n' "$*"; WARNS=$((WARNS + 1)); }
fail() { printf '  FAIL  %s\n' "$*"; FAILS=$((FAILS + 1)); }
info() { printf '        %s\n' "$*"; }
# Remember only the earliest stage that needs work.
next() { [ -z "$NEXT" ] && NEXT="$*"; }
section() { printf '\n[%s]\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

# Value of KEY in an env file, without surrounding quotes. Never printed for
# secrets; callers only test whether it is empty or a placeholder.
env_get() {
  [ -f "$2" ] || return 0
  grep -E "^[[:space:]]*$1=" "$2" | tail -1 | cut -d= -f2- |
    sed -e 's/[[:space:]]*#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
        -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }
http_code() { local c; c="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$1" 2>/dev/null)"; echo "${c:-000}"; }

echo "Kiwi doctor — repository: $ROOT"

# --- 1. Tools -------------------------------------------------------------------
section "1. Tools"
for t in git curl openssl; do
  if have "$t"; then ok "$t"; else fail "$t is not installed"; next "Install $t."; fi
done

DOCKER_UP=0
if ! have docker; then
  fail "Docker is not installed"
  next "Install Docker Desktop (macOS/Windows) or Docker Engine (Linux)."
elif ! docker info >/dev/null 2>&1; then
  fail "Docker is installed but the daemon is not running"
  next "Start Docker Desktop (or the docker service) and wait until it is ready."
else
  DOCKER_UP=1
  ok "Docker $(docker info --format '{{.ServerVersion}}' 2>/dev/null)"
  cv="$(docker compose version --short 2>/dev/null)"
  if [ -z "$cv" ]; then
    fail "Docker Compose v2 (docker compose) is missing"
    next "Install the Docker Compose v2 plugin."
  else
    ok "Docker Compose $cv"
  fi
  mem="$(docker info --format '{{.MemTotal}}' 2>/dev/null)"
  if [ -n "$mem" ] && [ "$mem" -gt 0 ] 2>/dev/null; then
    gb=$((mem / 1024 / 1024 / 1024))
    if [ "$gb" -lt 7 ]; then
      warn "Docker has ${gb} GB of memory; the Xberg parser alone is allowed 6 GB"
      info "Raise it to 8 GB or more (Docker Desktop → Settings → Resources)."
    else
      ok "Docker memory: ${gb} GB"
    fi
  fi
fi

free_kb="$(df -Pk "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "$free_kb" ]; then
  free_gb=$((free_kb / 1024 / 1024))
  if [ "$free_gb" -lt 6 ]; then
    warn "Only ${free_gb} GB free on disk; images and node_modules need about 6 GB"
  else
    ok "Disk: ${free_gb} GB free"
  fi
fi

# Node: the repository pins an exact version.
NODE_WANT="$(tr -d '[:space:]' < "$BE/.nvmrc" 2>/dev/null)"
NODE_HAVE="$(node -v 2>/dev/null || true)"
NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
NODE_OK=0
if [ "$NODE_HAVE" = "$NODE_WANT" ]; then
  ok "Node $NODE_HAVE (matches .nvmrc)"
  NODE_OK=1
else
  if [ -n "$NODE_HAVE" ]; then
    warn "Node on PATH is $NODE_HAVE; the repository pins $NODE_WANT"
  else
    warn "Node is not on PATH; the repository pins $NODE_WANT"
  fi
  if [ -s "$NVM_SH" ]; then
    if [ -d "${NVM_DIR:-$HOME/.nvm}/versions/node/$NODE_WANT" ]; then
      info "nvm has $NODE_WANT installed. Prefix each command with:"
    else
      info "nvm is available. Install once: source \"$NVM_SH\" && nvm install $NODE_WANT"
      info "then prefix each command with:"
    fi
    info "  source \"$NVM_SH\" && nvm use $NODE_WANT >/dev/null && <command>"
  elif have fnm; then
    info "fnm is available: fnm install $NODE_WANT, then fnm exec --using $NODE_WANT -- <command>"
  elif have volta; then
    info "volta is available: volta install node@${NODE_WANT#v}"
  else
    info "No Node version manager found. Install nvm (https://github.com/nvm-sh/nvm)"
    info "or Node $NODE_WANT directly."
  fi
  next "Make Node $NODE_WANT available (see section 1)."
fi

# --- 2. Ports -------------------------------------------------------------------
section "2. Ports"
BE_ENV="$BE/.env"
DB_PORT="$(env_get DATABASE_URL "$BE_ENV" | sed -n 's#.*@[^:/]*:\([0-9][0-9]*\)/.*#\1#p')"
REDIS_PORT="$(env_get REDIS_PORT "$BE_ENV")"
XBERG_PORT="$(env_get XBERG_PORT "$BE_ENV")"
API_PORT="$(env_get PORT "$BE_ENV")"
: "${DB_PORT:=5432}" "${REDIS_PORT:=6379}" "${XBERG_PORT:=8002}" "${API_PORT:=3000}"

# Compose names the project after the directory unless COMPOSE_PROJECT_NAME is set.
PROJECT="$(env_get COMPOSE_PROJECT_NAME "$BE_ENV")"
: "${PROJECT:=$(basename "$BE" | tr '[:upper:]' '[:lower:]')}"

PORT_CONFLICT=0
check_port() { # port label kind(container|host)
  local p="$1" label="$2" kind="$3" owner proj name
  if ! port_open "$p"; then
    ok "$p ($label) is free"
    return
  fi
  owner=""
  if [ "$DOCKER_UP" = 1 ]; then
    owner="$(docker ps --filter "publish=$p" \
      --format '{{.Names}}|{{.Label "com.docker.compose.project"}}' 2>/dev/null | head -1)"
  fi
  if [ -n "$owner" ]; then
    name="${owner%%|*}"
    proj="${owner#*|}"
    if [ "$kind" = container ] && [ "$proj" = "$PROJECT" ]; then
      ok "$p ($label) is served by Kiwi's container $name"
    else
      fail "$p ($label) is taken by container '$name'${proj:+ (compose project '$proj')}"
      PORT_CONFLICT=1
    fi
    return
  fi
  local who=""
  have lsof && who="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1" (pid "$2")"}')"
  if [ "$kind" = host ]; then
    ok "$p ($label) is in use${who:+ by $who} — fine if that is Kiwi's dev server"
  else
    fail "$p ($label) is taken by ${who:-another process}"
    PORT_CONFLICT=1
  fi
}
check_port "$DB_PORT"    "PostgreSQL"        container
check_port "$REDIS_PORT" "Redis"             container
check_port 8081          "Adminer"           container
check_port 9000          "RustFS API"        container
check_port 9001          "RustFS console"    container
check_port "$XBERG_PORT" "Xberg parser"      container
check_port "$API_PORT"   "backend"           host
check_port 3001          "frontend"          host
if [ "$PORT_CONFLICT" = 1 ]; then
  info "Another program holds a port Kiwi's containers need. Either stop it, or"
  info "move Kiwi to other ports (references/configuration.md → Port conflicts)."
  next "Resolve the port conflicts in section 2."
fi

# --- 3. Configuration -----------------------------------------------------------
section "3. Configuration"
FE_ENV="$FE/.env"
if [ ! -f "$BE_ENV" ]; then
  fail "kiwi/.env does not exist"
  next "Create kiwi/.env from kiwi/.env.example (step 3)."
else
  ok "kiwi/.env exists"
  if [ -n "$(env_get LLM_API_KEY "$BE_ENV")" ]; then
    ok "LLM_API_KEY is set"
  else
    fail "LLM_API_KEY is empty — chat and embeddings will not work"
    next "Put the user's LLM API key in kiwi/.env (step 3)."
  fi
  case "$(env_get JWT_SECRET "$BE_ENV")" in
    ""|"DO NOT USE"*) warn "JWT_SECRET is still the example placeholder" ;;
    *) ok "JWT_SECRET has been changed" ;;
  esac
  case "$(env_get SESSION_SECRET "$BE_ENV")" in
    ""|"SESSION SECRET"*) warn "SESSION_SECRET is still the example placeholder" ;;
    *) ok "SESSION_SECRET has been changed" ;;
  esac
  case ",$(env_get FRONTEND_URL "$BE_ENV")," in
    *,http://localhost:3001,*) ok "FRONTEND_URL includes http://localhost:3001" ;;
    *) warn "FRONTEND_URL does not include http://localhost:3001 — the local UI will hit CORS errors" ;;
  esac
  [ "$(env_get DEV_AUTH "$BE_ENV")" = "true" ] &&
    warn "DEV_AUTH=true: anyone who can reach the API can make themselves admin"
fi
if [ -f "$FE_ENV" ]; then
  ok "kiwi-ui/.env exists"
else
  fail "kiwi-ui/.env does not exist"
  next "Create kiwi-ui/.env from kiwi-ui/.env.example (step 6)."
fi
[ -f "$BE/compose.override.yml" ] && info "kiwi/compose.override.yml is present (local port or service changes)."

# --- 4. Infrastructure containers ----------------------------------------------
section "4. Infrastructure (docker compose, in kiwi/)"
INFRA_OK=0
if [ "$DOCKER_UP" = 1 ]; then
  info "Compose project name: $PROJECT"
  # Compose names the project after the directory, so every checkout in a
  # directory called "kiwi" shares one set of containers and volumes.
  others="$(docker ps -a --filter "label=com.docker.compose.project=$PROJECT" \
    --format '{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null |
    sort -u | grep -vxF "$BE")"
  if [ -n "$others" ]; then
    warn "Containers of compose project '$PROJECT' were created from another checkout:"
    printf '%s\n' "$others" | while IFS= read -r d; do info "  $d"; done
    info "This checkout would reuse their database volume (old data, old admin"
    info "password). To keep them apart, set COMPOSE_PROJECT_NAME in kiwi/.env (step 3)."
  fi
  if docker volume inspect "${PROJECT}_db-data" >/dev/null 2>&1; then
    info "Database volume ${PROJECT}_db-data already exists; its data will be used."
  fi
  states="$(cd "$BE" && docker compose ps -a --format '{{.Service}} {{.State}} {{.Health}} {{.ExitCode}}' 2>/dev/null)"
  if [ -z "$states" ]; then
    fail "No Kiwi containers exist yet"
    next "Start the infrastructure: (cd kiwi && docker compose up -d) (step 4)."
  else
    INFRA_OK=1
    for svc in db redis oss xberg adminer; do
      line="$(printf '%s\n' "$states" | awk -v s="$svc" '$1 == s')"
      state="$(printf '%s' "$line" | awk '{print $2}')"
      health="$(printf '%s' "$line" | awk '{print $3}')"
      if [ -z "$line" ]; then
        fail "$svc: not created"; INFRA_OK=0
      elif [ "$state" != running ]; then
        fail "$svc: $state"; INFRA_OK=0
      elif [ "$health" = starting ]; then
        warn "$svc: running, health check still starting (Xberg takes about a minute)"
      elif [ "$health" = unhealthy ]; then
        fail "$svc: running but unhealthy — see: docker compose logs $svc"; INFRA_OK=0
      else
        ok "$svc: running${health:+ ($health)}"
      fi
    done
    init="$(printf '%s\n' "$states" | awk '$1 == "oss-init"')"
    if [ -n "$init" ]; then
      code="$(printf '%s' "$init" | awk '{print $NF}')"
      st="$(printf '%s' "$init" | awk '{print $2}')"
      if [ "$st" = exited ] && [ "$code" = 0 ]; then
        ok "oss-init: finished (bucket 'kiwi' created) — 'exited' is expected"
      elif [ "$st" = exited ]; then
        fail "oss-init exited with code $code — see: docker compose logs oss-init"; INFRA_OK=0
      else
        info "oss-init: $st"
      fi
    fi
    [ "$INFRA_OK" = 1 ] || next "Fix the infrastructure containers in section 4 (step 4)."
  fi
else
  fail "Skipped: Docker is not running"
fi

# --- 5. Dependencies and database ------------------------------------------------
section "5. Dependencies and database"
if [ -d "$BE/node_modules" ]; then ok "kiwi/node_modules installed"; else
  fail "kiwi/node_modules missing"; next "Install backend dependencies: (cd kiwi && npm install) (step 5)."; fi
if [ -d "$FE/node_modules" ]; then ok "kiwi-ui/node_modules installed"; else
  fail "kiwi-ui/node_modules missing"; fi

if [ "$INFRA_OK" = 1 ]; then
  psql_q() { (cd "$BE" && docker compose exec -T db psql -U kiwi -d kiwi -tAc "$1") 2>/dev/null | tr -d '[:space:]'; }
  want="$(find "$BE/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  have_m="$(psql_q 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')"
  if [ -z "$have_m" ]; then
    fail "Migrations have not been applied"
    next "Apply migrations: (cd kiwi && npx prisma migrate deploy) (step 5)."
  elif [ "$have_m" -lt "$want" ] 2>/dev/null; then
    fail "$have_m of $want migrations applied"
    next "Apply migrations: (cd kiwi && npx prisma migrate deploy) (step 5)."
  else
    ok "All $want migrations applied"
    admins="$(psql_q "SELECT count(*) FROM \"User\" WHERE \"systemRole\" = 'admin' AND \"passwordHash\" IS NOT NULL")"
    if [ "${admins:-0}" -gt 0 ] 2>/dev/null; then
      ok "An admin account with a password exists"
    else
      fail "No admin account with a password yet"
      next "Seed the database: (cd kiwi && npx prisma db seed) (step 5)."
    fi
  fi
else
  info "Database checks skipped until the infrastructure is up."
fi

# --- 6. Running services ----------------------------------------------------------
section "6. Services"
if [ "$INFRA_OK" = 1 ]; then
  c="$(http_code "http://127.0.0.1:$XBERG_PORT/health")"
  [ "$c" = 200 ] && ok "Xberg parser answers on :$XBERG_PORT" || fail "Xberg parser not answering on :$XBERG_PORT (HTTP $c)"
  c="$(http_code "http://127.0.0.1:9000/health/ready")"
  [ "$c" = 200 ] && ok "RustFS answers on :9000" || fail "RustFS not answering on :9000 (HTTP $c)"
fi
# /docs-json answers as soon as the server listens; /health also needs the database.
c="$(http_code "http://localhost:$API_PORT/docs-json")"
if [ "$c" = 200 ]; then
  ok "Backend is up: http://localhost:$API_PORT (Swagger at /docs)"
else
  fail "Backend is not answering on :$API_PORT (HTTP $c)"
  next "Start the backend: (cd kiwi && npm run start:dev), in the background (step 5)."
fi
c="$(http_code "http://localhost:3001/")"
if [ "$c" = 200 ]; then
  ok "Frontend is up: http://localhost:3001"
else
  fail "Frontend is not answering on :3001 (HTTP $c)"
  next "Start the frontend: (cd kiwi-ui && npm run dev), in the background (step 6)."
fi

# --- Summary ----------------------------------------------------------------------
echo
if [ "$FAILS" = 0 ]; then
  echo "RESULT  All checks passed ($WARNS warning(s)). Open http://localhost:3001 and sign in."
  exit 0
fi
echo "RESULT  $FAILS problem(s), $WARNS warning(s)."
[ -n "$NEXT" ] && echo "NEXT    $NEXT"
exit 1
