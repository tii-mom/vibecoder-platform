// Automation Rules Engine
// Executes user-defined rules: auto-spark, auto-vote, auto-exit, monitor

interface AutomationRule {
  id: string;
  user_id: string;
  rule_type: 'AUTO_SPARK' | 'AUTO_VOTE' | 'AUTO_EXIT' | 'MONITOR';
  project_id: string | null;
  condition: Record<string, any>;
  action: Record<string, any>;
  enabled: boolean;
}

export function shouldTriggerRule(rule: AutomationRule, context: Record<string, any>): boolean {
  if (!rule.enabled) return false;

  switch (rule.rule_type) {
    case 'AUTO_SPARK': {
      const score = context.score || 0;
      const amount = context.requiredAmount || 0;
      const maxAmount = rule.condition.maxAmount || Infinity;
      const minScore = rule.condition.minScore || 0;
      const stage = rule.condition.stage;
      return score >= minScore && amount <= maxAmount && (!stage || context.stage === stage);
    }
    case 'AUTO_VOTE': {
      const maxAmount = rule.condition.maxAmount || Infinity;
      return context.proposalAmount <= maxAmount;
    }
    case 'AUTO_EXIT': {
      const daysInactive = context.daysInactive || 0;
      return daysInactive >= (rule.condition.daysInactive || 14);
    }
    case 'MONITOR': {
      const priceDrop = context.priceDrop || 0;
      return priceDrop >= (rule.condition.priceDropPercent || 30);
    }
    default:
      return false;
  }
}

// Mock: check all active rules for a user against current state
export async function evaluateUserRules(
  userId: string,
  rules: AutomationRule[],
  state: Record<string, any>
): Promise<AutomationRule[]> {
  return rules.filter((r) => r.user_id === userId && shouldTriggerRule(r, state));
}
