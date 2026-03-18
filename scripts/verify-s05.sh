#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:3000"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "✗ $1"; }

# Helper: query sqlite via better-sqlite3 (no sqlite3 CLI required)
dbquery() {
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('sqlite.db');
    const rows = db.prepare(\`$1\`).all();
    console.log(JSON.stringify(rows));
  " 2>/dev/null
}

UNIQUE_SUFFIX=$(date +%s)-$$
echo "=== S05 Verification — Researcher Dashboard + CSV Export ==="
echo ""

# ─── Seed 3 test participants (one per group) through full flow ──
echo "--- Seeding 3 participants through full 3-sample flow ---"

GROUPS=("single-shot" "iterative" "scaffold")
SESSION_IDS=()
ASSIGNED_GROUPS=()

for g_idx in 0 1 2; do
  DISPLAY=$((g_idx + 1))
  REG_RESULT=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"S05 Test P${DISPLAY}\",\"email\":\"verify-s05-p${DISPLAY}-${UNIQUE_SUFFIX}@test.com\"}")
  SID=$(echo "$REG_RESULT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
  AGROUP=$(echo "$REG_RESULT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).group))")

  if [ -z "$SID" ] || [ "$SID" = "undefined" ]; then
    fail "Could not register participant $DISPLAY"
    echo ""
    echo "=== Results: $PASS passed, $FAIL failed ==="
    exit 1
  fi
  SESSION_IDS+=("$SID")
  ASSIGNED_GROUPS+=("$AGROUP")
  echo "  Participant $DISPLAY: session=$SID group=$AGROUP"

  # Begin session
  curl -s -X POST "$BASE/api/session/$SID" -H 'Content-Type: application/json' \
    -d '{"action":"begin"}' > /dev/null

  # Run full 3-sample flow: timing start → revision → timing complete → survey → advance
  for i in 0 1 2; do
    SAMPLE_IDX=$((i + 1))

    # Get current sample
    SDATA=$(curl -s "$BASE/api/session/$SID")
    SAMPLE_ID=$(echo "$SDATA" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).currentSample?.id))")
    STATUS=$(echo "$SDATA" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")

    if [ "$STATUS" = "completed" ]; then
      echo "    ✗ Session completed early at sample $SAMPLE_IDX"
      fail "Participant $DISPLAY session completed early"
      break
    fi

    if [ -z "$SAMPLE_ID" ] || [ "$SAMPLE_ID" = "undefined" ]; then
      echo "    ✗ No current sample at index $i"
      fail "Participant $DISPLAY missing sample at index $i"
      break
    fi

    # Start timing
    curl -s -X POST "$BASE/api/session/$SID/timing" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SAMPLE_ID,\"sampleIndex\":$i,\"event\":\"start\"}" > /dev/null

    # Save a revision
    curl -s -X POST "$BASE/api/session/$SID/revision" \
      -H 'Content-Type: application/json' \
      -d "{\"content\":\"S05 verify text for P${DISPLAY} sample ${SAMPLE_IDX}\"}" > /dev/null

    # Complete timing
    curl -s -X POST "$BASE/api/session/$SID/timing" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SAMPLE_ID,\"event\":\"complete\"}" > /dev/null

    # Submit survey
    curl -s -X POST "$BASE/api/session/$SID/survey" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SAMPLE_ID,\"responses\":[{\"questionId\":\"authorship\",\"rating\":4},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}" > /dev/null

    # Advance
    curl -s -X POST "$BASE/api/session/$SID/advance" \
      -H 'Content-Type: application/json' -d '{}' > /dev/null
  done

  # Verify completed
  FINAL=$(curl -s "$BASE/api/session/$SID")
  FINAL_STATUS=$(echo "$FINAL" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
  if [ "$FINAL_STATUS" != "completed" ]; then
    echo "    ✗ Participant $DISPLAY session not completed (status=$FINAL_STATUS)"
  else
    echo "    ✓ Participant $DISPLAY completed"
  fi
done

echo ""
echo "  Seeded sessions: ${SESSION_IDS[*]}"
echo "  Assigned groups: ${ASSIGNED_GROUPS[*]}"
echo ""

# ─── Check 1: GET /api/researcher/sessions returns ≥3 sessions ──
echo "--- Check 1: GET /api/researcher/sessions returns 200 with ≥3 sessions ---"
SESSIONS_RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/researcher/sessions")
SESSIONS_STATUS=$(echo "$SESSIONS_RESP" | tail -1)
SESSIONS_BODY=$(echo "$SESSIONS_RESP" | sed '$d')

if [ "$SESSIONS_STATUS" = "200" ]; then
  SESSION_COUNT=$(echo "$SESSIONS_BODY" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).length))")
  if [ "$SESSION_COUNT" -ge 3 ] 2>/dev/null; then
    pass "GET /api/researcher/sessions returns $SESSION_COUNT sessions (≥3)"
  else
    fail "GET /api/researcher/sessions returned $SESSION_COUNT sessions (expected ≥3)"
  fi
else
  fail "GET /api/researcher/sessions returned status $SESSIONS_STATUS (expected 200)"
fi

# ─── Check 2: GET /api/researcher/sessions?group=X filters correctly ──
echo ""
echo "--- Check 2: Group filter returns only matching sessions ---"
# Pick a group that one of our seeded sessions belongs to
FILTER_GROUP="${ASSIGNED_GROUPS[0]}"
FILTERED_RESP=$(curl -s "$BASE/api/researcher/sessions?group=$FILTER_GROUP")
FILTER_OK=$(echo "$FILTERED_RESP" | node -e "
  process.stdin.on('data', d => {
    const arr = JSON.parse(d);
    const allMatch = arr.every(s => s.group === '$FILTER_GROUP');
    const hasAny = arr.length > 0;
    console.log(allMatch && hasAny ? 'yes' : 'no');
  });
")
if [ "$FILTER_OK" = "yes" ]; then
  pass "GET /sessions?group=$FILTER_GROUP returns only $FILTER_GROUP sessions"
else
  fail "Group filter for $FILTER_GROUP returned non-matching sessions"
fi

# ─── Check 3: Sessions list includes expected fields ──
echo ""
echo "--- Check 3: Session list entries include expected fields ---"
FIELDS_OK=$(echo "$SESSIONS_BODY" | node -e "
  process.stdin.on('data', d => {
    const arr = JSON.parse(d);
    const first = arr[0];
    const has = first &&
      'participantName' in first &&
      'participantEmail' in first &&
      'group' in first &&
      'status' in first;
    console.log(has ? 'yes' : 'no');
  });
")
if [ "$FIELDS_OK" = "yes" ]; then
  pass "Session list includes participantName, participantEmail, group, status"
else
  fail "Session list missing expected fields"
fi

# ─── Check 4: GET /api/researcher/sessions/[sessionId] returns 200 ──
echo ""
echo "--- Check 4: Session detail returns 200 for seeded session ---"
DETAIL_SID="${SESSION_IDS[0]}"
DETAIL_RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/researcher/sessions/$DETAIL_SID")
DETAIL_STATUS=$(echo "$DETAIL_RESP" | tail -1)
DETAIL_BODY=$(echo "$DETAIL_RESP" | sed '$d')

if [ "$DETAIL_STATUS" = "200" ]; then
  pass "GET /api/researcher/sessions/$DETAIL_SID returns 200"
else
  fail "GET /api/researcher/sessions/$DETAIL_SID returned $DETAIL_STATUS (expected 200)"
fi

# ─── Check 5: Session detail includes prompts, revisions, surveys, timings ──
echo ""
echo "--- Check 5: Session detail includes per-sample data arrays ---"
DETAIL_FIELDS_OK=$(echo "$DETAIL_BODY" | node -e "
  process.stdin.on('data', d => {
    const detail = JSON.parse(d);
    const hasSamples = Array.isArray(detail.samples) && detail.samples.length === 3;
    if (!hasSamples) { console.log('no'); return; }
    const sample = detail.samples[0];
    const has = Array.isArray(sample.prompts) &&
      Array.isArray(sample.revisions) &&
      typeof sample.survey === 'object' &&
      typeof sample.timing === 'object';
    console.log(has ? 'yes' : 'no');
  });
")
if [ "$DETAIL_FIELDS_OK" = "yes" ]; then
  pass "Session detail includes samples with prompts, revisions, survey, timing"
else
  fail "Session detail missing expected per-sample data"
fi

# ─── Check 6: GET /api/researcher/sessions/nonexistent-id returns 404 ──
echo ""
echo "--- Check 6: Nonexistent session returns 404 ---"
NOTFOUND_RESP=$(curl -s -w "\n%{http_code}" "$BASE/api/researcher/sessions/nonexistent-id-00000")
NOTFOUND_STATUS=$(echo "$NOTFOUND_RESP" | tail -1)
NOTFOUND_BODY=$(echo "$NOTFOUND_RESP" | sed '$d')

if [ "$NOTFOUND_STATUS" = "404" ]; then
  # Also verify it returns the expected error body
  HAS_MSG=$(echo "$NOTFOUND_BODY" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).error==='Session not found'?'yes':'no'))")
  if [ "$HAS_MSG" = "yes" ]; then
    pass "Nonexistent session returns 404 with correct error message"
  else
    pass "Nonexistent session returns 404 (error body differs slightly)"
  fi
else
  fail "Nonexistent session returned $NOTFOUND_STATUS (expected 404)"
fi

# ─── Check 7: CSV export Content-Type ──
echo ""
echo "--- Check 7: CSV export Content-Type is text/csv ---"
CSV_HEADERS=$(curl -s -D - -o /tmp/verify-s05-csv-$$.csv "$BASE/api/researcher/export")
if echo "$CSV_HEADERS" | grep -iq "content-type:.*text/csv"; then
  pass "CSV export Content-Type contains text/csv"
else
  fail "CSV export Content-Type missing text/csv"
fi

# ─── Check 8: CSV export Content-Disposition ──
echo ""
echo "--- Check 8: CSV export Content-Disposition contains attachment ---"
if echo "$CSV_HEADERS" | grep -iq "content-disposition:.*attachment"; then
  pass "CSV export Content-Disposition contains attachment"
else
  fail "CSV export Content-Disposition missing attachment"
fi

# ─── Check 9: CSV column headers ──
echo ""
echo "--- Check 9: CSV first line contains expected column headers ---"
CSV_FILE="/tmp/verify-s05-csv-$$.csv"
FIRST_LINE=$(head -1 "$CSV_FILE")
# Check key columns are present
HEADERS_OK=true
for col in participant_name participant_email group sample_id sample_title sample_index prompt_count revision_count time_seconds survey_authorship survey_satisfaction survey_cognitive_load survey_helpfulness survey_future_intent session_status; do
  if ! echo "$FIRST_LINE" | grep -q "$col"; then
    HEADERS_OK=false
    echo "  Missing column: $col"
  fi
done
if [ "$HEADERS_OK" = true ]; then
  pass "CSV first line contains all expected column headers"
else
  fail "CSV missing some expected column headers"
fi

# ─── Check 10: CSV has at least 9 data rows ──
echo ""
echo "--- Check 10: CSV has ≥9 data rows ---"
# Total lines minus header line = data rows
TOTAL_LINES=$(wc -l < "$CSV_FILE")
DATA_ROWS=$((TOTAL_LINES - 1))
if [ "$DATA_ROWS" -ge 9 ]; then
  pass "CSV has $DATA_ROWS data rows (≥9)"
else
  fail "CSV has $DATA_ROWS data rows (expected ≥9)"
fi

# ─── Check 11: CSV contains survey rating columns with numeric values ──
echo ""
echo "--- Check 11: CSV contains survey ratings with numeric values ---"
# Check that at least one data row has numeric survey values
SURVEY_OK=$(tail -n +2 "$CSV_FILE" | head -5 | node -e "
  const lines = [];
  process.stdin.on('data', d => lines.push(d.toString()));
  process.stdin.on('end', () => {
    const text = lines.join('');
    const rows = text.trim().split('\n');
    // Survey columns are at positions 10-14 (0-indexed) in the CSV
    // Parse the first data row, handling quoted fields
    const firstRow = rows[0];
    // Simple: check if the row contains numeric survey values (digits surrounded by quotes)
    const hasRatings = /\"[1-5]\"/.test(firstRow);
    console.log(hasRatings ? 'yes' : 'no');
  });
")
if [ "$SURVEY_OK" = "yes" ]; then
  pass "CSV contains survey ratings with numeric values"
else
  fail "CSV survey rating columns missing numeric values"
fi

# Clean up temp file
rm -f "$CSV_FILE"

# ─── Check 12: npm run build ──
echo ""
echo "--- Check 12: npm run build ---"
if npm run build > /dev/null 2>&1; then
  pass "npm run build exits 0"
else
  fail "npm run build failed"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
