import { Context, InlineKeyboard } from 'grammy';
import { sheetsDb, formatWhatsAppUrl, escapeMarkdownText } from './services/sheetsService.js';
import { userStore } from './userStore.js';
import { getBusinessReplyKeyboard, isRegisteredBusiness } from './helpers.js';

export async function startAddProductFlow(ctx: Context, userId: number) {
  userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_NAME', {
    tempProduct: '',
    tempListingType: undefined,
    tempPrice: '',
    tempNegotiable: undefined,
  });

  await ctx.reply(
    `📦 *Add Listing to Your Store*\n\n` +
    `*Step 1 of 4:* What is the **Product or Service Name**?\n` +
    `_(Example: Men Leather Sandals, iPhone 14 Pro, Graphic Design, Laundry Service)_`,
    {
      parse_mode: 'Markdown',
      reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
    }
  );
}

export async function startEditProductFlow(ctx: Context, userId: number) {
  const listings = sheetsDb.getBusinessListingsForUser(userId);

  if (listings.length === 0) {
    await ctx.reply(
      `🛍️ *No Products Found*\n\n` +
      `You don't have any registered products in your store yet.\n\n` +
      `Tap **📦 Add Product** or type \`/register\` to list your first item!`,
      {
        parse_mode: 'Markdown',
        reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
      }
    );
    return;
  }

  userStore.setFlowState(userId, 'AWAITING_EDIT_SELECT_ITEM');

  const kb = new InlineKeyboard();
  let listText = `✏️ *Edit Product Listings*\n\nHere are your current active products:\n\n`;

  listings.forEach((item, index) => {
    const itemNum = index + 1;
    listText += `*${itemNum}.* ${item.product} (*${item.price}*)\n`;
    kb.text(`✏️ #${itemNum} ${item.product.slice(0, 15)}`, `edit_item_${item.id}`);
    if (itemNum % 2 === 0) kb.row();
  });

  kb.row().text('📱 Update WhatsApp Number', 'edit_act_whatsapp_global');

  await ctx.reply(
    `${listText}\nReply with the **item number** (e.g. \`1\`) or tap a button below to select what you want to edit:`,
    {
      parse_mode: 'Markdown',
      reply_markup: kb,
    }
  );
}

export async function showMyListings(ctx: Context, userId: number) {
  const listings = sheetsDb.getBusinessListingsForUser(userId);

  if (listings.length === 0) {
    await ctx.reply(
      `📋 *Store Catalog Empty*\n\n` +
      `You currently have 0 active listings.\n\n` +
      `Use **📦 Add Product** or type \`/addproduct\` to add products to your store catalog.`,
      {
        parse_mode: 'Markdown',
        reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
      }
    );
    return;
  }

  const first = listings[0];
  const waUrl = formatWhatsAppUrl(first.whatsapp);

  let text = `📋 *${escapeMarkdownText(first.businessName)} Catalog*\n`;
  text += `📍 *Location:* ${escapeMarkdownText(first.city)}, ${escapeMarkdownText(first.state)}\n`;
  text += `📱 *WhatsApp:* [Message on WhatsApp](${waUrl})\n`;
  text += `📦 *Total Listed Items:* ${listings.length}\n\n`;
  text += `*Your Items:*\n`;

  listings.forEach((item, index) => {
    text += `${index + 1}. *${escapeMarkdownText(item.product)}* (${escapeMarkdownText(item.price)})\n`;
  });

  text += `\n_Buyers searching on Floate AI can find and contact you directly on WhatsApp!_`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
  });
}

export async function startUpdateWhatsappFlow(ctx: Context, userId: number) {
  userStore.setFlowState(userId, 'AWAITING_UPDATE_WHATSAPP');

  const profile = userStore.getProfile(userId);
  const currentWa = profile.businessWhatsapp || sheetsDb.getBusinessListingsForUser(userId)[0]?.whatsapp || 'Not set';

  await ctx.reply(
    `📱 *Update WhatsApp Contact Number*\n\n` +
    `Current WhatsApp: *${currentWa}*\n\n` +
    `Please enter your **new WhatsApp Phone Number**:\n` +
    `_(Example: 08012345678 or +2348012345678)_`,
    { parse_mode: 'Markdown' }
  );
}

export async function startDeleteBusinessFlow(ctx: Context, userId: number) {
  userStore.setFlowState(userId, 'AWAITING_DELETE_BUSINESS_CONFIRM');

  const kb = new InlineKeyboard()
    .text('⚠️ YES, Remove My Business', 'btn_del_biz_confirm')
    .row()
    .text('❌ CANCEL', 'btn_del_biz_cancel');

  await ctx.reply(
    `⚠️ *Remove My Business*\n\n` +
    `Are you sure? This will remove ALL your products from Floate.\n\n` +
    `Reply **YES** to confirm or **CANCEL** to go back.`,
    {
      parse_mode: 'Markdown',
      reply_markup: kb,
    }
  );
}

export async function showMyStatsFlow(ctx: Context, userId: number) {
  const stats = sheetsDb.getBusinessStats(userId);

  if (stats.allTimeAppearances === 0) {
    await ctx.reply(
      `📊 *Your Floate Stats*\n\n` +
      `No buyer matches yet, this will update as buyers search for products like yours. Make sure your listings are accurate with /editproduct.\n\n` +
      `📦 *${stats.productCount}* product${stats.productCount === 1 ? '' : 's'} listed\n` +
      `📅 Registered *${stats.registeredDaysAgo}* day${stats.registeredDaysAgo === 1 ? '' : 's'} ago`,
      {
        parse_mode: 'Markdown',
        reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
      }
    );
    return;
  }

  await ctx.reply(
    `📊 *Your Floate Stats*\n\n` +
    `You've appeared in *${stats.allTimeAppearances}* buyer search${stats.allTimeAppearances === 1 ? '' : 'es'} all-time (*${stats.last7DaysAppearances}* this week)\n` +
    `📦 *${stats.productCount}* product${stats.productCount === 1 ? '' : 's'} listed\n` +
    `📅 Registered *${stats.registeredDaysAgo}* day${stats.registeredDaysAgo === 1 ? '' : 's'} ago\n\n` +
    `Keep your prices updated to stay competitive in search results!`,
    {
      parse_mode: 'Markdown',
      reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : undefined,
    }
  );
}
