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
echo "=== S04 Verification ==="
echo ""

# ─── 1. Tables exist ─────────────────────────────────────────
echo "--- 1. Check surveyResponses and sampleTimings tables exist ---"
TABLES=$(dbquery "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('survey_responses','sample_timings')")
if echo "$TABLES" | grep -q "survey_responses" && echo "$TABLES" | grep -q "sample_timings"; then
  pass "surveyResponses and sampleTimings tables exist"
else
  fail "Tables missing: $TABLES"
fi

# ─── Prereq: register participant and begin session ───────────
RESULT=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"S04 Full Test\",\"email\":\"verify-s04-full-${UNIQUE_SUFFIX}@test.com\"}")
SESSION_ID=$(echo "$RESULT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "undefined" ]; then
  fail "Could not register test session"
  echo ""
  echo "=== Results: $PASS passed, $FAIL failed ==="
  exit 1
fi
echo "  Test session: $SESSION_ID"

# Begin session
curl -s -X POST "$BASE/api/session/$SESSION_ID" -H 'Content-Type: application/json' \
  -d '{"action":"begin"}' > /dev/null

# Get first sample info
SESSION_DATA=$(curl -s "$BASE/api/session/$SESSION_ID")
SAMPLE_ID=$(echo "$SESSION_DATA" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).currentSample?.id))")
echo "  First sample ID: $SAMPLE_ID"

# ─── 2. POST /survey saves responses ─────────────────────────
echo ""
echo "--- 2. POST /survey saves responses ---"
SURVEY_BODY="{\"sampleId\":$SAMPLE_ID,\"responses\":[{\"questionId\":\"authorship\",\"rating\":4},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}"
SURVEY_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/survey" \
  -H 'Content-Type: application/json' -d "$SURVEY_BODY")
SURVEY_STATUS=$(echo "$SURVEY_RESULT" | tail -1)
if [ "$SURVEY_STATUS" = "200" ]; then
  SURVEY_ROWS=$(dbquery "SELECT COUNT(*) as cnt FROM survey_responses WHERE session_id='$SESSION_ID' AND sample_id=$SAMPLE_ID")
  CNT=$(echo "$SURVEY_ROWS" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].cnt))")
  if [ "$CNT" = "5" ]; then
    pass "POST /survey saved 5 responses"
  else
    fail "POST /survey expected 5 rows, got $CNT"
  fi
else
  fail "POST /survey returned status $SURVEY_STATUS"
fi

# ─── 3. POST /timing start creates timing record ─────────────
echo ""
echo "--- 3. POST /timing start creates timing record ---"
TIMING_START=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/timing" \
  -H 'Content-Type: application/json' -d "{\"sampleId\":$SAMPLE_ID,\"sampleIndex\":0,\"event\":\"start\"}")
TIMING_STATUS=$(echo "$TIMING_START" | tail -1)
if [ "$TIMING_STATUS" = "200" ]; then
  TIMING_ROWS=$(dbquery "SELECT COUNT(*) as cnt FROM sample_timings WHERE session_id='$SESSION_ID' AND sample_id=$SAMPLE_ID")
  TCNT=$(echo "$TIMING_ROWS" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].cnt))")
  if [ "$TCNT" = "1" ]; then
    pass "POST /timing start created timing record"
  else
    fail "Expected 1 timing row, got $TCNT"
  fi
else
  fail "POST /timing start returned status $TIMING_STATUS"
fi

# ─── 4. POST /timing complete sets completed_at ──────────────
echo ""
echo "--- 4. POST /timing complete sets completed_at ---"
TIMING_COMPLETE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/timing" \
  -H 'Content-Type: application/json' -d "{\"sampleId\":$SAMPLE_ID,\"event\":\"complete\"}")
TC_STATUS=$(echo "$TIMING_COMPLETE" | tail -1)
if [ "$TC_STATUS" = "200" ]; then
  COMPLETED=$(dbquery "SELECT completed_at FROM sample_timings WHERE session_id='$SESSION_ID' AND sample_id=$SAMPLE_ID")
  HAS_COMPLETED=$(echo "$COMPLETED" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r[0]?.completed_at?'yes':'no')})")
  if [ "$HAS_COMPLETED" = "yes" ]; then
    pass "POST /timing complete set completed_at"
  else
    fail "completed_at is still null after complete event"
  fi
else
  fail "POST /timing complete returned status $TC_STATUS"
fi

# ─── 5. Survey validation rejects invalid ratings ────────────
echo ""
echo "--- 5. Survey validation rejects invalid ratings ---"
BAD_SURVEY="{\"sampleId\":$SAMPLE_ID,\"responses\":[{\"questionId\":\"authorship\",\"rating\":0},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}"
BAD_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/survey" \
  -H 'Content-Type: application/json' -d "$BAD_SURVEY")
BAD_STATUS=$(echo "$BAD_RESULT" | tail -1)
if [ "$BAD_STATUS" = "400" ]; then
  pass "Survey rejects invalid rating (0)"
else
  fail "Expected 400 for invalid rating, got $BAD_STATUS"
fi

BAD_QID="{\"sampleId\":$SAMPLE_ID,\"responses\":[{\"questionId\":\"invalid_q\",\"rating\":3},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}"
BAD_QID_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/survey" \
  -H 'Content-Type: application/json' -d "$BAD_QID")
BAD_QID_STATUS=$(echo "$BAD_QID_RESULT" | tail -1)
if [ "$BAD_QID_STATUS" = "400" ]; then
  pass "Survey rejects invalid questionId"
else
  fail "Expected 400 for invalid questionId, got $BAD_QID_STATUS"
fi

# ─── 6. GET /session includes sampleSubmitted and surveyCompleted ─────
echo ""
echo "--- 6. GET /session includes sampleSubmitted and surveyCompleted ---"
SESSION_CHECK=$(curl -s "$BASE/api/session/$SESSION_ID")
HAS_FLAGS=$(echo "$SESSION_CHECK" | node -e "
  process.stdin.on('data', d => {
    const j = JSON.parse(d);
    console.log(
      typeof j.sampleSubmitted === 'boolean' && typeof j.surveyCompleted === 'boolean'
        ? 'yes' : 'no'
    );
  });
")
if [ "$HAS_FLAGS" = "yes" ]; then
  pass "GET /session includes sampleSubmitted and surveyCompleted"
else
  fail "GET /session missing sampleSubmitted/surveyCompleted"
fi

SUBMITTED=$(echo "$SESSION_CHECK" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sampleSubmitted))")
SURVEYED=$(echo "$SESSION_CHECK" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).surveyCompleted))")
if [ "$SUBMITTED" = "true" ] && [ "$SURVEYED" = "true" ]; then
  pass "sampleSubmitted=true and surveyCompleted=true after submission"
else
  fail "Expected both true, got sampleSubmitted=$SUBMITTED surveyCompleted=$SURVEYED"
fi

# ─── 7. Full 3-sample flow ───────────────────────────────────
echo ""
echo "--- 7. Full 3-sample flow: register → begin → (timing → revision → survey → advance) ×3 → completed ---"

# Register a fresh participant for the clean flow test
FLOW_REG=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"S04 Flow Test\",\"email\":\"verify-s04-flow-${UNIQUE_SUFFIX}@test.com\"}")
FLOW_SID=$(echo "$FLOW_REG" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
if [ -z "$FLOW_SID" ] || [ "$FLOW_SID" = "undefined" ]; then
  fail "Could not register flow test session"
else
  echo "  Flow test session: $FLOW_SID"

  # Begin
  curl -s -X POST "$BASE/api/session/$FLOW_SID" -H 'Content-Type: application/json' \
    -d '{"action":"begin"}' > /dev/null

  FLOW_OK=true
  for i in 0 1 2; do
    DISPLAY_IDX=$((i + 1))

    # Get current sample
    SDATA=$(curl -s "$BASE/api/session/$FLOW_SID")
    SID=$(echo "$SDATA" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).currentSample?.id))")
    STATUS=$(echo "$SDATA" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")

    if [ "$STATUS" = "completed" ]; then
      echo "  ✗ Session completed early at sample $DISPLAY_IDX"
      FLOW_OK=false
      break
    fi

    if [ -z "$SID" ] || [ "$SID" = "undefined" ]; then
      echo "  ✗ No current sample at index $i"
      FLOW_OK=false
      break
    fi

    echo "  Sample $DISPLAY_IDX (id=$SID)..."

    # Start timing
    curl -s -X POST "$BASE/api/session/$FLOW_SID/timing" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SID,\"sampleIndex\":$i,\"event\":\"start\"}" > /dev/null

    # Save a revision
    curl -s -X POST "$BASE/api/session/$FLOW_SID/revision" \
      -H 'Content-Type: application/json' \
      -d "{\"content\":\"Edited text for sample $DISPLAY_IDX\"}" > /dev/null

    # Complete timing
    curl -s -X POST "$BASE/api/session/$FLOW_SID/timing" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SID,\"event\":\"complete\"}" > /dev/null

    # Submit survey
    SURVEY_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$FLOW_SID/survey" \
      -H 'Content-Type: application/json' \
      -d "{\"sampleId\":$SID,\"responses\":[{\"questionId\":\"authorship\",\"rating\":4},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}")
    S_STATUS=$(echo "$SURVEY_RES" | tail -1)
    if [ "$S_STATUS" != "200" ]; then
      echo "  ✗ Survey submit failed for sample $DISPLAY_IDX (status $S_STATUS)"
      FLOW_OK=false
      break
    fi

    # Advance
    ADV_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/session/$FLOW_SID/advance" \
      -H 'Content-Type: application/json' -d '{}')
    A_STATUS=$(echo "$ADV_RES" | tail -1)
    if [ "$A_STATUS" != "200" ]; then
      echo "  ✗ Advance failed for sample $DISPLAY_IDX (status $A_STATUS)"
      FLOW_OK=false
      break
    fi
  done

  if [ "$FLOW_OK" = true ]; then
    # Verify completed status
    FINAL=$(curl -s "$BASE/api/session/$FLOW_SID")
    FINAL_STATUS=$(echo "$FINAL" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
    if [ "$FINAL_STATUS" = "completed" ]; then
      pass "Full 3-sample flow completed successfully"

      # Verify DB data
      TOTAL_SURVEYS=$(dbquery "SELECT COUNT(*) as cnt FROM survey_responses WHERE session_id='$FLOW_SID'")
      TOTAL_S=$(echo "$TOTAL_SURVEYS" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].cnt))")
      if [ "$TOTAL_S" = "15" ]; then
        pass "All 15 survey responses saved (5 per sample × 3)"
      else
        fail "Expected 15 survey rows, got $TOTAL_S"
      fi

      TOTAL_TIMINGS=$(dbquery "SELECT COUNT(*) as cnt FROM sample_timings WHERE session_id='$FLOW_SID'")
      TOTAL_T=$(echo "$TOTAL_TIMINGS" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].cnt))")
      if [ "$TOTAL_T" = "3" ]; then
        pass "All 3 timing records created"
      else
        fail "Expected 3 timing rows, got $TOTAL_T"
      fi

      # Check all timings have completed_at
      COMPLETED_TIMINGS=$(dbquery "SELECT COUNT(*) as cnt FROM sample_timings WHERE session_id='$FLOW_SID' AND completed_at IS NOT NULL")
      TOTAL_CT=$(echo "$COMPLETED_TIMINGS" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].cnt))")
      if [ "$TOTAL_CT" = "3" ]; then
        pass "All 3 timing records have completed_at"
      else
        fail "Expected 3 completed timings, got $TOTAL_CT"
      fi
    else
      fail "Expected 'completed' status, got '$FINAL_STATUS'"
    fi
  else
    fail "Full 3-sample flow encountered errors"
  fi
fi

# ─── 8. npm run build ────────────────────────────────────────
echo ""
echo "--- 8. npm run build ---"
if npm run build > /dev/null 2>&1; then
  pass "npm run build exits 0"
else
  fail "npm run build failed"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
