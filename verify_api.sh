#!/bin/bash
# ================================================================
# Phase 1 API Integration Verification Script (WITH real JWT auth)
# Prerequisites:
#   1. wrangler dev running: cd worker && npx wrangler dev
#   2. Get wallet JWT from frontend: connect wallet → localStorage vc_session_jwt
#   3. export WALLET_JWT="your_jwt_here"
#   4. export TG_JWT="your_tg_jwt_here" (optional, for TG rejection test)
#
# Run: WALLET_JWT=xxx bash /Users/yudeyou/Desktop/VC/verify_api.sh
# ================================================================

set -e

API_HOST="${API_HOST:-http://localhost:8787}"
API_BASE="${API_HOST}/api/v1"
USER_WALLET="${USER_WALLET:-}"
PASS=0
FAIL=0

log_pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
log_fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
log_info() { echo "  🔵 $1"; }
log_skip() { echo "  ⏭️  $1"; }

echo ""
echo "================================================================"
echo " Phase 1 API Integration Verification"
echo " Target: $API_BASE"
echo "================================================================"
echo ""

# --- Check server reachable ---
if ! curl -sf "${API_BASE}/launches" > /dev/null 2>&1; then
  echo "❌ Server unreachable at ${API_HOST}. Start with:"
  echo "   cd /Users/yudeyou/Desktop/VC/worker && npx wrangler dev"
  exit 1
fi
log_info "Server reachable ✅"

# --- Check WALLET_JWT ---
if [ -z "$WALLET_JWT" ]; then
  echo ""
  echo "⚠️  WALLET_JWT is not set."
  echo "    Skipping authenticated tests (create/spark/onramp)."
  echo "    Unauthenticated tests (search, negative auth) will still run."
  echo ""
  echo "    To get it: open frontend → connect wallet → paste in console:"
  echo "    copy(localStorage.vc_session_jwt)"
  echo "    Then: export WALLET_JWT=\"<paste>\""
  echo ""
  AUTH_HEADER=""
  HAS_WALLET=false
else
  AUTH_HEADER="Authorization: Bearer ${WALLET_JWT}"
  HAS_WALLET=true
  log_info "WALLET_JWT provided ✅"
fi

# --- Reset milestones database state for repeatable tests ---
if [ "$HAS_WALLET" = true ]; then
  npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "
    UPDATE launch_milestones SET status = 'PENDING', deliverable_url = NULL, challenge_expires_at = NULL WHERE id IN ('m-spark-1-2', 'm-spark-1-3');
    UPDATE launch_milestones SET status = 'CHALLENGE_PERIOD', deliverable_url = 'https://github.com/osa/farcaster-publisher', challenge_expires_at = '2026-05-31T15:00:00Z' WHERE id = 'm-spark-1-1';
    DELETE FROM user_rate_limits WHERE user_id = '${USER_WALLET}';
    DELETE FROM onramp_verifications WHERE user_id = '${USER_WALLET}';
  " > /dev/null 2>&1 || true
fi

# --- Check TG_JWT (optional) ---
HAS_TG=false
if [ -n "$TG_JWT" ]; then
  HAS_TG=true
  log_info "TG_JWT provided (for TG rejection test) ✅"
fi

# --- Database Precision Sanity Check ---
echo ""
echo "--- 0. Database Precision Sanity Check ---"
PRECISION_CHECK=$(npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "SELECT target_total_nano FROM launches WHERE id = 'spark-1';" 2>&1)
if echo "$PRECISION_CHECK" | grep -q "5000000000000"; then
  log_pass "launches.target_total_nano is correct (5000000000000) ✅"
else
  log_fail "launches.target_total_nano is incorrect or overflowed! Query result: $PRECISION_CHECK ❌"
fi

RAISED_PRECISION_CHECK=$(npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "SELECT raised_total_nano FROM launches WHERE id = 'spark-1';" 2>&1)
if echo "$RAISED_PRECISION_CHECK" | grep -q "3250000000000"; then
  log_pass "launches.raised_total_nano is correct (3250000000000) ✅"
else
  log_fail "launches.raised_total_nano is incorrect or overflowed! Query result: $RAISED_PRECISION_CHECK ❌"
fi

# ================================================================
# Test 1: Wallet JWT auth check (positive: valid JWT should pass)
# ================================================================
echo ""
echo "--- 1. Wallet JWT auth ---"

if [ "$HAS_WALLET" = true ]; then
  # Test the auth by calling a readonly endpoint that requires auth
  AUTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    "${API_BASE}/onramp/verifications" \
    -H "$AUTH_HEADER" 2>&1)

  if [ "$AUTH_CHECK" = "200" ]; then
    log_pass "Wallet JWT accepted by authMiddleware (200)"
  elif [ "$AUTH_CHECK" = "401" ]; then
    log_fail "Wallet JWT rejected by authMiddleware (401) — JWT may be expired or invalid"
  else
    log_fail "Unexpected auth status: $AUTH_CHECK"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 2: Create NO_TOKEN launch (authenticated)
# ================================================================
echo ""
echo "--- 2. Create NO_TOKEN launch ---"

NO_TOKEN_ID=""
NO_TOKEN_CODE=""

if [ "$HAS_WALLET" = true ]; then
  NO_TOKEN_RESP=$(curl -sf -X POST "${API_BASE}/launches" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"name":"Test NoToken Verify","description":"Verification NO_TOKEN test","goalAmount":200,"launchType":"NO_TOKEN","category":"基础设施","deliverableType":"preorder","deliverableDesc":"Verification deliverable","deliveryDate":"2026-07-01","disputeRules":"未按时交付全额退款"}' 2>&1)

  if echo "$NO_TOKEN_RESP" | grep -q '"success":true'; then
    log_pass "NO_TOKEN created successfully"
    NO_TOKEN_ID=$(echo "$NO_TOKEN_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    NO_TOKEN_CODE=$(echo "$NO_TOKEN_RESP" | grep -o '"projectCode":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_info "  id=$NO_TOKEN_ID  code=$NO_TOKEN_CODE"

    # Verify it appears in detail endpoint
    DETAIL=$(curl -sf "${API_BASE}/launches/${NO_TOKEN_ID}" 2>&1)
    if echo "$DETAIL" | grep -q '"launchType":"NO_TOKEN"'; then
      log_pass "Detail endpoint returns launchType=NO_TOKEN"
    else
      log_fail "Detail endpoint missing launchType"
    fi
  else
    log_fail "NO_TOKEN creation failed: $(echo $NO_TOKEN_RESP | head -c 300)"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 3: Create PROJECT_TOKEN launch (authenticated)
# ================================================================
echo ""
echo "--- 3. Create PROJECT_TOKEN launch ---"

PROJ_ID=""
PROJ_CODE=""

if [ "$HAS_WALLET" = true ]; then
  PROJ_RESP=$(curl -sf -X POST "${API_BASE}/launches" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"name":"Test Project Token","tokenSymbol":"TPT","description":"Verification PROJECT_TOKEN test","goalAmount":500,"launchType":"PROJECT_TOKEN","backerTokenShare":35,"category":"交易工具"}' 2>&1)

  if echo "$PROJ_RESP" | grep -q '"success":true'; then
    log_pass "PROJECT_TOKEN created successfully"
    PROJ_ID=$(echo "$PROJ_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJ_CODE=$(echo "$PROJ_RESP" | grep -o '"projectCode":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_info "  id=$PROJ_ID  code=$PROJ_CODE"
  else
    log_fail "PROJECT_TOKEN creation failed: $(echo $PROJ_RESP | head -c 300)"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 4: Search by project_code (unauthenticated, should work)
# ================================================================
echo ""
echo "--- 4. Search by project_code ---"

# Search existing code from db seed (spark-1 = VC-L-000001)
SEARCH_RESP=$(curl -sf "${API_BASE}/search?q=VC-L-000001" 2>&1)
if echo "$SEARCH_RESP" | grep -q '"launches"'; then
  log_pass "Search VC-L-000001 returned launches"
else
  log_fail "Search returned unexpected: $(echo $SEARCH_RESP | head -c 200)"
fi

# Search non-existent
SEARCH_EMPTY=$(curl -sf "${API_BASE}/search?q=VC-F-NONEXISTENT999" 2>&1)
if echo "$SEARCH_EMPTY" | grep -q '"launches":\[\]'; then
  log_pass "Search non-existent code returns empty"
else
  log_fail "Search non-existent should return empty arrays"
fi

# Search by name
SEARCH_NAME=$(curl -sf "${API_BASE}/search?q=OmniSocial" 2>&1)
if echo "$SEARCH_NAME" | grep -q '"name":"OmniSocial'; then
  log_pass "Search by name works"
else
  log_fail "Search by name failed"
fi

# ================================================================
# Test 5: Spark 5 TON + verify raised_total (authenticated)
# ================================================================
echo ""
echo "--- 5. Spark 5 TON + verify raised_total ---"

if [ "$HAS_WALLET" = true ] && [ -n "$PROJ_ID" ]; then
  # Spark 5 TON
  SPARK1_RESP=$(curl -sf -X POST "${API_BASE}/launches/${PROJ_ID}/spark" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"amount":5}' 2>&1)

  if echo "$SPARK1_RESP" | grep -q '"success":true'; then
    log_pass "Spark 5 TON returned success"

    # Spark another 10 TON
    SPARK2_RESP=$(curl -sf -X POST "${API_BASE}/launches/${PROJ_ID}/spark" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HEADER" \
      -d '{"amount":10}' 2>&1)

    if echo "$SPARK2_RESP" | grep -q '"success":true'; then
      log_pass "Spark 10 TON returned success"
    fi

    # Verify detail
    DETAIL=$(curl -sf "${API_BASE}/launches/${PROJ_ID}" 2>&1)
    RAISED=$(echo "$DETAIL" | grep -o '"raisedAmount":[0-9.]*' | head -1 | cut -d: -f2)
    PROGRESS=$(echo "$DETAIL" | grep -o '"progress":[0-9.]*' | head -1 | cut -d: -f2)

    if [ "$RAISED" = "15" ]; then
      log_pass "raisedAmount = 15 TON ✅ (5+10)"
    else
      log_fail "raisedAmount = $RAISED (expected 15)"
    fi
    log_info "  progress: ${PROGRESS:-0}% (15/500 = 3%)"
  else
    log_fail "Spark 5 TON failed: $(echo $SPARK1_RESP | head -c 300)"
  fi
else
  log_skip "Need WALLET_JWT + PROJECT_TOKEN project — skipping"
fi

# ================================================================
# Test 6: OnRamp UID → PENDING_AUTO (authenticated)
# ================================================================
echo ""
echo "--- 6. OnRamp PENDING_AUTO ---"

if [ "$HAS_WALLET" = true ]; then
  ONRAMP_RESP=$(curl -sf -X POST "${API_BASE}/onramp/verify-uid" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"exchange":"okx","uid":"999888777"}' 2>&1)

  if echo "$ONRAMP_RESP" | grep -q '"PENDING_AUTO"'; then
    log_pass "OnRamp UID → PENDING_AUTO"
  else
    log_fail "OnRamp not PENDING_AUTO: $(echo $ONRAMP_RESP | head -c 200)"
  fi

  # List verifications
  VERIF=$(curl -sf "${API_BASE}/onramp/verifications" -H "$AUTH_HEADER" 2>&1)
  if echo "$VERIF" | grep -q -E '"(PENDING_AUTO|VERIFIED)"'; then
    log_pass "GET /onramp/verifications shows PENDING_AUTO or VERIFIED record"
  else
    log_fail "Verifications list doesn't show expected record: $VERIF"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 7: Negative auth — no token, invalid token
# ================================================================
echo ""
echo "--- 7. Negative auth (no-token, invalid, TG-only rejection) ---"

# 7a. No auth → should 401
NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${API_BASE}/launches" \
  -H "Content-Type: application/json" \
  -d '{"name":"bad","tokenSymbol":"BAD","description":"b","goalAmount":1}' 2>&1)
if [ "$NOAUTH" = "401" ]; then
  log_pass "No auth → 401 ✅"
else
  log_fail "No auth returned $NOAUTH (expected 401)"
fi

# 7b. Invalid token → should 401
INVALID=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${API_BASE}/launches/spark-1/spark" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer definitely_invalid_token_12345" \
  -d '{"amount":1}' 2>&1)
if [ "$INVALID" = "401" ]; then
  log_pass "Invalid JWT → 401 ✅"
else
  log_fail "Invalid JWT returned $INVALID (expected 401)"
fi

# 7c. TG JWT (no walletAddress) on write endpoint → should 401
if [ "$HAS_TG" = true ]; then
  TG_WRITE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API_BASE}/launches/spark-1/spark" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TG_JWT}" \
    -d '{"amount":1}' 2>&1)
  if [ "$TG_WRITE" = "401" ]; then
    log_pass "TG JWT on write endpoint → 401 ✅"
  else
    log_fail "TG JWT returned $TG_WRITE (expected 401)"
  fi
else
  log_info "No TG_JWT set — skipping TG rejection test."
  log_info "To test: get TG JWT from frontend (localStorage.vc_tg_jwt), then export TG_JWT=..."
fi

# 7d. TG JWT on readonly endpoint (search) → should pass (200)
if [ "$HAS_TG" = true ]; then
  TG_READ=$(curl -s -o /dev/null -w "%{http_code}" \
    "${API_BASE}/search?q=test" \
    -H "Authorization: Bearer ${TG_JWT}" 2>&1 || echo "000")
  if [ "$TG_READ" = "200" ]; then
    log_pass "TG JWT on readonly endpoint → 200 ✅"
  else
    log_info "TG JWT on search: $TG_READ (search is unauthenticated anyway)"
  fi
fi

# 7e. Signer direct public access check (no auth header) → should 401
SIGNER_UNAUTH=$(curl -s -w "%{http_code}" -X POST "http://localhost:8788/sign-and-broadcast" \
  -H "Content-Type: application/json" \
  -d '{"destination":"UQBvMw7pDIw8XuAXUagcrxjJyGG-6sVKU08D8JhO7JIAyPVI","amountNano":1000000000}' -o /dev/null 2>&1)
if [ "$SIGNER_UNAUTH" = "401" ]; then
  log_pass "Signer public direct access without secret key -> 401 ✅"
else
  log_fail "Signer public direct access returned $SIGNER_UNAUTH (expected 401)"
fi

# ================================================================
# Test 8: Telegram Stars payment callback
# ================================================================
echo ""
echo "--- 8. Telegram Stars payment callback ---"

if [ "$HAS_WALLET" = true ] && [ -n "$PROJ_ID" ]; then
  # 8a. Pre-create Stars invoice order (100 Stars = 15 TON)
  INVOICE_RESP=$(curl -sf -X POST "${API_BASE}/payment/stars-invoice" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{\"launchId\":\"${PROJ_ID}\",\"starsAmount\":100}" 2>&1)

  if echo "$INVOICE_RESP" | grep -q '"success":true'; then
    CHECKOUT_ID=$(echo "$INVOICE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_pass "Stars invoice created successfully, id=$CHECKOUT_ID"

    # 8b. Verify Telegram callback source validation (unauthorized callback)
    BAD_CALLBACK=$(curl -s -w "%{http_code}" -X POST "${API_BASE}/payment/stars-callback" \
      -H "Content-Type: application/json" \
      -d "{\"id\":\"${CHECKOUT_ID}\"}" -o /dev/null 2>&1)

    if [ "$BAD_CALLBACK" = "401" ]; then
      log_pass "Callback without Telegram bot secret rejected (401)"
    else
      log_fail "Callback without Telegram bot secret returned $BAD_CALLBACK (expected 401)"
    fi

    # 8c. Call with valid bot secret header to process successfully
    STARS_RESP=$(curl -sf -X POST "${API_BASE}/payment/stars-callback" \
      -H "Content-Type: application/json" \
      -H "X-Telegram-Bot-Api-Secret-Token: telegram-webhook-secret-12345" \
      -d "{\"id\":\"${CHECKOUT_ID}\"}" 2>&1)

    if echo "$STARS_RESP" | grep -q '"success":true'; then
      log_pass "Stars payment callback processed successfully"
      TX_HASH=$(echo "$STARS_RESP" | grep -o '"txHash":"[^"]*"' | head -1 | cut -d'"' -f4)
      log_info "  txHash=$TX_HASH"

      # Verify idempotency by submitting again
      STARS_RETRY=$(curl -sf -X POST "${API_BASE}/payment/stars-callback" \
        -H "Content-Type: application/json" \
        -H "X-Telegram-Bot-Api-Secret-Token: telegram-webhook-secret-12345" \
        -d "{\"id\":\"${CHECKOUT_ID}\"}" 2>&1)

      if echo "$STARS_RETRY" | grep -q 'Payment already processed successfully'; then
        log_pass "Stars payment callback idempotency check passed"
      else
        log_fail "Stars payment retry failed: $(echo $STARS_RETRY | head -c 200)"
      fi
    else
      log_fail "Stars payment callback failed: $(echo $STARS_RESP | head -c 300)"
    fi
  else
    log_fail "Stars invoice creation failed: $INVOICE_RESP"
  fi
else
  log_skip "No WALLET_JWT or project — skipping"
fi

# ================================================================
# Test 9: AI Webhook Milestone Auto-Unlock (authenticated)
# ================================================================
echo ""
echo "--- 9. AI Webhook Milestone Auto-Unlock ---"

if [ "$HAS_WALLET" = true ]; then
  # 9a. GET milestones list
  MILESTONES_GET=$(curl -sf "${API_BASE}/launches/spark-1/milestones" 2>&1)
  if echo "$MILESTONES_GET" | grep -q '"milestoneIndex":1'; then
    log_pass "GET /launches/spark-1/milestones returned milestones list"
  else
    log_fail "GET /launches/spark-1/milestones failed: $(echo $MILESTONES_GET | head -c 200)"
  fi

  # 9b. Submit deliverable for PENDING milestone (index 2)
  SUBMIT_RESP=$(curl -sf -X POST "${API_BASE}/launches/spark-1/milestones/2/submit" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"deliverableUrl":"https://github.com/osa/micro-ai-model"}' 2>&1)

  if echo "$SUBMIT_RESP" | grep -q '"status":"AI_REVIEW_PASSED"'; then
    log_pass "Submit deliverable auto-passed AI review (AI_REVIEW_PASSED)"
  else
    log_fail "Submit deliverable failed: $(echo $SUBMIT_RESP | head -c 300)"
  fi

  # 9c. Dispute / Challenge milestone (index 2) during challenge period
  CHALLENGE_RESP=$(curl -sf -X POST "${API_BASE}/launches/spark-1/milestones/2/challenge" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"reason":"Duplicate of a public tutorial"}' 2>&1)

  if echo "$CHALLENGE_RESP" | grep -q '"status":"DISPUTED"'; then
    log_pass "Dispute challenge updated status to DISPUTED (DAO_ARBITRATION initiated)"
  else
    log_fail "Dispute challenge failed: $(echo $CHALLENGE_RESP | head -c 300)"
  fi

  # 9d. Unlock milestone (index 1) which is in CHALLENGE_PERIOD
  UNLOCK_RESP=$(curl -sf -X POST "${API_BASE}/launches/spark-1/milestones/1/unlock" \
    -H "$AUTH_HEADER" 2>&1)

  if echo "$UNLOCK_RESP" | grep -q '"status":"UNLOCKED"'; then
    log_pass "Unlock milestone succeeded and released funds"
  else
    log_fail "Unlock milestone failed: $(echo $UNLOCK_RESP | head -c 300)"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 10: Stars Payment Wind Control Limit & Multisig Confirm
# ================================================================
echo ""
echo "--- 10. Stars Payment Wind Control Limit & Multisig Confirm ---"

if [ "$HAS_WALLET" = true ] && [ -n "$PROJ_ID" ]; then
  # 10a. Pre-create Stars invoice order (1000 Stars = 150 TON, exceeding 100 TON limit)
  LIMIT_INVOICE_RESP=$(curl -sf -X POST "${API_BASE}/payment/stars-invoice" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{\"launchId\":\"${PROJ_ID}\",\"starsAmount\":1000}" 2>&1)

  if echo "$LIMIT_INVOICE_RESP" | grep -q '"success":true'; then
    LIMIT_CHECKOUT_ID=$(echo "$LIMIT_INVOICE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_pass "Stars limit invoice created successfully, id=$LIMIT_CHECKOUT_ID"

    # 10b. Callback with bot secret token, should be blocked by limit and set to PENDING_MULTISIG
    LIMIT_STARS_RESP=$(curl -sf -X POST "${API_BASE}/payment/stars-callback" \
      -H "Content-Type: application/json" \
      -H "X-Telegram-Bot-Api-Secret-Token: telegram-webhook-secret-12345" \
      -d "{\"id\":\"${LIMIT_CHECKOUT_ID}\"}" 2>&1)

    if echo "$LIMIT_STARS_RESP" | grep -q '"status":"PENDING_MULTISIG"'; then
      log_pass "Stars payment exceeding limit correctly status=PENDING_MULTISIG"

      # 10c. Verify calling multisig-confirm without admin JWT is rejected (401)
      CONFIRM_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE}/admin/payment/multisig-confirm" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"${LIMIT_CHECKOUT_ID}\",\"txHash\":\"mock_tx_hash_for_multisig_123\"}" 2>&1)

      if [ "$CONFIRM_NOAUTH" = "401" ]; then
        log_pass "Call multisig-confirm without auth rejected (401)"
      else
        log_fail "Call multisig-confirm without auth returned $CONFIRM_NOAUTH (expected 401)"
      fi

      # 10d. Call multisig-confirm with Admin WALLET_JWT to confirm payment
      CONFIRM_RESP=$(curl -sf -X POST "${API_BASE}/admin/payment/multisig-confirm" \
        -H "Content-Type: application/json" \
        -H "$AUTH_HEADER" \
        -d "{\"id\":\"${LIMIT_CHECKOUT_ID}\",\"txHash\":\"mock_tx_hash_for_multisig_123\"}" 2>&1)

      if echo "$CONFIRM_RESP" | grep -q '"success":true'; then
        log_pass "Admin confirmed multisig payment successfully"

        # 10e. Try to call multisig-confirm again (idempotence check)
        CONFIRM_RETRY=$(curl -sf -X POST "${API_BASE}/admin/payment/multisig-confirm" \
          -H "Content-Type: application/json" \
          -H "$AUTH_HEADER" \
          -d "{\"id\":\"${LIMIT_CHECKOUT_ID}\",\"txHash\":\"mock_tx_hash_for_multisig_123\"}" 2>&1)

        if echo "$CONFIRM_RETRY" | grep -q 'Payment already processed successfully'; then
          log_pass "Admin multisig-confirm idempotency check passed"
        else
          log_fail "Admin multisig-confirm retry failed: $CONFIRM_RETRY"
        fi
      else
        log_fail "Admin confirm multisig payment failed: $CONFIRM_RESP"
      fi
    else
      log_fail "Stars payment exceeding limit did not status=PENDING_MULTISIG: $LIMIT_STARS_RESP"
    fi
  else
    log_fail "Stars limit invoice creation failed: $LIMIT_INVOICE_RESP"
  fi
else
  log_skip "No WALLET_JWT or project — skipping"
fi

# ================================================================
# Test 12: Automation Rules CRUD (authenticated)
# ================================================================
echo ""
echo "--- 12. Automation Rules CRUD ---"

if [ "$HAS_WALLET" = true ]; then
  # 12a. List rules (initially empty or has seeds)
  RULES_LIST=$(curl -sf -H "$AUTH_HEADER" "${API_BASE}/automation/rules" 2>&1)
  log_pass "GET /automation/rules returns successfully"

  # 12b. Create a new automation rule
  CREATE_RULE_RESP=$(curl -sf -X POST "${API_BASE}/automation/rules" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"rule_type":"AUTO_SPARK","condition_json":{"minScore":85,"maxAmount":100},"action_json":{"action":"SPARK","amount":10}}' 2>&1)

  if echo "$CREATE_RULE_RESP" | grep -q '"success":true'; then
    RULE_ID=$(echo "$CREATE_RULE_RESP" | grep -o '"ruleId":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_pass "POST /automation/rules created rule successfully, id=$RULE_ID"

    # 12c. Toggle rule to disabled (enabled=0)
    TOGGLE_RESP=$(curl -sf -X PUT "${API_BASE}/automation/rules/${RULE_ID}" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HEADER" \
      -d '{"enabled":0}' 2>&1)

    if echo "$TOGGLE_RESP" | grep -q '"success":true'; then
      log_pass "PUT /automation/rules/:id toggled rule successfully"

      # Verify it actually shows enabled=0 in list
      RULES_CHECK=$(curl -sf -H "$AUTH_HEADER" "${API_BASE}/automation/rules" 2>&1)
      if echo "$RULES_CHECK" | grep -q "\"id\":\"${RULE_ID}\".*\"enabled\":0"; then
        log_pass "Rule correctly shows disabled in DB"
      else
        log_fail "Rule did not persist disabled state: $RULES_CHECK"
      fi
    else
      log_fail "PUT /automation/rules/:id failed: $TOGGLE_RESP"
    fi
  else
    log_fail "POST /automation/rules failed: $CREATE_RULE_RESP"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 13: VC Staking (authenticated)
# ================================================================
echo ""
echo "--- 13. VC Staking ---"

if [ "$HAS_WALLET" = true ]; then
  # 13a. Clean up stakes first for consistency
  npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "
    DELETE FROM bounty_stakes WHERE user_id = '${USER_WALLET}';
    DELETE FROM used_chain_txs WHERE user_id = '${USER_WALLET}';
  " > /dev/null 2>&1 || true

  # 13b. Check initial status (should be null or empty)
  STAKE_INIT=$(curl -sf -H "$AUTH_HEADER" "${API_BASE}/bounty/stake/status" 2>&1)
  if echo "$STAKE_INIT" | grep -q '"data":null'; then
    log_pass "Initial stake status is null"
  else
    log_info "Initial stake status: $STAKE_INIT"
  fi

  # 13c. Submit a mock stake transaction
  MOCK_TX="mock-tx-stake-$(date +%s)"
  STAKE_RESP=$(curl -sf -X POST "${API_BASE}/bounty/stake" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{\"creator_tier\":1,\"vc_amount\":100000,\"tx_hash\":\"$MOCK_TX\"}" 2>&1)

  if echo "$STAKE_RESP" | grep -q '"success":true'; then
    log_pass "POST /bounty/stake accepted mock tx under development mode"

    # 13d. Verify status now reflects active stake
    STAKE_ACTIVE=$(curl -sf -H "$AUTH_HEADER" "${API_BASE}/bounty/stake/status" 2>&1)
    if echo "$STAKE_ACTIVE" | grep -q '"status":"ACTIVE"'; then
      log_pass "Staking active state recorded successfully"
    else
      log_fail "Stake state not ACTIVE: $STAKE_ACTIVE"
    fi
  else
    log_fail "POST /bounty/stake failed: $STAKE_RESP"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 14: Exchange Registration Bounty & Referral Audit (authenticated)
# ================================================================
echo ""
echo "--- 14. Exchange Bounty & Referral Audit ---"

if [ "$HAS_WALLET" = true ]; then
  USER_WALLET="${USER_WALLET:-EQD_test_user_wallet}"
  INVITER_WALLET="UQDwO6ai0zr0UVekU-NIqI_eCTKCICrkt2zGMnAzNJrk58dO"

  # 14a. Reset bounty submissions, balances, and referrals for testing user
  npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "
    DELETE FROM bounty_submissions WHERE user_id = '$USER_WALLET';
    DELETE FROM user_vc_balances WHERE user_id IN ('$USER_WALLET', '$INVITER_WALLET');
    DELETE FROM referrals WHERE invitee_wallet = '$USER_WALLET';
    UPDATE bounty_tasks SET completed_slots = 0 WHERE id = 'bounty-binance-reg';
    INSERT INTO referrals (id, inviter_wallet, invitee_wallet, reward_status, reward_vc_nano)
    VALUES ('ref-test-bounty-123', '$INVITER_WALLET', '$USER_WALLET', 'pending', 50000000000);
  " > /dev/null 2>&1 || true

  # 14b. Submit exchange registration task
  SUBMIT_BOUNTY=$(curl -sf -X POST "${API_BASE}/bounty/tasks/bounty-binance-reg/submit" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"exchangeUid":"123456789","screenshotUrl":"https://example.com/screenshot.png"}' 2>&1)

  if echo "$SUBMIT_BOUNTY" | grep -q '"success":true'; then
    SUB_ID=$(echo "$SUBMIT_BOUNTY" | grep -o '"submissionId":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_pass "Bounty submitted, status=PENDING, id=$SUB_ID"

    # 14c. Verify the submission using WALLET_JWT (which is default admin in development mode)
    VERIFY_RESP=$(curl -sf -X POST "${API_BASE}/admin/bounty/submissions/${SUB_ID}/verify" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HEADER" \
      -d '{"status":"VERIFIED"}' 2>&1)

    if echo "$VERIFY_RESP" | grep -q '"success":true'; then
      log_pass "Admin verified bounty submission successfully"

      # 14d. Verify database updates:
      # - Invitee balance updated with 1000 VC
      # - Referral reward status updated to 'paid'
      # - Inviter balance updated with 50 VC

      INVITEE_BAL=$(npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "SELECT pending_vc FROM user_vc_balances WHERE user_id = '$USER_WALLET'" 2>&1)
      INVITER_BAL=$(npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "SELECT pending_vc FROM user_vc_balances WHERE user_id = '$INVITER_WALLET'" 2>&1)
      REF_STATUS=$(npx wrangler d1 execute DB --local --config worker/wrangler.toml --command "SELECT reward_status FROM referrals WHERE invitee_wallet = '$USER_WALLET'" 2>&1)

      if echo "$INVITEE_BAL" | grep -q "1000"; then
        log_pass "Invitee received 1,000 VC reward"
      else
        log_fail "Invitee balance update failed: $INVITEE_BAL"
      fi

      if echo "$INVITER_BAL" | grep -q "50"; then
        log_pass "Inviter received 50 VC referral payout"
      else
        log_fail "Inviter balance update failed: $INVITER_BAL"
      fi

      if echo "$REF_STATUS" | grep -q "paid"; then
        log_pass "Referral status updated to paid"
      else
        log_fail "Referral status update failed: $REF_STATUS"
      fi
    else
      log_fail "Admin verification endpoint failed: $VERIFY_RESP"
    fi
  else
    log_fail "Bounty submission failed: $SUBMIT_BOUNTY"
  fi
else
  log_skip "No WALLET_JWT — skipping"
fi

# ================================================================
# Test 11: Mainnet Configuration Safety Check
# ================================================================
echo ""
echo "--- 11. Mainnet Configuration Safety Check ---"

log_info "Testing dynamic mainnet simulation with X-Simulate-Network header..."

MAINNET_CONTENT=$(curl -s -H "X-Simulate-Network: mainnet" "${API_BASE}/launches" 2>&1 || true)
MAINNET_RESP=$(curl -s -w "%{http_code}" -H "X-Simulate-Network: mainnet" "${API_BASE}/launches" -o /dev/null 2>&1 || true)

if [ "$MAINNET_RESP" = "500" ] && echo "$MAINNET_CONTENT" | grep -q "Mock tokens/keys are not allowed on mainnet"; then
  log_pass "Mainnet safety check correctly blocks mock environment (500) via simulation header"
else
  log_fail "Mainnet safety check failed: HTTP Status $MAINNET_RESP, Content: $MAINNET_CONTENT"
fi

# ================================================================
# Test 12: PATCH /api/v1/launches/:id - Edit Project Details
# ================================================================
echo ""
echo "--- 12. PATCH /api/v1/launches/:id - Edit Project Details ---"

if [ -n "$PROJ_ID" ]; then
  # 12a. Valid update with JWT
  PATCH_BODY='{"title":"Updated Spark Title","description":"Updated description for the AI agent project.","extraPerks":"Free lifetime membership + exclusive merch","websiteUrl":"https://vibecoder.io","githubUrl":"https://github.com/vibecoder/agent","teamDesc":"VibeCoder core team – 4 years of smart contract experience"}'

  PATCH_RESP=$(curl -s -w "\n%{http_code}" \
    -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${WALLET_JWT}" \
    -d "$PATCH_BODY" \
    "${API_BASE}/launches/${PROJ_ID}" 2>&1 || true)

  PATCH_CODE=$(echo "$PATCH_RESP" | tail -1)
  PATCH_CONTENT=$(echo "$PATCH_RESP" | sed '$d')

  if [ "$PATCH_CODE" = "200" ]; then
    log_pass "PATCH /launches/${PROJ_ID} returned 200 OK"
  else
    log_fail "PATCH /launches/${PROJ_ID} expected 200, got $PATCH_CODE – $PATCH_CONTENT"
  fi

  # 12b. Verify fields persisted (re-fetch)
  VERIFY_RESP=$(curl -s "${API_BASE}/launches/${PROJ_ID}" 2>&1 || true)
  if echo "$VERIFY_RESP" | grep -q "Updated Spark Title"; then
    log_pass "PATCH update persisted: title is 'Updated Spark Title'"
  else
    log_fail "PATCH update NOT persisted in GET response: $VERIFY_RESP"
  fi

  if echo "$VERIFY_RESP" | grep -q "Free lifetime membership"; then
    log_pass "PATCH update persisted: extra_perks contains 'Free lifetime membership'"
  else
    log_fail "PATCH extra_perks NOT persisted: $VERIFY_RESP"
  fi

  # 12c. Unauthorized update (no JWT)
  UNAUTH_RESP=$(curl -s -w "\n%{http_code}" \
    -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"title":"Hacker title"}' \
    "${API_BASE}/launches/${PROJ_ID}" 2>&1 || true)

  UNAUTH_CODE=$(echo "$UNAUTH_RESP" | tail -1)

  if [ "$UNAUTH_CODE" = "401" ] || [ "$UNAUTH_CODE" = "403" ]; then
    log_pass "Unauthorized PATCH correctly rejected with $UNAUTH_CODE"
  else
    log_fail "Unauthorized PATCH expected 401/403, got $UNAUTH_CODE"
  fi
else
  log_info "Skipping Test 12 – no PROJ_ID available from previous tests"
fi

# ================================================================
# Summary
# ================================================================
echo ""
echo "================================================================"
echo " Verification Complete"
echo "================================================================"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "🔴 Some checks failed. Review output above."
  echo ""
  echo "To debug:"
  echo "  API_HOST=http://localhost:8787 WALLET_JWT=xxx bash $0"
  exit 1
else
  echo "🟢 All checks passed!"
  exit 0
fi
