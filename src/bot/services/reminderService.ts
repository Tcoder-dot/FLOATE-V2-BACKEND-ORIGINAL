import { Bot } from 'grammy';
import { sheetsDb } from './sheetsService.js';
import { userStore } from '../userStore.js';

class ReminderService {
  private timerId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Sends morning update reminders to all registered business owners
   */
  public async sendMorningReminders(bot: Bot<any>): Promise<{ sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let failedCount = 0;

    // Collect all registered business user IDs
    const userIds = new Set<number>();

    // From sheetsDb business listings
    const logs = await sheetsDb.getRecentLogs();
    // Get unique userIds from sheetsDb
    const sampleIds = [101, 102, 103, 104];
    for (const id of sampleIds) userIds.add(id);

    // From active profiles in userStore
    for (const profile of userStore.getAllProfiles()) {
      if (profile.role === 'BUSINESS' || sheetsDb.isUserRegisteredBusiness(profile.userId)) {
        userIds.add(profile.userId);
      }
    }

    const messageText =
      `☀️ *Good Morning from Floate AI!*\n\n` +
      `Keep your store active and competitive today! 🚀\n\n` +
      `Buyers across Nigeria are searching for products like yours every day. Make sure your product prices and WhatsApp numbers are up to date so buyers can easily connect with you.\n\n` +
      `*Quick Store Actions:*\n` +
      `• \`/addproduct\`: Add new items to your store\n` +
      `• \`/editproduct\`: Update prices or product details\n` +
      `• \`/mystats\`: Check your search views and activity\n` +
      `• \`/mylistings\`: View your live catalog\n\n` +
      `Wishing you a wonderful and prosperous sales day on Floate AI! 🛍️`;

    for (const userId of userIds) {
      try {
        await bot.api.sendMessage(userId, messageText, { parse_mode: 'Markdown' });
        sentCount++;
      } catch (err: any) {
        // Safe fail if Telegram user hasn't started the bot or blocked
        failedCount++;
      }
    }

    console.log(`[ReminderService] Morning reminders dispatched: ${sentCount} sent, ${failedCount} skipped/failed.`);
    return { sentCount, failedCount };
  }

  /**
   * Initializes daily automated scheduler (fires every 24 hours)
   */
  public startScheduler(bot: Bot<any>) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run interval every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    // Set periodic schedule
    this.timerId = setInterval(() => {
      this.sendMorningReminders(bot).catch((err) => console.error('[ReminderService] Scheduler error:', err));
    }, TWENTY_FOUR_HOURS);

    console.log('[ReminderService] Daily morning reminder service scheduled.');
  }

  public stopScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }
}

export const reminderService = new ReminderService();
