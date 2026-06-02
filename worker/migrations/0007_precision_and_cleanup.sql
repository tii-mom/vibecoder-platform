-- 1. Clean up old task-*-onramp data to resolve ID conflicts
DELETE FROM bounty_tasks WHERE id LIKE 'task-%-onramp';
DELETE FROM bounty_submissions WHERE task_id LIKE 'task-%-onramp';

-- 2. Create rate limit table for secure AI proxy limiting
CREATE TABLE IF NOT EXISTS user_rate_limits (
  user_id TEXT,
  action TEXT,
  count INTEGER,
  window_start TEXT,
  PRIMARY KEY (user_id, action)
);

-- 3. Convert REAL amounts to INTEGER representing nano-units (scaled by 10^9)
-- SQLite handles REAL and INTEGER dynamically, but we update values to integers.
UPDATE launches SET target_total = CAST(target_total * 1000000000 AS INTEGER),
                    stage1_target = CAST(stage1_target * 1000000000 AS INTEGER),
                    stage2_target = CAST(stage2_target * 1000000000 AS INTEGER),
                    raised_total = CAST(raised_total * 1000000000 AS INTEGER);

UPDATE spark_records SET amount = CAST(amount * 1000000000 AS INTEGER),
                         tokens = CAST(tokens * 1000000000 AS INTEGER);

UPDATE governance_proposals SET amount = CAST(amount * 1000000000 AS INTEGER),
                               yes_weight = CAST(yes_weight * 1000000000 AS INTEGER),
                               no_weight = CAST(no_weight * 1000000000 AS INTEGER);

UPDATE governance_votes SET weight = CAST(weight * 1000000000 AS INTEGER);

UPDATE exit_requests SET redeemed_ton = CAST(redeemed_ton * 1000000000 AS INTEGER),
                         burned_tokens = CAST(burned_tokens * 1000000000 AS INTEGER);

UPDATE bounty_tasks SET reward_amount = CAST(reward_amount * 1000000000 AS INTEGER),
                       vc_stake = CAST(vc_stake * 1000000000 AS INTEGER),
                       token_reward_amount = CAST(token_reward_amount * 1000000000 AS INTEGER);

UPDATE bounty_submissions SET reward_vc = CAST(reward_vc * 1000000000 AS INTEGER),
                              reward_amount = CAST(reward_amount * 1000000000 AS INTEGER);

UPDATE bounty_stakes SET vc_amount = CAST(vc_amount * 1000000000 AS INTEGER);

UPDATE user_vc_balances SET pending_vc = CAST(pending_vc * 1000000000 AS INTEGER),
                            total_earned_vc = CAST(total_earned_vc * 1000000000 AS INTEGER);
