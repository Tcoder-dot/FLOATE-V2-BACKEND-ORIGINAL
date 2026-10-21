import { Bot } from 'grammy';
import { config, isBotConfigured } from './config.js';
import { setupCommandHandlers } from './handlers/commands.js';
import { setupCallbackHandlers } from './handlers/callbacks.js';
import { setupMessageHandlers } from './handlers/messages.js';
import { statsManager } from './statsManager.js';
import { reminderService } from './services/reminderService.js';

let botInstance: Bot | null = null;

export function getBotInstance(): Bot {
  const currentToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken || '123456789:DummyTokenForInitializingBotStructure';
  const isDummy = !currentToken || currentToken.includes('DummyToken');

  // Re-initialize if botInstance is null OR if token updated from dummy/old token
  if (!botInstance || (botInstance.token !== currentToken && !isDummy)) {
    const botOptions = isDummy ? {
      botInfo: {
        id: 777000123,
        is_bot: true,
        first_name: 'Floate AI Bot',
        username: 'FloateAIBot',
      } as any,
    } : undefined;

    botInstance = new Bot(currentToken, botOptions);

    // Global error handler
    botInstance.catch((err) => {
      const errorStr = String((err.error as any)?.message || err.error || (err as any)?.message || err);
      if (errorStr.includes('409') || errorStr.includes('getUpdates') || errorStr.includes('Conflict')) {
        console.warn('⚠️ Telegram Polling Warning (409 Conflict): Another instance is currently polling this bot token.');
        return;
      }
      if (errorStr.includes('401') || errorStr.includes('Unauthorized') || errorStr.includes('getMe')) {
        console.warn('⚠️ Telegram Bot Token is unauthorized (401). Please check TELEGRAM_BOT_TOKEN.');
        return;
      }
      console.error('Error in Telegram bot execution:', err);
      statsManager.recordError();
    });

    // Register all handlers
    setupCommandHandlers(botInstance);
    setupCallbackHandlers(botInstance);
    setupMessageHandlers(botInstance);

    // Start daily morning reminder scheduler for registered businesses
    reminderService.startScheduler(botInstance);
  }

  return botInstance;
}

export { isBotConfigured };
