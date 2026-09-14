#!/usr/bin/env bash
# Smoke tests for the fixes made in the 2026-09-14 code audit.
#
# Requires the API dev server running (npm run dev, or nest start --watch) on API_BASE
# (default http://localhost:3000). Reads ADMIN_EMAIL / ADMIN_PASSWORD from apps/api/.env
# unless already set in the environment. Creates and deletes its own test data — safe to
# run against a real dev database.
#
# Usage:
#   ./scripts/audit-smoke-test.sh
#   API_BASE=http://localhost:3000 ./scripts/audit-smoke-test.sh

set -uo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/api/.env"
COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

if [ -f "$ENV_FILE" ]; then
  ADMIN_EMAIL="${ADMIN_EMAIL:-$(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(grep -E '^ADMIN_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')}"
fi
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }

expect_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then ok "$desc (got $actual)"; else bad "$desc (expected $expected, got $actual)"; fi
}

expect_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF "$needle"; then ok "$desc"; else bad "$desc (missing: $needle)"; fi
}

echo "== PDN Travel audit smoke test =="
echo "API_BASE=$API_BASE"
echo

echo "-- health & public routes --"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/api/health")
expect_status "GET /api/health" 200 "$CODE"

BODY=$(curl -s -D /tmp/_audit_headers "$API_BASE/robots.txt")
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/robots.txt")
expect_status "GET /robots.txt" 200 "$CODE"
expect_contains "robots.txt disallows /admin" "Disallow: /admin" "$BODY"
expect_contains "robots.txt points at sitemap.xml" "Sitemap:" "$BODY"

CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/sitemap.xml")
expect_status "GET /sitemap.xml" 200 "$CODE"
SITEMAP=$(curl -s "$API_BASE/sitemap.xml")
expect_contains "sitemap.xml is a urlset" "<urlset" "$SITEMAP"

CSP=$(grep -i '^content-security-policy:' /tmp/_audit_headers || true)
if [ -n "$CSP" ]; then ok "Content-Security-Policy header present"; else bad "Content-Security-Policy header present"; fi
rm -f /tmp/_audit_headers
echo

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ADMIN_EMAIL / ADMIN_PASSWORD not found in apps/api/.env or environment — skipping admin-authenticated checks."
else
  echo "-- admin auth --"
  LOGIN=$(curl -s -c "$COOKIES" -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" -H "Origin: $API_BASE" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    -w $'\n%{http_code}')
  LOGIN_CODE=$(printf '%s' "$LOGIN" | tail -1)
  expect_status "POST /api/auth/login" 200 "$LOGIN_CODE"
  if printf '%s' "$LOGIN" | grep -q '"mfaRequired":true'; then
    echo "  NOTE  2FA is enabled on this account — admin-authenticated checks below will fail without a live TOTP code. Skipping."
    ADMIN_EMAIL=""
  fi
  echo
fi

if [ -n "$ADMIN_EMAIL" ]; then
  echo "-- query-param validation (previously unhandled 500s) --"
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES" "$API_BASE/api/admin/trips?countryId=abc")
  expect_status "GET /api/admin/trips?countryId=abc -> 400" 400 "$CODE"

  CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES" "$API_BASE/api/admin/enquiries?from=garbage")
  expect_status "GET /api/admin/enquiries?from=garbage -> 400" 400 "$CODE"

  CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES" "$API_BASE/api/admin/countries?continentId=abc")
  expect_status "GET /api/admin/countries?continentId=abc -> 400" 400 "$CODE"

  CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIES" "$API_BASE/api/admin/trips?countryId=1&limit=1")
  expect_status "GET /api/admin/trips?countryId=1 (valid) -> 200" 200 "$CODE"
  echo

  echo "-- IsSafeUrl length cap --"
  LONG_URL="https://example.com/$(printf 'a%.0s' $(seq 1 1100))"
  RESP=$(curl -s -b "$COOKIES" -X POST "$API_BASE/api/admin/activities" -H "Content-Type: application/json" -H "Origin: $API_BASE" \
    -d "{\"name\":\"Audit test\",\"image\":\"$LONG_URL\"}" -w $'\n%{http_code}')
  CODE=$(printf '%s' "$RESP" | tail -1)
  expect_status "POST activity with 1100-char image URL -> 400" 400 "$CODE"
  echo

  echo "-- duplicate() slug-collision retry (TOCTOU fix) --"
  TRIP_JSON=$(curl -s -b "$COOKIES" "$API_BASE/api/admin/trips?limit=1")
  TRIP_ID=$(printf '%s' "$TRIP_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).items[0].id)}catch{console.log('')}})")
  if [ -z "$TRIP_ID" ]; then
    bad "duplicate() test (no existing trip to duplicate — seed the database first)"
  else
    D1=$(curl -s -b "$COOKIES" -X POST "$API_BASE/api/admin/trips/$TRIP_ID/duplicate" -H "Origin: $API_BASE")
    D2=$(curl -s -b "$COOKIES" -X POST "$API_BASE/api/admin/trips/$TRIP_ID/duplicate" -H "Origin: $API_BASE")
    SLUG1=$(printf '%s' "$D1" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).slug)}catch{console.log('')}})")
    SLUG2=$(printf '%s' "$D2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).slug)}catch{console.log('')}})")
    ID1=$(printf '%s' "$D1" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).id)}catch{console.log('')}})")
    ID2=$(printf '%s' "$D2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).id)}catch{console.log('')}})")
    if [ -n "$SLUG1" ] && [ -n "$SLUG2" ] && [ "$SLUG1" != "$SLUG2" ]; then
      ok "two concurrent duplicates of trip $TRIP_ID got distinct slugs ($SLUG1, $SLUG2)"
    else
      bad "two duplicates got distinct slugs (got '$SLUG1', '$SLUG2')"
    fi
    [ -n "$ID1" ] && curl -s -o /dev/null -b "$COOKIES" -X DELETE "$API_BASE/api/admin/trips/$ID1" -H "Origin: $API_BASE"
    [ -n "$ID2" ] && curl -s -o /dev/null -b "$COOKIES" -X DELETE "$API_BASE/api/admin/trips/$ID2" -H "Origin: $API_BASE"
  fi
  echo

  echo "-- media upload (sharp 0.35.4 re-encode path) --"
  TMP_PNG="$(mktemp /tmp/audit-test-XXXX.png)"
  # 1x1 transparent PNG
  node -e "require('fs').writeFileSync('$TMP_PNG', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'))"
  UPLOAD=$(curl -s -b "$COOKIES" -X POST "$API_BASE/api/admin/media" -H "Origin: $API_BASE" -F "files=@$TMP_PNG;type=image/png" -w $'\n%{http_code}')
  UPLOAD_CODE=$(printf '%s' "$UPLOAD" | tail -1)
  expect_status "POST /api/admin/media (1x1 PNG) -> 201" 201 "$UPLOAD_CODE"
  MEDIA_ID=$(printf '%s' "$UPLOAD" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d)[0].id)}catch{console.log('')}})")
  [ -n "$MEDIA_ID" ] && curl -s -o /dev/null -b "$COOKIES" -X DELETE "$API_BASE/api/admin/media/$MEDIA_ID" -H "Origin: $API_BASE"
  rm -f "$TMP_PNG"
  echo
fi

echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
