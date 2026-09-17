#!/usr/bin/env bash
#
# register.sh — register the Hello Kiwi reference app with a local Kiwi.
#
# Registration happens in this order (see KIWI_APP_DEVELOPER_GUIDE.md):
#
#   1. [admin] whitelist the app (approved)
#   2. [app]   register the app, its UI and its prompt
#   3. [admin] approve the prompt
#   4. [admin] enable the app in a class
#
# Admin endpoints need a signed-in session, not just a token, so the script
# logs in with the admin's email and password and reuses that session.
#
# Usage:
#     ADMIN_PASSWORD=... CLASS_ID=seed-class-001 ./register.sh
#
# Optional overrides:
#     KIWI            backend URL             (default http://localhost:3000)
#     ADMIN_EMAIL     admin account           (default admin@example.com)
#     APP_URL         where you serve the app (default http://localhost:8000/hello-kiwi-app/)
#     SLUG, SECRET, PROMPT_ID
#
# Without ADMIN_PASSWORD only step 2 runs. Without CLASS_ID step 4 is skipped.

set -euo pipefail

# ---- Config -----------------------------------------------------------------
KIWI="${KIWI:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
CLASS_ID="${CLASS_ID:-}"
SLUG="${SLUG:-demo}"                                   # must match the demo's appSlug
# Registration secret: at least 32 characters. Change it for anything but local use.
SECRET="${SECRET:-hello-kiwi-local-development-secret}"
# The EXACT URL you serve index.html from, origin and path. The host loads the
# iframe from here and only accepts messages from this origin.
APP_URL="${APP_URL:-http://localhost:8000/hello-kiwi-app/}"
PROMPT_ID="${PROMPT_ID:-weekly-summary}"

# The app only uses these. An approved prompt reaches the app token only if its
# llm:prompt:<id> scope is in maxScopes.
SCOPES="[\"class:materials:chunks:read\",\"context:student_learning:read\",\"llm:prompt:$PROMPT_ID\"]"

# ---- Helpers ----------------------------------------------------------------
say()  { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
pp()   { if command -v python3 >/dev/null 2>&1; then python3 -m json.tool 2>/dev/null || cat; else cat; fi; }

command -v python3 >/dev/null 2>&1 || die "python3 is required"
[ ${#SECRET} -ge 32 ] || die "SECRET must be at least 32 characters"

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
TOKEN=""

# admin_call METHOD PATH [JSON]  — prints the body; returns non-zero on HTTP errors
admin_call() {
  local args=(-sS --fail-with-body -X "$1" "$KIWI$2" -b "$JAR"
              -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
  [ $# -ge 3 ] && args+=(-d "$3")
  curl "${args[@]}"
}

# ---- Sign in ----------------------------------------------------------------
if [ -n "$ADMIN_PASSWORD" ]; then
  say "Signing in as $ADMIN_EMAIL"
  LOGIN=$(curl -sS --fail-with-body -c "$JAR" -X POST "$KIWI/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}") \
    || die "login failed: $LOGIN"
  TOKEN=$(printf '%s' "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
else
  warn "ADMIN_PASSWORD not set: only step 2 will run. An admin must do steps 1, 3 and 4."
fi

# ---- 1. Whitelist -------------------------------------------------------------
say "1/4  Whitelist '$SLUG'"
if [ -n "$TOKEN" ]; then
  admin_call POST /api/kiwi-apps/whitelist "{
      \"slug\": \"$SLUG\",
      \"registrationSecret\": \"$SECRET\",
      \"baseUrl\": \"$APP_URL\",
      \"status\": \"approved\",
      \"description\": \"Hello Kiwi reference app\",
      \"maxScopes\": $SCOPES
    }" | pp || warn "not created (it may already exist; an existing entry keeps its original secret and scopes)"
fi

# ---- 2. Register ----------------------------------------------------------------
say "2/4  Register '$SLUG'"
REG=$(curl -sS --fail-with-body -X POST "$KIWI/api/kiwi-apps/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"$SLUG\",
    \"registrationSecret\": \"$SECRET\",
    \"name\": \"Hello Kiwi\",
    \"description\": \"Reference app showing every Kiwi App capability\",
    \"baseUrl\": \"$APP_URL\",
    \"appType\": \"frontend_only\",
    \"capabilities\": [\"ai\"],
    \"uis\": [{
      \"uiSlug\": \"student\",
      \"uiName\": \"Hello Kiwi\",
      \"uiUrl\": \"$APP_URL\",
      \"placement\": \"class-tab\",
      \"allowedRoles\": [\"student\", \"ta\", \"instructor\", \"admin\"],
      \"tabOrder\": 0
    }],
    \"prompts\": [{
      \"promptId\": \"$PROMPT_ID\",
      \"name\": \"Weekly Study Summary\",
      \"description\": \"Summarizes the student's recent learning and suggests focus areas\",
      \"systemPrompt\": \"You are a supportive study coach. Using the private learning context Kiwi provides (recent questions, weak concepts, relevant materials), write a short, encouraging weekly summary and concrete focus areas. Never reveal raw data verbatim.\",
      \"maxTokens\": 600,
      \"temperature\": 0.4
    }]
  }") || die "registration failed: $REG"
echo "$REG" | pp
APP_ID=$(printf '%s' "$REG" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')

# ---- 3. Approve the prompt -----------------------------------------------------
say "3/4  Approve prompt '$PROMPT_ID'"
if [ -n "$TOKEN" ]; then
  admin_call POST "/api/kiwi-apps/$SLUG/prompts/$PROMPT_ID/approve" | pp \
    || warn "approval failed"
fi

# ---- 4. Enable in a class ------------------------------------------------------
say "4/4  Enable in class"
if [ -z "$TOKEN" ]; then
  :
elif [ -z "$CLASS_ID" ]; then
  warn "CLASS_ID not set: skipped. Set CLASS_ID=<id> to add the app as a class tab."
else
  admin_call POST "/api/classes/$CLASS_ID/apps" \
    "{\"appId\": \"$APP_ID\", \"tabLabel\": \"Hello Kiwi\"}" | pp \
    || warn "enable failed"
fi

say "Done."
cat <<NEXT
Next:
  • Serve kiwi-app-developer-guide-example/ (so /hello-kiwi-app/ and
    /kiwi-app-sdk/ both resolve), e.g. from that directory:
        python3 -m http.server 8000
  • Check the app loads at exactly $APP_URL
  • Open the class in Kiwi: a "Hello Kiwi" tab should appear.
NEXT
