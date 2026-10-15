#!/usr/bin/env bash
# Set KEY=value in a dotenv file without echoing the value.
#
# Usage: set-env.sh <file> <KEY> [value]
#        set-env.sh <file> <KEY> --random      # 48 random hex characters
#        printf '%s' "$secret" | set-env.sh <file> <KEY> --stdin
#
# Replaces the last uncommented KEY= line, or appends one if there is none.
# The value is written single-quoted, which both dotenv (the backend) and
# Docker Compose (which also reads kiwi/.env) take literally, so `$` and `#`
# are safe. Values containing a single quote or a newline are refused.
# Only the key name is printed, never the value.

set -eu

[ $# -ge 2 ] || { sed -n '2,12p' "$0"; exit 2; }
file="$1"; key="$2"; mode="${3:-}"

case "$key" in
  *[!A-Za-z0-9_]*|"") echo "Invalid key: $key" >&2; exit 2 ;;
esac
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }

case "$mode" in
  --random) value="$(openssl rand -hex 24)" ;;
  --stdin)  value="$(cat)" ;;
  *)        value="$mode" ;;
esac

case "$value" in
  *"'"*|*"
"*) echo "Refusing $key: the value contains a single quote or a newline." >&2; exit 1 ;;
esac
line="$key='$value'"

tmp="$(mktemp "${file}.XXXXXX")"
LINE="$line" KEY="$key" awk '
  BEGIN { key = ENVIRON["KEY"]; line = ENVIRON["LINE"] }
  { rows[NR] = $0 }
  $0 ~ "^[[:space:]]*" key "=" { last = NR }
  END {
    for (i = 1; i <= NR; i++) print (i == last ? line : rows[i])
    if (!last) print line
  }
' "$file" > "$tmp"
chmod 600 "$tmp"
mv "$tmp" "$file"
echo "Set $key in $file"
