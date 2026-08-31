#!/usr/bin/env bash
#
# register.sh — get the Hello Kiwi reference app registered with a local Kiwi.
#
# The registration order is strict (see KIWI_APP_DEVELOPER_GUIDE.md §4):
#
#     [admin] whitelist (approved)  ->  [dev] register  ->  [admin] enable in a class
#
# Steps 1 and 3 are admin-only, so you need an admin JWT. Step 2 is public but
# checks the whitelist + secret. This script runs whichever steps you have the
# inputs for and prints every response so you can see exactly what happened.
#
# Usage:
#     KIWI=http://localhost:3000 \
#     ADMIN_TOKEN=eyJ... \
#     APP_URL=http://localhost:8000/hello-kiwi-app/ \
#     CLASS_ID=<classId> \
#     ./register.sh
#
# Minimum to register (steps 1+2): ADMIN_TOKEN. Add CLASS_ID to also enable it.

set -euo pipefail

# ---- Config (override via env) ----
KIWI="${KIWI:-http://localhost:3000}"          # Kiwi backend base URL
SLUG="${SLUG:-demo}"                            # app id (must match the demo's appSlug)
SECRET="${SECRET:-dev-secret}"                  # plaintext registration secret
# Where YOU serve index.html — the EXACT URL, origin *and* path. The host
# targets postMessage at this origin and loads the iframe from this URL, so a
# value that merely points at the right server (…:8000 instead of
# …:8000/hello-kiwi-app/) registers a tab that loads the wrong page.
APP_URL="${APP_URL:-http://localhost:8000/hello-kiwi-app/}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"                  # admin JWT (for whitelist + enable)
CLASS_ID="${CLASS_ID:-}"                         # optional: enable the app in this class

SCOPES='["user:profile:read","class:info:read","class:enrollments:read","class:materials:chunks:read","context:student_learning:read"]'

# Prompt used by the "Contextual study coach" card (kiwi_app_contextual_chat).
# Registered inactive; an admin must approve it (step 4) before the
# llm:prompt:weekly-summary scope resolves.
PROMPT_ID="${PROMPT_ID:-weekly-summary}"

say()  { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# Pretty-print JSON if python3 is available, else passthrough.
pp() { if command -v python3 >/dev/null 2>&1; then python3 -m json.tool 2>/dev/null || cat; else cat; fi; }

# -----------------------------------------------------------------------------
say "1/3  Whitelist '$SLUG' (admin) — POST /api/kiwi-apps/whitelist"
if [ -z "$ADMIN_TOKEN" ]; then
  warn "ADMIN_TOKEN not set — skipping. An admin must whitelist '$SLUG' (status:approved) before you can register."
else
  curl -sS -X POST "$KIWI/api/kiwi-apps/whitelist" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"slug\": \"$SLUG\",
      \"registrationSecret\": \"$SECRET\",
      \"baseUrl\": \"$APP_URL\",
      \"status\": \"approved\",
      \"description\": \"Hello Kiwi reference app\",
      \"maxScopes\": $SCOPES
    }" | pp || warn "whitelist call failed (it may already exist — that's fine)"
fi

# -----------------------------------------------------------------------------
say "2/3  Register '$SLUG' (public, idempotent) — POST /api/kiwi-apps/register"
REG_RESPONSE=$(curl -sS -X POST "$KIWI/api/kiwi-apps/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"$SLUG\",
    \"registrationSecret\": \"$SECRET\",
    \"name\": \"Hello Kiwi\",
    \"description\": \"Reference app showing every Kiwi App capability\",
    \"baseUrl\": \"$APP_URL\",
    \"appType\": \"frontend_only\",
    \"capabilities\": [\"ai\", \"mcp\"],
    \"uis\": [
      {
        \"uiSlug\": \"student\",
        \"uiName\": \"Hello Kiwi\",
        \"uiUrl\": \"$APP_URL\",
        \"placement\": \"class-tab\",
        \"allowedRoles\": [\"student\", \"ta\", \"instructor\", \"admin\"],
        \"tabOrder\": 0
      }
    ],
    \"prompts\": [
      {
        \"promptId\": \"$PROMPT_ID\",
        \"name\": \"Weekly Study Summary\",
        \"description\": \"Summarizes the student's recent learning and suggests focus areas\",
        \"systemPrompt\": \"You are a supportive study coach. Using the private learning context Kiwi provides (recent questions, weak concepts, relevant materials), write a short, encouraging weekly summary and concrete focus areas. Never reveal raw data verbatim.\",
        \"maxTokens\": 600,
        \"temperature\": 0.4
      }
    ]
  }")
echo "$REG_RESPONSE" | pp

# Pull the registered app's id out of the response (needed to enable it in a class).
APP_ID=$(printf '%s' "$REG_RESPONSE" | python3 -c \
  'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null || true)

# -----------------------------------------------------------------------------
say "3/3  Enable in class (admin) — POST /api/classes/$CLASS_ID/apps"
if [ -z "$CLASS_ID" ]; then
  warn "CLASS_ID not set — skipping. Set CLASS_ID=<id> to enable '$SLUG' as a tab in that class."
elif [ -z "$ADMIN_TOKEN" ]; then
  warn "ADMIN_TOKEN not set — skipping the enable step."
elif [ -z "$APP_ID" ]; then
  warn "Could not read the app id from the register response — cannot enable. Check step 2 output."
else
  curl -sS -X POST "$KIWI/api/classes/$CLASS_ID/apps" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"appId\": \"$APP_ID\",
      \"tabLabel\": \"Hello Kiwi\",
      \"enabledScopes\": $SCOPES
    }" | pp || warn "enable call failed"
fi

# -----------------------------------------------------------------------------
say "4/4  Approve prompt '$PROMPT_ID' (admin) — POST /api/kiwi-apps/$SLUG/prompts/$PROMPT_ID/approve"
# Prompts register inactive; the llm:prompt:$PROMPT_ID scope only resolves once
# an admin approves it. Needed for the "Contextual study coach" card (#217).
if [ -z "$ADMIN_TOKEN" ]; then
  warn "ADMIN_TOKEN not set — skipping. An admin must approve '$PROMPT_ID' before kiwi_app_contextual_chat works."
else
  curl -sS -X POST "$KIWI/api/kiwi-apps/$SLUG/prompts/$PROMPT_ID/approve" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" | pp || warn "approve call failed (may already be approved — that's fine)"
fi

say "Done."
echo "Next:"
echo "  • Serve the REPO ROOT (so /hello-kiwi-app/ and /kiwi-app-sdk/ both resolve):"
echo "        python3 -m http.server 8000"
echo "  • Confirm the app loads at exactly:  $APP_URL"
echo "    That must match the registered uiUrl origin AND path, or the tab loads"
echo "    the wrong page and the bridge handshake never completes."
echo "  • Open the class in Kiwi — the \"Hello Kiwi\" tab should appear."
echo "  • The content/coaching cards go through the window bridge as host-proxied"
echo "    ops, so no CORS entry and no app token are needed on your side."
echo "    See KIWI_APP_DEVELOPER_GUIDE.md §8.3b."
