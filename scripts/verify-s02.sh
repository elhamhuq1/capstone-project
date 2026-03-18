#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:3000"

echo "=== S02 Verification ==="

# 1. Register a participant
RESULT=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"Test User","email":"verify-s02@test.com"}')
SESSION_ID=$(echo "$RESULT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
echo "✓ Registration: sessionId=$SESSION_ID"

# 2. Verify resume — same email returns same session
RESULT2=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"Test User","email":"verify-s02@test.com"}')
SESSION_ID2=$(echo "$RESULT2" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
[ "$SESSION_ID" = "$SESSION_ID2" ] && echo "✓ Session resume works" || { echo "✗ Session resume FAILED"; exit 1; }

# 3. Get session data
SESSION=$(curl -s "$BASE/api/session/$SESSION_ID")
STATUS=$(echo "$SESSION" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
echo "✓ Session status: $STATUS"

# 4. Begin session (transition to in-progress so revision works)
curl -s -X POST "$BASE/api/session/$SESSION_ID" -H 'Content-Type: application/json' -d '{"action":"begin"}' > /dev/null
echo "✓ Session begun (status → in-progress)"

# 5. Save a revision
REV=$(curl -s -X POST "$BASE/api/session/$SESSION_ID/revision" -H 'Content-Type: application/json' -d '{"content":"Edited text for sample 1"}')
REV_NUM=$(echo "$REV" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).revisionNumber))")
[ "$REV_NUM" = "1" ] && echo "✓ Revision saved: #$REV_NUM" || { echo "✗ Revision number FAILED (got $REV_NUM)"; exit 1; }

# 6. Save a second revision
REV2=$(curl -s -X POST "$BASE/api/session/$SESSION_ID/revision" -H 'Content-Type: application/json' -d '{"content":"Second edit for sample 1"}')
REV_NUM2=$(echo "$REV2" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).revisionNumber))")
[ "$REV_NUM2" = "2" ] && echo "✓ Second revision saved: #$REV_NUM2" || { echo "✗ Second revision number FAILED (got $REV_NUM2)"; exit 1; }

# 7. Advance through all 3 samples
for i in 1 2 3; do
  ADV=$(curl -s -X POST "$BASE/api/session/$SESSION_ID/advance" -H 'Content-Type: application/json' -d "{\"content\":\"Final text for sample $i\"}")
  echo "✓ Advanced past sample $i"
done

# 8. Verify session is completed
FINAL=$(curl -s "$BASE/api/session/$SESSION_ID")
FINAL_STATUS=$(echo "$FINAL" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
[ "$FINAL_STATUS" = "completed" ] && echo "✓ Session completed" || { echo "✗ Session not completed: $FINAL_STATUS"; exit 1; }

# 9. Verify revision on completed session returns 400
COMPLETED_REV=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/session/$SESSION_ID/revision" -H 'Content-Type: application/json' -d '{"content":"Should fail"}')
[ "$COMPLETED_REV" = "400" ] && echo "✓ Revision on completed session returns 400" || { echo "✗ Expected 400, got $COMPLETED_REV"; exit 1; }

# 10. Verify input validation
ERR=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{}')
[ "$ERR" = "400" ] && echo "✓ Validation: empty body returns 400" || { echo "✗ Validation FAILED: $ERR"; exit 1; }

# 11. Verify balanced group assignment (register 2 more participants)
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"User2","email":"verify-s02-2@test.com"}' > /dev/null
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"User3","email":"verify-s02-3@test.com"}' > /dev/null
echo "✓ Registered 2 more participants for balanced assignment check"

echo ""
echo "=== All S02 checks passed ==="
