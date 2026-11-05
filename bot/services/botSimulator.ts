import { getBotInstance } from '../bot.js';
import {
  processMasterWhatsAppEngine,
  addWhatsAppOutgoingListener,
  removeWhatsAppOutgoingListener,
  SendWhatsAppOptions,
  registerSimulatedMedia,
} from './whatsappService.js';

export interface SimulatedReply {
  chatId: number | string;
  text: string;
  parseMode?: string;
  replyMarkup?: any;
  quickReplies?: Array<{ id: string; title: string }>;
  listMenu?: {
    buttonText: string;
    title?: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  };
  ctaUrl?: { displayText: string; url: string; headerText?: string; footerText?: string };
  audio?: { id?: string; url?: string };
  image?: { id?: string; url?: string; caption?: string };
}

let isTransformerAttached = false;
const globalRepliesMap = new Map<number | string, SimulatedReply[]>();

export async function processSimulatedMessage(
  userText: string,
  userId: number | string = '2348012345678',
  firstName: string = 'Customer',
  channel: 'whatsapp' | 'telegram' = 'whatsapp',
  options?: {
    imageId?: string;
    imageBase64?: string;
    imageMimeType?: string;
    audioId?: string;
    audioBase64?: string;
    audioMimeType?: string;
  }
): Promise<{ replies: SimulatedReply[]; logs: string[] }> {
  const logs: string[] = [];
  const cleanId = String(userId).trim();

  // -------------------------------------------------------------
  // 1. PRIMARY CHANNEL: WhatsApp Conversational Engine Simulator
  // -------------------------------------------------------------
  if (channel === 'whatsapp') {
    const phone = cleanId.replace(/\D/g, '') || '2348012345678';
    const capturedReplies: SimulatedReply[] = [];

    // Attach temporary listener to capture all outgoing messages during this turn
    const listener = (toPhone: string, text: string, options?: SendWhatsAppOptions) => {
      const cleanTo = toPhone.replace(/\D/g, '');
      const cleanSender = phone.replace(/^0/, '234');
      const isDirectRecipient = cleanTo === cleanSender || cleanTo === phone;

      const displayText = options?.audio ? (text ? `🎙️ [Voice Note Audio]\n${text}` : '🎙️ [Voice Note Audio]') : text;

      if (isDirectRecipient) {
        capturedReplies.push({
          chatId: toPhone,
          text: displayText,
          quickReplies: options?.quickReplies,
          listMenu: options?.listMenu,
          ctaUrl: options?.ctaUrl,
          audio: options?.audio,
          image: options?.image,
          replyMarkup: options?.quickReplies
            ? {
                inline_keyboard: options.quickReplies.map((q) => [
                  { text: q.title, callback_data: q.id },
                ]),
              }
            : undefined,
        });
      } else {
        // Relay delivery to counterpart (e.g. vendor or buyer)
        logs.push(`[Secure Line Relayed ➡️ +${toPhone}]: "${displayText}"`);
        capturedReplies.push({
          chatId: toPhone,
          text: `[Relayed to Counterpart (+${toPhone})]:\n${displayText}`,
          quickReplies: options?.quickReplies,
          listMenu: options?.listMenu,
          ctaUrl: options?.ctaUrl,
          audio: options?.audio,
          image: options?.image,
        });
      }
    };

    addWhatsAppOutgoingListener(listener);
    logs.push(`[WhatsApp Simulator Ingress] From +${phone} (${firstName}): "${userText}"`);

    try {
      let activeImageId = options?.imageId;
      if (options?.imageBase64) {
        activeImageId = `sim_img_${Date.now()}`;
        registerSimulatedMedia(
          activeImageId,
          Buffer.from(options.imageBase64, 'base64'),
          options.imageMimeType || 'image/jpeg'
        );
      }

      let activeAudioId = options?.audioId;
      if (options?.audioBase64) {
        activeAudioId = `sim_audio_${Date.now()}`;
        registerSimulatedMedia(
          activeAudioId,
          Buffer.from(options.audioBase64, 'base64'),
          options.audioMimeType || 'audio/ogg'
        );
      }

      await processMasterWhatsAppEngine({
        senderPhone: phone,
        senderName: firstName,
        text: userText,
        imageId: activeImageId,
        imageMimeType: options?.imageMimeType,
        audioId: activeAudioId,
        audioMimeType: options?.audioMimeType,
      });
      logs.push(`[WhatsApp Simulator Executed] Captured ${capturedReplies.length} replies.`);
    } catch (err: any) {
      logs.push(`[WhatsApp Simulator Error] ${err?.message || err}`);
      console.error('[Simulator WhatsApp Error]:', err);
    } finally {
      removeWhatsAppOutgoingListener(listener);
    }

    return { replies: capturedReplies, logs };
  }

  // -------------------------------------------------------------
  // 2. SECONDARY CHANNEL: Telegram Engine Simulator
  // -------------------------------------------------------------
  const bot = getBotInstance();
  const numericId = Number(userId) || 99912345;

  if (!bot.botInfo) {
    bot.botInfo = {
      id: 123456789,
      is_bot: true,
      first_name: 'Floate AI Bot',
      username: 'floate_ai_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    } as any;
  }

  if (!isTransformerAttached) {
    isTransformerAttached = true;
    bot.api.config.use(async (prev: any, method: string, payload: any, signal: any) => {
      if (method === 'sendMessage') {
        const replyItem = {
          chatId: Number(payload.chat_id),
          text: String(payload.text),
          parseMode: payload.parse_mode,
          replyMarkup: payload.reply_markup,
        };
        const existing = globalRepliesMap.get(Number(payload.chat_id)) || [];
        existing.push(replyItem);
        globalRepliesMap.set(Number(payload.chat_id), existing);

        return {
          ok: true,
          result: {
            message_id: Math.floor(Math.random() * 10000),
            date: Math.floor(Date.now() / 1000),
            chat: { id: Number(payload.chat_id), type: 'private', first_name: firstName },
            text: String(payload.text),
          },
        } as any;
      }

      if (method === 'sendChatAction' || method === 'answerCallbackQuery') {
        return { ok: true, result: true } as any;
      }

      try {
        return await prev(method, payload, signal);
      } catch {
        return { ok: true, result: true } as any;
      }
    });
  }

  // Clear previous replies for this user ID
  globalRepliesMap.set(numericId, []);

  try {
    const isCallback =
      userText.startsWith('cmd_') ||
      userText.startsWith('role_') ||
      userText.startsWith('toggle_') ||
      userText.startsWith('reg_') ||
      userText.startsWith('btn_') ||
      userText.startsWith('edit_') ||
      userText.startsWith('inv_');
    const isVoice =
      !isCallback &&
      (userText.toLowerCase().includes('voice note') || userText.startsWith('🎙️'));
    const isPhoto =
      !isCallback &&
      !isVoice &&
      (Boolean(options?.imageBase64) ||
        Boolean(options?.imageId) ||
        userText.startsWith('📸') ||
        /\b(upload photo|nin photo|nin card|upload nin|send photo|selfie|id card|id slip)\b/i.test(userText));
    const isVideo =
      !isCallback &&
      !isVoice &&
      !isPhoto &&
      (userText.startsWith('📹') ||
        /\b(upload video|send video|submit video|record video|liveness video|video note)\b/i.test(userText));

    let update: any;

    if (isCallback) {
      update = {
        update_id: Math.floor(Math.random() * 100000),
        callback_query: {
          id: String(Math.floor(Math.random() * 100000)),
          from: {
            id: numericId,
            is_bot: false,
            first_name: firstName,
            username: 'test_user',
          },
          message: {
            message_id: Math.floor(Math.random() * 10000),
            chat: { id: numericId, first_name: firstName, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Menu',
          },
          data: userText,
        },
      };
    } else if (isPhoto) {
      update = {
        update_id: Math.floor(Math.random() * 100000),
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: {
            id: numericId,
            is_bot: false,
            first_name: firstName,
            username: 'test_user',
          },
          chat: {
            id: numericId,
            first_name: firstName,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          photo: [
            { file_id: 'sim_photo_small', width: 320, height: 240 },
            { file_id: 'sim_photo_large', width: 1280, height: 960 },
          ],
          caption: userText,
        },
      };
    } else if (isVideo) {
      update = {
        update_id: Math.floor(Math.random() * 100000),
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: {
            id: numericId,
            is_bot: false,
            first_name: firstName,
            username: 'test_user',
          },
          chat: {
            id: numericId,
            first_name: firstName,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          video: {
            file_id: 'sim_video_file_id',
            duration: 8,
            width: 720,
            height: 1280,
          },
          caption: userText,
        },
      };
    } else if (isVoice) {
      update = {
        update_id: Math.floor(Math.random() * 100000),
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: {
            id: numericId,
            is_bot: false,
            first_name: firstName,
            username: 'test_user',
          },
          chat: {
            id: numericId,
            first_name: firstName,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          voice: {
            file_id: 'simulated_voice_file_id',
            duration: 5,
          },
          caption: userText,
        },
      };
    } else {
      const isCmd = userText.startsWith('/');
      const cmdLength = isCmd ? userText.split(/\s+/)[0].length : 0;
      update = {
        update_id: Math.floor(Math.random() * 100000),
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: {
            id: numericId,
            is_bot: false,
            first_name: firstName,
            username: 'test_user',
          },
          chat: {
            id: numericId,
            first_name: firstName,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: userText,
          entities: isCmd ? [{ type: 'bot_command', offset: 0, length: cmdLength }] : undefined,
        },
      };
    }

    logs.push(`[Telegram Update] ${userText}`);
    await bot.handleUpdate(update);
  } catch (err: any) {
    logs.push(`[Error] ${err?.message || err}`);
  }

  const capturedReplies = globalRepliesMap.get(numericId) || [];
  return { replies: capturedReplies, logs };
}
