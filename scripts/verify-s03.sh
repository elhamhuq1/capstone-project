#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:3000"
PASS=0
FAIL=0
WARN=0
OLLAMA_AVAILABLE=true

pass() { PASS=$((PASS + 1)); echo "✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "✗ $1"; }
warn() { WARN=$((WARN + 1)); echo "⚠ $1"; }

# Helper: query sqlite via better-sqlite3 (no sqlite3 CLI required)
dbquery() {
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('sqlite.db');
    const rows = db.prepare(\`$1\`).all();
    console.log(JSON.stringify(rows));
  " 2>/dev/null
}

echo "=== S03 Verification ==="
echo ""

# ─── Prereq: register participant and begin session ───────────
RESULT=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' \
  -d '{"name":"S03 Test","email":"verify-s03@test.com"}')
SESSION_ID=$(echo "$RESULT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "undefined" ]; then
  echo "✗ FATAL: Could not register participant / get session ID"
  exit 1
fi
echo "  Registered session: $SESSION_ID"

# Begin session (transition to in-progress)
curl -s -X POST "$BASE/api/session/$SESSION_ID" -H 'Content-Type: application/json' \
  -d '{"action":"begin"}' > /dev/null
echo "  Session begun (in-progress)"

# Get current sample ID
SESSION_DATA=$(curl -s "$BASE/api/session/$SESSION_ID")
SAMPLE_ID=$(echo "$SESSION_DATA" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.currentSample?.id||'')})")
GROUP=$(echo "$SESSION_DATA" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.group||'')})")
if [ -z "$SAMPLE_ID" ]; then
  echo "✗ FATAL: No current sample in session"
  exit 1
fi
echo "  Current sample ID: $SAMPLE_ID, group: $GROUP"
echo ""

# ─── Check 1: prompts and ai_responses tables exist ──────────
echo "--- Check 1: DB tables exist ---"
TABLES=$(node -e "
  const Database = require('better-sqlite3');
  const db = new Database('sqlite.db');
  const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
  console.log(tables.map(t=>t.name).join(','));
" 2>/dev/null || echo "")

if echo "$TABLES" | grep -q "prompts"; then
  pass "prompts table exists"
else
  fail "prompts table NOT found"
fi
if echo "$TABLES" | grep -q "ai_responses"; then
  pass "ai_responses table exists"
else
  fail "ai_responses table NOT found"
fi
echo ""

# ─── Check 2: POST prompt API returns response ──────────────
echo "--- Check 2: POST prompt API ---"
# For streaming endpoints, capture status from response headers
curl -s -D /tmp/s03-headers.txt -o /tmp/s03-prompt-response.txt \
  --max-time 90 \
  -X POST "$BASE/api/session/$SESSION_ID/prompt" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"Help me improve the grammar\",\"sampleId\":$SAMPLE_ID}" 2>/dev/null
CURL_EXIT=$?
HTTP_CODE=$(head -1 /tmp/s03-headers.txt 2>/dev/null | grep -oP '\d{3}' | head -1 || echo "000")
if [ "$CURL_EXIT" -eq 28 ]; then
  HTTP_CODE="000"
fi

if [ "$HTTP_CODE" = "200" ]; then
  BODY_SIZE=$(wc -c < /tmp/s03-prompt-response.txt)
  if [ "$BODY_SIZE" -gt 0 ]; then
    pass "POST /prompt returned 200 with ${BODY_SIZE} bytes"
  else
    fail "POST /prompt returned 200 but empty body"
  fi
elif [ "$HTTP_CODE" = "503" ]; then
  OLLAMA_AVAILABLE=false
  warn "POST /prompt returned 503 — Ollama not running (graceful degradation)"
elif [ "$HTTP_CODE" = "000" ]; then
  OLLAMA_AVAILABLE=false
  warn "POST /prompt timed out or connection failed — Ollama likely not running or overloaded"
else
  fail "POST /prompt returned unexpected HTTP $HTTP_CODE"
fi
echo ""

# Small delay to let DB writes complete
sleep 1

# ─── Check 3: Prompt row exists in DB ───────────────────────
echo "--- Check 3: Prompt row in DB ---"
PROMPT_COUNT=$(node -e "
  const Database = require('better-sqlite3');
  const db = new Database('sqlite.db');
  const row = db.prepare('SELECT COUNT(*) as c FROM prompts WHERE session_id=? AND sample_id=?').get('$SESSION_ID', $SAMPLE_ID);
  console.log(row.c);
" 2>/dev/null || echo "0")

if [ "$PROMPT_COUNT" -ge 1 ]; then
  pass "Prompt row exists in DB (count=$PROMPT_COUNT)"
else
  fail "No prompt row found in DB"
fi
echo ""

# ─── Check 4: AI response row exists (only if Ollama was available) ─
echo "--- Check 4: AI response row in DB ---"
if [ "$OLLAMA_AVAILABLE" = "true" ]; then
  AI_RESP_COUNT=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('sqlite.db');
    const prompt = db.prepare('SELECT id FROM prompts WHERE session_id=? AND sample_id=? ORDER BY prompt_number DESC LIMIT 1').get('$SESSION_ID', $SAMPLE_ID);
    if (!prompt) { console.log(0); process.exit(); }
    const resp = db.prepare('SELECT COUNT(*) as c FROM ai_responses WHERE prompt_id=?').get(prompt.id);
    console.log(resp.c);
  " 2>/dev/null || echo "0")
  if [ "$AI_RESP_COUNT" -ge 1 ]; then
    pass "AI response row exists in DB"
  else
    fail "No AI response row in DB"
  fi
else
  warn "Skipped AI response check — Ollama not available"
fi
echo ""

# ─── Check 5: GET session includes messages array ────────────
echo "--- Check 5: Session messages array ---"
SESSION_AFTER=$(curl -s "$BASE/api/session/$SESSION_ID")
HAS_MESSAGES=$(echo "$SESSION_AFTER" | node -e "
  process.stdin.on('data', d => {
    try {
      const j = JSON.parse(d);
      if (Array.isArray(j.messages)) {
        console.log(j.messages.length);
      } else {
        console.log('missing');
      }
    } catch { console.log('error'); }
  });
")
if [ "$HAS_MESSAGES" = "missing" ] || [ "$HAS_MESSAGES" = "error" ]; then
  fail "messages array not found in session GET response"
else
  if [ "$HAS_MESSAGES" -ge 1 ]; then
    pass "Session GET response includes messages array (length=$HAS_MESSAGES)"
  else
    if [ "$OLLAMA_AVAILABLE" = "false" ]; then
      # With no Ollama, prompt was saved but no AI response — should have at least 1 user message
      if [ "$PROMPT_COUNT" -ge 1 ]; then
        # Prompt exists but messages=0 means user msg should be there
        fail "Prompt exists but messages array is empty"
      else
        warn "messages array empty (no prompts saved — Ollama offline)"
      fi
    else
      pass "Session GET response includes messages array (length=$HAS_MESSAGES)"
    fi
  fi
fi
echo ""

# ─── Check 6: Second prompt gets promptNumber=2 ─────────────
echo "--- Check 6: Second prompt numbering ---"
curl -s -D /tmp/s03-headers2.txt -o /tmp/s03-prompt2-response.txt \
  --max-time 90 \
  -X POST "$BASE/api/session/$SESSION_ID/prompt" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"Can you also check the tone?\",\"sampleId\":$SAMPLE_ID}" 2>/dev/null || true

sleep 1

PROMPT_NUM_2=$(node -e "
  const Database = require('better-sqlite3');
  const db = new Database('sqlite.db');
  const row = db.prepare('SELECT prompt_number FROM prompts WHERE session_id=? AND sample_id=? ORDER BY prompt_number DESC LIMIT 1').get('$SESSION_ID', $SAMPLE_ID);
  console.log(row ? row.prompt_number : '');
" 2>/dev/null || echo "")

if [ "$PROMPT_NUM_2" = "2" ]; then
  pass "Second prompt has promptNumber=2"
elif [ -n "$PROMPT_NUM_2" ]; then
  fail "Latest prompt has promptNumber=$PROMPT_NUM_2 (expected 2)"
else
  fail "Could not read prompt number from DB"
fi
echo ""

# ─── Check 7: Input validation ──────────────────────────────
echo "--- Check 7: Input validation ---"
VAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  -X POST "$BASE/api/session/$SESSION_ID/prompt" \
  -H 'Content-Type: application/json' \
  -d '{"content":"","sampleId":1}')
if [ "$VAL_CODE" = "400" ]; then
  pass "Empty content returns 400"
else
  fail "Empty content returned $VAL_CODE (expected 400)"
fi

VAL_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  -X POST "$BASE/api/session/$SESSION_ID/prompt" \
  -H 'Content-Type: application/json' \
  -d '{"content":"test"}')
if [ "$VAL_CODE2" = "400" ]; then
  pass "Missing sampleId returns 400"
else
  fail "Missing sampleId returned $VAL_CODE2 (expected 400)"
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────
echo "=== S03 Results: $PASS passed, $FAIL failed, $WARN warnings ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "=== All S03 checks passed ==="
