// Bounty auto-verification service
// Production: verifies tasks against external APIs (X / Telegram / Discord).
// Development: uses mock pass logic.

interface BountyTask {
  id: string;
  task_type: string;
  target_url: string;
}

const DEV_WHITELIST = ['user-1', 'user-2', 'VibeDev_88ff', 'test-user'];

export async function verifyTask(userId: string, task: BountyTask, environment?: string): Promise<boolean> {
  if (environment !== 'development') {
    // In production, always fail closed — real external API verification must be implemented
    console.warn(`[Bounty] verifyTask called in production for task ${task.id} (${task.task_type}) — external verification required.`);
    return false;
  }

  // Dev mock logic only
  if (DEV_WHITELIST.includes(userId)) return true;
  return Math.random() > 0.3;
}

export async function checkTelegramMembership(chatId: string, userId: string, environment?: string): Promise<boolean> {
  if (environment !== 'development') {
    console.warn(`[Bounty] checkTelegramMembership called in production for chat ${chatId} — external verification required.`);
    return false;
  }
  return true; // dev mock
}
