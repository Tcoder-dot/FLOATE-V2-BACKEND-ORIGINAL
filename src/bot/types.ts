export interface BotStats {
  updatesProcessed: number;
  lastActive: string | null;
  commandsExecuted: Record<string, number>;
  activeUsers: Set<number>;
  errorsCount: number;
}

export interface SimulatedUpdateResponse {
  ok: boolean;
  replies: Array<{
    chatId: number;
    text: string;
    parseMode?: string;
    replyMarkup?: any;
  }>;
  logs: string[];
}
