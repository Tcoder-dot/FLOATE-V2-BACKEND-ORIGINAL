import { BotStats } from './types.js';

class StatsManager {
  private stats: BotStats = {
    updatesProcessed: 0,
    lastActive: null,
    commandsExecuted: {},
    activeUsers: new Set<number>(),
    errorsCount: 0,
  };

  public recordUpdate(userId?: number) {
    this.stats.updatesProcessed++;
    this.stats.lastActive = new Date().toISOString();
    if (userId) {
      this.stats.activeUsers.add(userId);
    }
  }

  public recordCommand(command: string) {
    this.stats.commandsExecuted[command] = (this.stats.commandsExecuted[command] || 0) + 1;
  }

  public recordError() {
    this.stats.errorsCount++;
  }

  public getStats() {
    return {
      ...this.stats,
      activeUsersCount: this.stats.activeUsers.size,
    };
  }
}

export const statsManager = new StatsManager();
