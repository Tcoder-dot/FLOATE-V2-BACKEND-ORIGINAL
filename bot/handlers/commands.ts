import { Context, InlineKeyboard } from 'grammy';
import { config, isVerificationTestingPhone } from '../config.js';
import { statsManager } from '../statsManager.js';
import { generateAiReply } from '../services/aiService.js';
import { sheetsDb, escapeMarkdownText } from '../services/sheetsService.js';
import { firestoreDb, isServiceItem } from '../services/firestoreService.js';
import { executeSearch, parseSearchDeepLinkPayload } from '../services/searchService.js';
import { userStore } from '../userStore.js';
import { isRegisteredBusiness, getBusinessReplyKeyboard, replySafe } from '../helpers.js';
import { startAddProductFlow, startEditProductFlow, showMyListings, startUpdateWhatsappFlow, startDeleteBusinessFlow, showMyStatsFlow } from '../flows.js';
import { reminderService } from '../services/reminderService.js';

export function setupCommandHandlers(bot: any) {
  // /start command
  bot.command('start', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);
    statsManager.recordCommand('start');
    await sheetsDb.logInteraction(userId, username, 'COMMAND', '/start');

    // Reset registration step on start
    userStore.clearFlowState(userId);

    // Check if start command contains register_business or referral CTA deep link
    const matchParam = typeof ctx.match === 'string' ? ctx.match.trim() : '';

    if (matchParam && matchParam.startsWith('ref_')) {
      const referrerId = matchParam.replace('ref_', '').trim();
      if (referrerId) {
        userStore.setFlowState(userId, userStore.getProfile(userId).registrationStep || 'NONE', { referredBy: referrerId });
      }
    }

    if (matchParam && (matchParam === 'register_business' || matchParam === 'register' || matchParam.startsWith('register_') || matchParam === 'seller')) {
      if (isRegisteredBusiness(userId)) {
        const listings = sheetsDb.getBusinessListingsForUser(userId);
        const bizName = listings[0]?.businessName || userStore.getProfile(userId).businessName || 'Your Business';
        await ctx.reply(
          `🏪 *Welcome back to ${bizName} on Floate AI!* 👋\n\n` +
          `Your store is live and buyers searching across Nigeria can find your products.\n\n` +
          `Use the business menu below to add products, edit items, or manage your store:`,
          {
            parse_mode: 'Markdown',
            reply_markup: getBusinessReplyKeyboard(),
          }
        );
        return;
      }

      userStore.setRole(userId, 'BUSINESS', username);
      userStore.setFlowState(userId, 'AWAITING_OWNER_NAME', {
        businessName: '',
        ownerFullName: '',
        businessWhatsapp: '',
        businessState: 'Lagos',
        businessCity: 'Lagos',
        listingType: 'Product',
        businessCategory: 'General',
        firstProduct: '',
        firstPrice: '',
      });

      await ctx.reply(
        `🏪 *Welcome to Floate Verified Merchant Registration!*\n\n` +
        `Floate enables instant split payouts and verified trust for buyers across Nigeria.\n` +
        `To ensure a 100% scam-free network, all merchants complete our 4-step trust verification:\n\n` +
        `1️⃣ *Owner Legal Full Name*\n` +
        `2️⃣ *NIN / National ID OCR Match*\n` +
        `3️⃣ *Dynamic Code Liveness Video Submission*\n` +
        `4️⃣ *NUBAN Bank Account Settlement Match*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*Step 1 of 4:* What is your **Full Legal Name** (First Name and Last Name as printed on your ID or NIN)?\n` +
        `_(Example: Emeka Okafor, Amina Bello, or David Adebayo)_`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if start command contains MORE BUSINESSES search deep link from website (e.g., /start search_footwear, /start search_video_editor)
    if (
      matchParam &&
      (matchParam.startsWith('search_') ||
        matchParam.startsWith('find_') ||
        matchParam.startsWith('more_') ||
        matchParam.startsWith('s_') ||
        matchParam.startsWith('q_') ||
        matchParam === 'search')
    ) {
      userStore.setRole(userId, 'BUYER', username);
      const { query: rawQuery, location: searchLocation } = parseSearchDeepLinkPayload(matchParam);
      const cleanSearchQuery = rawQuery || 'all products';

      await sheetsDb.logInteraction(userId, username, 'DEEPLINK_SEARCH', `${cleanSearchQuery}${searchLocation ? ` in ${searchLocation}` : ''}`);

      const locHeader = searchLocation ? ` in *${escapeMarkdownText(searchLocation)}*` : '';
      await replySafe(
        ctx,
        `🔍 *Website Recommendation Request Captured!*\n\n` +
        `Here is the complete list of verified businesses matching *"${escapeMarkdownText(cleanSearchQuery)}"*${locHeader}:\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: 'Markdown' }
      );

      const searchResult = await executeSearch({
        query: cleanSearchQuery,
        location: searchLocation,
      });

      const localMatches = searchResult.results || [];
      const outOfAreaRecs = searchResult.outOfAreaRecommendations || [];

      if (localMatches.length > 0) {
        // Show up to 6 matching businesses in local area
        const displayList = localMatches.slice(0, 6);

        for (let i = 0; i < displayList.length; i++) {
          const biz = displayList[i];
          const badgeLine = [
            biz.isHighlyRecommended ? '⭐ *Top Rated Vendor*' : '',
            biz.identityVerified ? '🛡️ *Identity Verified*' : (biz.isVerified ? '✅ *Verified Merchant*' : ''),
          ].filter(Boolean).join(' | ');

          const badges = badgeLine ? `\n${badgeLine}` : '';
          const photosNotice = biz.productImages && biz.productImages.length > 0 ? `\n🖼️ *Photos:* ${biz.productImages.length} attached` : '';

          const vendorText =
            `🏢 *Vendor ${i + 1}: ${escapeMarkdownText(biz.businessName)}*${badges}\n` +
            `📍 *Location:* ${escapeMarkdownText(biz.location)}\n` +
            `📦 *Item / Service:* ${escapeMarkdownText(biz.product)} (${escapeMarkdownText(biz.price)})\n` +
            `🏷️ *Category:* ${escapeMarkdownText(biz.category)}${photosNotice}`;

          const connectKb = new InlineKeyboard()
            .text(`🛍️ Connect with ${biz.businessName.substring(0, 22)}`, `connect_lead_${biz.id}`);

          await replySafe(ctx, vendorText, {
            parse_mode: 'Markdown',
            reply_markup: connectKb,
          });
        }

        // Out of area recommendations
        if (outOfAreaRecs.length > 0 && searchLocation) {
          const recSlice = outOfAreaRecs.slice(0, 2);
          await replySafe(
            ctx,
            `💡 *Check this out (Verified vendors in other locations with nationwide delivery):*`,
            { parse_mode: 'Markdown' }
          );

          for (let j = 0; j < recSlice.length; j++) {
            const rec = recSlice[j];
            const recText =
              `🏢 *Vendor (Other Area): ${escapeMarkdownText(rec.businessName)}*\n` +
              `📍 *Location:* ${escapeMarkdownText(rec.location)}\n` +
              `📦 *Item:* ${escapeMarkdownText(rec.product)} (${escapeMarkdownText(rec.price)})\n` +
              `🏷️ *Category:* ${escapeMarkdownText(rec.category)}`;

            const connectKb = new InlineKeyboard()
              .text(`🛍️ Connect with ${rec.businessName.substring(0, 22)}`, `connect_lead_${rec.id}`);

            await replySafe(ctx, recText, {
              parse_mode: 'Markdown',
              reply_markup: connectKb,
            });
          }
        }

        // Summary footer
        const totalCount = localMatches.length;
        const moreCount = totalCount > 6 ? `\n_(Showing top 6 of ${totalCount} matching businesses)_` : '';

        await replySafe(
          ctx,
          `✨ *Ready to connect?*\n` +
          `Tap any **🛍️ Connect** button above to chat directly with that merchant.${moreCount}\n\n` +
          `💬 *Looking for something else?* Just type any product, service, or location into this chat anytime!`,
          { parse_mode: 'Markdown' }
        );
      } else if (outOfAreaRecs.length > 0) {
        // No local matches, but out of area recommendations exist
        await replySafe(
          ctx,
          `📍 *No verified sellers found in ${escapeMarkdownText(searchLocation || 'this area')} for "${escapeMarkdownText(cleanSearchQuery)}".*\n\n` +
          `💡 *Check this out (Verified vendors in other locations with nationwide delivery/waybill):*`,
          { parse_mode: 'Markdown' }
        );

        const recSlice = outOfAreaRecs.slice(0, 3);
        for (let j = 0; j < recSlice.length; j++) {
          const rec = recSlice[j];
          const recText =
            `🏢 *Vendor (Other Area): ${escapeMarkdownText(rec.businessName)}*\n` +
            `📍 *Location:* ${escapeMarkdownText(rec.location)}\n` +
            `📦 *Item:* ${escapeMarkdownText(rec.product)} (${escapeMarkdownText(rec.price)})\n` +
            `🏷️ *Category:* ${escapeMarkdownText(rec.category)}`;

          const connectKb = new InlineKeyboard()
            .text(`🛍️ Connect with ${rec.businessName.substring(0, 22)}`, `connect_lead_${rec.id}`);

          await replySafe(ctx, recText, {
            parse_mode: 'Markdown',
            reply_markup: connectKb,
          });
        }
      } else {
        await replySafe(
          ctx,
          `⚠️ *No Exact Listings Found for "${escapeMarkdownText(cleanSearchQuery)}"*${locHeader}\n\n` +
          `We couldn't locate active sellers matching this exact search right now.\n\n` +
          `💡 *Try these options:*\n` +
          `• Type a broader search term (e.g. \`shoes\`, \`laptops\`, \`video editor\`, \`services\`)\n` +
          `• Or list your own store for free by typing /register!`,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    // Check if start command contains merchant connect deep link from website (e.g., /start connect_chivora, /start connect_goodys_collection)
    if (matchParam && (matchParam.startsWith('connect_') || matchParam.startsWith('lead_') || matchParam.startsWith('buy_connect_'))) {
      let listing = sheetsDb.getListingBySlugOrName(matchParam);

      // Fallback: Check by ID if not resolved by slug
      if (!listing) {
        const cleanId = matchParam.replace(/^(connect_|lead_|connect_lead_|buy_connect_)/, '');
        listing = sheetsDb.getListingById(cleanId);
      }

      // Fallback: Check Firestore products/merchants
      if (!listing) {
        try {
          const firestoreProducts = await firestoreDb.getProductsFromFirestore();
          const cleanSearch = matchParam.replace(/^(connect_|lead_|connect_lead_|buy_connect_)/, '').replace(/_/g, ' ').toLowerCase();
          const pMatch = firestoreProducts.find((p) => {
            const name = (p.businessName || '').toLowerCase();
            return name.includes(cleanSearch) || cleanSearch.includes(name);
          });
          if (pMatch) {
            listing = {
              id: pMatch.merchantId || pMatch.id,
              userId: pMatch.merchantId,
              businessName: pMatch.businessName,
              category: pMatch.category || 'General',
              product: pMatch.product,
              price: pMatch.price || 'Negotiable',
              whatsapp: pMatch.whatsapp || '',
              city: pMatch.city || 'Lagos',
              state: pMatch.state || 'Lagos',
              isVerified: true,
              verifiedStatus: 'YES',
              listingType: 'Product',
              negotiation: 'Yes',
              registeredSince: new Date().toISOString(),
              productCount: 1,
            };
          }
        } catch (err) {
          console.error('[StartHandler] Firestore fallback error:', err);
        }
      }

      if (listing) {
        userStore.setRole(userId, 'BUYER', username);

        const merchantDoc = await firestoreDb.getMerchant(listing.whatsapp);
        const tgId = listing.telegramId || listing.userId || merchantDoc?.telegramId || merchantDoc?.userId;
        const itemName = listing.product || listing.category || 'Item';
        const isService = isServiceItem(itemName, listing.category);

        await firestoreDb.createQualificationSession(
          userId,
          username,
          {
            id: listing.id || listing.whatsapp,
            name: listing.businessName,
            whatsapp: listing.whatsapp,
            telegramId: tgId,
          },
          itemName
        );

        const cancelKb = new InlineKeyboard().text('❌ Cancel Search', 'cancel_search_session');
        const itemLabel = isService ? '💼 *Service:*' : '📦 *Item:*';
        const locPrompt = isService
          ? `📍 **Step 1:** Please **type your location or city/area** into chat (e.g., *Enugu*, *Ikeja Lagos*, *Wuse II Abuja*):`
          : `📍 **Step 1:** Please **type your specific delivery neighborhood or market area** into chat (e.g., *Wuse II Abuja*, *Ikeja Lagos*, *Main Market Onitsha*):`;

        await ctx.reply(
          `🤝 *Connecting you to ${listing.businessName}!* (Step 1/3)\n\n` +
          `🏬 *Merchant:* ${listing.businessName}\n` +
          `${itemLabel} ${itemName} (${listing.price || 'Contact for price'})\n\n` +
          `${locPrompt}\n\n` +
          `_This connects you directly with ${listing.businessName} on Floate AI!_`,
          {
            parse_mode: 'Markdown',
            reply_markup: cancelKb,
          }
        );
        return;
      } else {
        // High confidence match was ambiguous or not found
        userStore.setRole(userId, 'BUYER', username);
        await ctx.reply(
          `⚠️ *Merchant Connection*\n\n` +
          `We couldn't locate the exact merchant record for this link.\n\n` +
          `Please type the product or service you are looking for (e.g. _"I want leather slippers from Chivora"_), and we'll connect you right away!`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }

    await sendWelcomeMessage(ctx);
  });

  // /register command - Business Registration Flow
  bot.command('register', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);
    statsManager.recordCommand('register');

    if (isRegisteredBusiness(userId)) {
      const listings = sheetsDb.getBusinessListingsForUser(userId);
      const bizName = listings[0]?.businessName || userStore.getProfile(userId).businessName || 'Your Store';
      await ctx.reply(
        `🏪 *You are already registered on Floate AI!* 👋\n\n` +
        `Your store *${bizName}* is active and searchable by buyers across Nigeria.\n\n` +
        `You don't need to register again. You can manage your store using the menu options below:\n` +
        `• 📦 *Add Product*: Add a new item to your store (/addproduct)\n` +
        `• ✏️ *Edit Products*: Change prices or update existing items (/editproduct)\n` +
        `• 📊 *My Stats*: See how many buyers searched your items (/mystats)\n` +
        `• 📱 *Update WhatsApp*: Change your store contact phone (/updatewhatsapp)`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      return;
    }

    const commandText = ctx.message?.text || '';
    const matchParam = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    const isTester =
      commandText.includes('07065599116') ||
      matchParam.includes('07065599116') ||
      commandText.includes('admin') ||
      commandText.includes('verify') ||
      isVerificationTestingPhone(userId);

    if (isTester) {
      // 4-Step KYC Verification Beta Test (Exclusively for admin number 07065599116)
      userStore.setRole(userId, 'BUSINESS', username);
      userStore.setFlowState(userId, 'AWAITING_OWNER_NAME', {
        businessName: '',
        ownerFullName: '',
        businessWhatsapp: '07065599116',
        businessState: 'Lagos',
        businessCity: 'Lagos',
        listingType: 'Product',
        businessCategory: 'General',
        firstProduct: '',
        firstPrice: '',
      });

      await ctx.reply(
        `🏪 *Welcome to Floate Verified Merchant Registration (Admin Beta Test)!* 🛡️\n\n` +
        `_Testing exclusive 4-Step Trust & Identity Verification with admin number 07065599116._\n\n` +
        `1️⃣ *Owner Legal Full Name*\n` +
        `2️⃣ *NIN / National ID OCR Match*\n` +
        `3️⃣ *Dynamic Code Liveness Video Submission*\n` +
        `4️⃣ *NUBAN Bank Account Settlement Match*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*Step 1 of 4:* What is your **Full Legal Name** (First Name and Last Name as printed on your ID or NIN)?\n` +
        `_(Example: Emeka Okafor, Amina Bello, or David Adebayo)_`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // STANDARD WORKFLOW FOR ALL OTHER USERS (Keeps existing workflow 100% intact)
    userStore.setRole(userId, 'BUSINESS', username);
    userStore.setFlowState(userId, 'AWAITING_NAME', {
      businessName: '',
      ownerFullName: '',
      businessWhatsapp: '',
      businessState: 'Lagos',
      businessCity: 'Lagos',
      listingType: 'Product',
      businessCategory: 'General',
      firstProduct: '',
      firstPrice: '',
    });

    await ctx.reply(
      `🏪 *Register Your Store on FLOATE AI* 🏪\n\n` +
      `Connect with verified buyers across Nigeria with zero commission.\n\n` +
      `*Step 1 of 10:* What is your **Business or Store Name**?\n` +
      `_(Example: Chiks Electronics, Kemi Fashion Hub, Onitsha Footwear)_\n\n` +
      `_Type /cancel anytime to exit registration._`,
      { parse_mode: 'Markdown' }
    );
  });

  // /verify or /kyc - Direct shortcut for admin test number 07065599116
  bot.command(['verify', 'kyc', 'testverification'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    userStore.setRole(userId, 'BUSINESS', username);
    userStore.setFlowState(userId, 'AWAITING_OWNER_NAME', {
      businessName: '',
      ownerFullName: '',
      businessWhatsapp: '07065599116',
      businessState: 'Lagos',
      businessCity: 'Lagos',
      listingType: 'Product',
      businessCategory: 'General',
      firstProduct: '',
      firstPrice: '',
    });

    await ctx.reply(
      `🏪 *Floate Verified Merchant Registration* 🛡️\n\n` +
      `_Complete your 6-Step Trust & Identity Verification to receive Tier-3 Badges and list products:_\n\n` +
      `1️⃣ *Owner Legal Full Name*\n` +
      `2️⃣ *NIN / National ID OCR Match*\n` +
      `3️⃣ *Dynamic Code & Liveness Video*\n` +
      `4️⃣ *Live GPS Anti-Spoof Location*\n` +
      `5️⃣ *Store Name & Category*\n` +
      `6️⃣ *Product Listings & Prices*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Step 1:* What is your **Full Legal Name** (First Name and Last Name as printed on your ID or NIN)?\n` +
      `_(Example: Emeka Okafor, Amina Bello, or David Adebayo)_`,
      { parse_mode: 'Markdown' }
    );
  });

  // /claim command - Business Account Claiming Flow
  bot.command(['claim', 'claimaccount', 'activate'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);
    statsManager.recordCommand('claim');

    if (isRegisteredBusiness(userId)) {
      const listings = sheetsDb.getBusinessListingsForUser(userId);
      const bizName = listings[0]?.businessName || 'your business';
      await ctx.reply(
        `✅ *Account Already Active!*\n\n` +
        `Your Telegram account is already linked to *${bizName}*.\n\n` +
        `Use the business menu below to add products, edit items, or manage your store:`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      return;
    }

    const pending = sheetsDb.getPendingClaimForUser(userId);
    if (pending) {
      await ctx.reply(
        `⏳ *Claim Request Already Pending*\n\n` +
        `You requested to claim *${pending.businessName}* (${pending.whatsapp}).\n\n` +
        `Your claim request is currently awaiting admin verification. You will receive a notification here as soon as an admin approves or rejects your request!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    userStore.setFlowState(userId, 'AWAITING_CLAIM_PHONE');

    await ctx.reply(
      `🏬 *Claim Your Floate AI Business Store*\n\n` +
      `If your business was registered via Google Form or offline, you can claim your store and manage your catalog directly on Telegram!\n\n` +
      `🔒 *Choose How to Claim Your Account:*\n\n` +
      `1️⃣ *1-Tap Quick Verify:* Tap the button below to **Share your Telegram Phone Number**.\n` +
      `2️⃣ *Manual WhatsApp Input:* Simply **type your registered WhatsApp number** directly into this chat (e.g., \`08012345678\` or \`2348012345678\`).\n\n` +
      `_Your request will be submitted to the admin team for quick verification before linking your account!_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 Share Telegram Phone Number',
                request_contact: true,
              },
            ],
            [
              {
                text: '❌ Cancel Claiming',
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  // Admin Command: /approveclaim [business name, whatsapp, or claim ID]
  bot.command(['approveclaim', 'approve'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const adminId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;

    if (adminId && String(userId) !== String(adminId)) {
      await ctx.reply('⚠️ *Access Denied*: This command is restricted to bot administrators.', { parse_mode: 'Markdown' });
      return;
    }

    const text = ctx.message?.text || '';
    const query = text.replace(/^\/(approveclaim|approve)\s*/i, '').trim();

    if (!query) {
      const pendingList = sheetsDb.getPendingClaims();
      if (pendingList.length === 0) {
        await ctx.reply('ℹ️ There are no pending business claim requests.');
        return;
      }
      const formatted = pendingList.map((c, i) =>
        `${i + 1}. 🏬 *${c.businessName}*\n   📱 WhatsApp: \`${c.whatsapp}\`\n   👤 Requested By: ${c.requestingUsername} (ID: \`${c.requestingUserId}\`)`
      ).join('\n\n');
      await ctx.reply(
        `📋 *Pending Business Claim Requests (${pendingList.length}):*\n\n${formatted}\n\nTo approve a claim, run: \`/approveclaim [Business Name or WhatsApp]\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const result = await sheetsDb.approveClaim(query);
    if (!result.success || !result.pendingClaim) {
      await ctx.reply(`❌ No pending claim request found matching "*${query}*".\nRun \`/pendingclaims\` to view active claim requests.`, { parse_mode: 'Markdown' });
      return;
    }

    const claim = result.pendingClaim;

    // Link the business user in userStore
    const reqUserIdNum = Number(claim.requestingUserId);
    userStore.setRole(reqUserIdNum, 'BUSINESS', claim.requestingUsername);
    userStore.updateRegistration(reqUserIdNum, {
      businessName: claim.businessName,
      businessWhatsapp: claim.whatsapp,
    });

    // Send direct notification to the user who submitted the claim
    try {
      await ctx.api.sendMessage(
        claim.requestingUserId,
        `🎉 *Claim Approved!*\n\n` +
        `Great news! Your claim request for *${claim.businessName}* (${claim.whatsapp}) has been approved by the admin. 👋\n\n` +
        `Your Telegram account is now officially linked to your store. You can now use all business tools:\n\n` +
        `• \`/mystats\`: View store views and performance\n` +
        `• \`/addproduct\`: Add items to your store catalog\n` +
        `• \`/editproduct\`: Manage your products`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
    } catch (notifyErr: any) {
      console.warn(`[User Notify Notice] Could not send Telegram approval message to user ${claim.requestingUserId}:`, notifyErr?.message || notifyErr);
    }

    await ctx.reply(
      `✅ *Claim Approved Successfully!*\n\n` +
      `• *Business:* ${claim.businessName}\n` +
      `• *WhatsApp:* ${claim.whatsapp}\n` +
      `• *Linked Telegram ID:* \`${claim.requestingUserId}\` (@${claim.requestingUsername})\n\n` +
      `The user has been notified and granted full seller permissions!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Admin Command: /rejectclaim [business name, whatsapp, or claim ID]
  bot.command(['rejectclaim', 'reject'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const adminId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;

    if (adminId && String(userId) !== String(adminId)) {
      await ctx.reply('⚠️ *Access Denied*: This command is restricted to bot administrators.', { parse_mode: 'Markdown' });
      return;
    }

    const text = ctx.message?.text || '';
    const query = text.replace(/^\/(rejectclaim|reject)\s*/i, '').trim();

    if (!query) {
      await ctx.reply('⚠️ Please specify the business name or WhatsApp number to reject.\nExample: \`/rejectclaim Chiks Electronics\`', { parse_mode: 'Markdown' });
      return;
    }

    const result = await sheetsDb.rejectClaim(query);
    if (!result.success || !result.pendingClaim) {
      await ctx.reply(`❌ No pending claim request found matching "*${query}*".`, { parse_mode: 'Markdown' });
      return;
    }

    const claim = result.pendingClaim;

    // Notify requesting user of rejection
    try {
      await ctx.api.sendMessage(
        claim.requestingUserId,
        `❌ *Business Claim Request Rejected*\n\n` +
        `Your claim request for *${claim.businessName}* (${claim.whatsapp}) was not approved by the admin.\n\n` +
        `If you believe this was in error, please verify that you registered with the exact WhatsApp number or contact support.`,
        { parse_mode: 'Markdown' }
      );
    } catch (notifyErr: any) {
      console.warn(`[User Notify Notice] Could not send Telegram rejection message to user ${claim.requestingUserId}:`, notifyErr?.message || notifyErr);
    }

    await ctx.reply(
      `🚫 *Claim Request Rejected*\n\n` +
      `The claim request for *${claim.businessName}* (${claim.whatsapp}) submitted by Telegram ID \`${claim.requestingUserId}\` has been rejected.`,
      { parse_mode: 'Markdown' }
    );
  });

  // Admin Command: /pendingclaims or /claims
  bot.command(['pendingclaims', 'claims'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const adminId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;

    if (adminId && String(userId) !== String(adminId)) {
      await ctx.reply('⚠️ *Access Denied*: This command is restricted to bot administrators.', { parse_mode: 'Markdown' });
      return;
    }

    const pendingList = sheetsDb.getPendingClaims();
    if (pendingList.length === 0) {
      await ctx.reply('ℹ️ There are no pending business claim requests.');
      return;
    }

    const formatted = pendingList.map((c, i) =>
      `${i + 1}. 🏬 *${c.businessName}*\n   📱 WhatsApp: \`${c.whatsapp}\`\n   👤 Requested By: ${c.requestingUsername} (ID: \`${c.requestingUserId}\`)\n   ⏰ Requested: ${new Date(c.timestamp).toLocaleString()}`
    ).join('\n\n');

    await ctx.reply(
      `📋 *Pending Business Claim Requests (${pendingList.length}):*\n\n${formatted}\n\n` +
      `• Approve: \`/approveclaim [Business Name or WhatsApp]\`\n` +
      `• Reject: \`/rejectclaim [Business Name or WhatsApp]\``,
      { parse_mode: 'Markdown' }
    );
  });

  // Merchant Floate Credit Wallet & Top-Up: /wallet, /mywallet, /credits, /balance, /topup, /buycredits
  bot.command(['wallet', 'mywallet', 'credits', 'balance', 'topup', 'buycredits', 'recharge'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    const listings = sheetsDb.getBusinessListingsForUser(userId);
    const profile = userStore.getProfile(userId, username);
    const phone = profile.businessWhatsapp || listings[0]?.whatsapp || '';
    const merchantId = phone || listings[0]?.id || String(userId);

    const merchant = await firestoreDb.getMerchant(merchantId);
    const stats = await firestoreDb.getMerchantStats(merchantId);
    const balance = stats.balance ?? merchant?.credit_balance ?? 25;
    const leadsLeft = Math.floor(balance / 5);
    const status = merchant?.status || (balance >= 5 ? 'ACTIVE' : 'INACTIVE');
    const bizName = merchant?.businessName || profile.businessName || listings[0]?.businessName || 'Your Store';

    const topupKb = new InlineKeyboard()
      .text('💳 ₦1,000 (25 Credits • 5 Cust)', 'topup_pkg_pkg_5')
      .row()
      .text('💳 ₦2,000 (50 Credits • 10 Cust)', 'topup_pkg_pkg_10')
      .row()
      .text('💳 ₦5,000 (125 Credits • 25 Cust)', 'topup_pkg_pkg_25')
      .row()
      .text('💳 ₦10,000 (275 Credits • 55 Cust +10%)', 'topup_pkg_pkg_55')
      .row()
      .text('💳 ₦20,000 (575 Credits • 115 Cust +15%)', 'topup_pkg_pkg_115')
      .row()
      .text('✏️ Custom Amount (Min ₦1,000)', 'topup_custom');

    await ctx.reply(
      `⚡ *Floate Merchant Credit Wallet*\n` +
      `─────────────────────────\n` +
      `🏬 *Store:* ${bizName}\n` +
      `💰 *Credit Balance:* *${balance} Floate Credits* (~${leadsLeft} Customers)\n` +
      `⚡ *Search Visibility Status:* ${status === 'ACTIVE' ? '🟢 ACTIVE (Visible in Search)' : '🔴 INACTIVE (Low Credits - Hidden from Search)'}\n\n` +
      `Floate Credits connect qualified buyers directly to your WhatsApp (*5 Credits = 1 Customer Lead*).\n\n` +
      `💡 *Flexible Pricing & Top-Up:*\n` +
      `• Rate: ₦200 per customer connection (5 Floate Credits)\n` +
      `• +10% bonus on ₦10,000+ | +15% bonus on ₦20,000+\n\n` +
      `Choose a package below or enter a custom amount:`,
      {
        parse_mode: 'Markdown',
        reply_markup: topupKb,
      }
    );
  });

  // /addproduct conversational command
  bot.command(['addproduct', 'additem'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await startAddProductFlow(ctx, userId);
  });

  // /editproduct command
  bot.command(['editproduct', 'edit'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await startEditProductFlow(ctx, userId);
  });

  // /mylistings /myproducts command
  bot.command(['mylistings', 'myproducts', 'catalog'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await showMyListings(ctx, userId);
  });

  // /updatewhatsapp /editnumber command
  bot.command(['updatewhatsapp', 'editnumber', 'whatsapp'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await startUpdateWhatsappFlow(ctx, userId);
  });

  // /deletebusiness command
  bot.command(['deletebusiness', 'removebusiness', 'delete'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await startDeleteBusinessFlow(ctx, userId);
  });

  // /mystats command
  bot.command(['mystats', 'stats', 'analytics'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    await showMyStatsFlow(ctx, userId);
  });

  // /location command for buyer primary location
  bot.command(['location', 'setlocation', 'changelocation', 'mylocation'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    const matchParam = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (matchParam) {
      await firestoreDb.updateBuyerPrimaryLocation(userId, matchParam);
      await replySafe(
        ctx,
        `📍 *Primary Location Updated!*\n\n` +
        `Your default shopping location is now set to *${escapeMarkdownText(matchParam)}*.\n` +
        `Floate will prioritize verified businesses near you for future searches.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const buyer = await firestoreDb.getOrCreateBuyerAccount(userId, 'telegram', username);
    const currentLoc = buyer.primaryLocation ? `*${escapeMarkdownText(buyer.primaryLocation)}*` : '_Not set yet_';

    await replySafe(
      ctx,
      `📍 *Your Default Shopping Location:* ${currentLoc}\n\n` +
      `To update your location, type:\n\`/location [Your City or Area]\`\n\n` +
      `_(Example: \`/location Onitsha\` or \`/location Ikeja, Lagos\`)_`,
      { parse_mode: 'Markdown' }
    );
  });

  // /role command to switch or view roles
  bot.command('role', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);
    const profile = userStore.getProfile(userId, username);

    const keyboard = new InlineKeyboard()
      .text('🏢 Business Owner / Seller', 'role_business')
      .text('🛍️ Buyer / Customer', 'role_buyer');

    await ctx.reply(
      `⚙️ *Floate AI Account Mode*\n\n` +
      `• *Current Mode:* ${profile.role === 'BUSINESS' || isRegisteredBusiness(userId) ? '🏢 Business / Seller' : '🛍️ Buyer / Customer'}\n\n` +
      `Select an option below:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // Direct /business or /menu command
  bot.command(['business', 'menu'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    userStore.setRole(userId, 'BUSINESS', username);
    await sheetsDb.logInteraction(userId, username, 'ROLE_SET', 'BUSINESS');

    await ctx.reply(
      `🏢 *Floate AI Business Menu*\n\n` +
      `Use the buttons below or type commands to manage your store:\n\n` +
      `• /register: Register your business\n` +
      `• /addproduct: Add a product to your store\n` +
      `• /editproduct: Edit or remove products\n` +
      `• /editnumber: Update WhatsApp contact number\n` +
      `• /mystats: View store stats and views\n` +
      `• /deletebusiness: Delete your business listing\n` +
      `• /cancel: Cancel any active flow`,
      {
        parse_mode: 'Markdown',
        reply_markup: getBusinessReplyKeyboard(),
      }
    );
  });

  // Direct /buyer command
  bot.command('buyer', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    userStore.setRole(userId, 'BUYER', username);
    userStore.clearFlowState(userId);
    await sheetsDb.logInteraction(userId, username, 'ROLE_SET', 'BUYER');

    await ctx.reply(
      `🛍️ *Switched to Buyer Mode!*\n\n` +
      `Simply type or send a voice note describing what you want to buy (e.g. \`I want leather slippers, 5k, Onitsha\`).`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      }
    );
  });

  // /cancel command to abort any active flow gracefully
  bot.command(['cancel', 'stop', 'reset', 'exit', 'quit', 'back'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const currentStep = userStore.getProfile(userId).registrationStep;
    userStore.clearFlowState(userId);

    const isBiz = isRegisteredBusiness(userId);

    if (isBiz) {
      const listings = sheetsDb.getBusinessListingsForUser(userId);
      const storeName = listings[0]?.businessName || 'Your Store';
      await ctx.reply(
        `No worries at all! We've saved your place and returned you to your **${storeName}** dashboard. 😊\n\n` +
        `Whenever you'd like to add new products, adjust pricing, or check your buyer search stats, your store controls are right below!`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      return;
    }

    let contextualNote = "Whenever you're ready to register your store or explore products, we're right here to support you.";
    if (currentStep === 'AWAITING_CLAIM_PHONE' || currentStep === 'AWAITING_CLAIM_OWNER_NAME' || currentStep === 'AWAITING_CLAIM_SELFIE') {
      contextualNote = "Whenever you're ready to connect and claim your store, just type /claim anytime.";
    } else if (currentStep && currentStep !== 'NONE') {
      contextualNote = "You can jump right back into setting up your store anytime by typing /register.";
    }

    await ctx.reply(
      `No problem at all! We've paused and cleared your active session. 😊\n\n` +
      `${contextualNote}\n\n` +
      `💡 *Helpful options:*\n` +
      `• Type \`/register\` to list your business and reach buyers\n` +
      `• Type \`/claim\` to link an existing store\n` +
      `• Or simply type any item you want to buy (e.g. "shoes in Lagos")`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      }
    );
  });

  // /help command
  bot.command('help', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    statsManager.recordUpdate(userId);
    statsManager.recordCommand('help');

    if (isRegisteredBusiness(userId)) {
      await ctx.reply(
        `💡 *Floate AI Business Merchant Commands*\n\n` +
        `• \`/addproduct\`: Add a new item to your store\n` +
        `• \`/editproduct\`: Change or delete an existing item\n` +
        `• \`/editnumber\`: Update your WhatsApp contact number\n` +
        `• \`/mystats\`: View search appearances and store stats\n` +
        `• \`/deletebusiness\`: Remove your business listing\n` +
        `• \`/cancel\`: Exit any active conversation flow\n` +
        `• \`/menu\`: Display business menu keyboard\n\n` +
        `_Note: You can also type any search query to test how buyers find your products!_`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      return;
    }

    await ctx.reply(
      `💡 *How to search on Floate AI*\n\n` +
      `Simply type or send a voice note with what you need!\n` +
      `• *Example:* "I want leather slippers, 5k, Onitsha"\n` +
      `• *Voice Notes:* Speak in English, Pidgin, Yoruba, or Igbo!\n\n` +
      `*Commands:*\n` +
      `• \`/register\`: Set up your business for free and reach buyers!\n` +
      `• \`/start\`: Restart welcome guide\n` +
      `• \`/cancel\`: Clear active prompt`,
      { parse_mode: 'Markdown' }
    );
  });

  // /status command
  bot.command('status', async (ctx: Context) => {
    statsManager.recordUpdate(ctx.from?.id);
    statsManager.recordCommand('status');

    const stats = statsManager.getStats();
    await ctx.reply(
      `⚡ *Floate AI Network Status*\n\n` +
      `🟢 *Status:* Online & Processing Requests\n` +
      `📩 *Queries Handled:* ${stats.updatesProcessed}\n` +
      `👥 *Connected Buyers & Sellers:* ${stats.activeUsersCount}`,
      { parse_mode: 'Markdown' }
    );
  });

  // /ai command
  bot.command('ai', async (ctx: Context) => {
    statsManager.recordUpdate(ctx.from?.id);
    statsManager.recordCommand('ai');

    const match = ctx.match;
    if (!match || typeof match !== 'string' || !match.trim()) {
      await ctx.reply('💡 Ask Floate AI a question. Example:\n`/ai Where can I buy wholesale shoes in Aba?`', { parse_mode: 'Markdown' });
      return;
    }

    await ctx.replyWithChatAction('typing');
    const response = await generateAiReply(match.trim());
    await ctx.reply(response);
  });

  // /sendreminders command to trigger morning update reminders manually
  bot.command(['sendreminders', 'remind'], async (ctx: Context) => {
    statsManager.recordUpdate(ctx.from?.id);
    await ctx.reply('☀️ *Sending morning update reminders to registered businesses...*', { parse_mode: 'Markdown' });
    const result = await reminderService.sendMorningReminders(ctx.api as any);
    await ctx.reply(`✅ *Morning Reminders Sent!*\n\n• Sent: ${result.sentCount}\n• Skipped/Failed: ${result.failedCount}`, { parse_mode: 'Markdown' });
  });

  // Admin Manual Review Commands (/approvereg and /rejectreg)
  bot.command('approvereg', async (ctx: Context) => {
    const fromId = String(ctx.from?.id || '');
    const adminTelegramId = String(process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId || '');
    if (adminTelegramId && fromId !== adminTelegramId) {
      await ctx.reply('⛔ Unauthorized. This command is restricted to Floate admins.');
      return;
    }

    const targetKey = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (!targetKey) {
      await ctx.reply('⚠️ Usage: `/approvereg <phone_or_merchant_id>`', { parse_mode: 'Markdown' });
      return;
    }

    const pending = await firestoreDb.getPendingReviewMerchant(targetKey);
    if (!pending) {
      await ctx.reply(`⚠️ No pending registration found for "${targetKey}".`);
      return;
    }

    await firestoreDb.updatePendingReviewStatus(targetKey, 'APPROVED');
    try {
      await sheetsDb.registerBusiness({
        userId: pending.userId || pending.whatsapp,
        businessName: pending.businessName,
        ownerFullName: pending.ownerFullName,
        whatsapp: pending.whatsapp,
        state: pending.state || 'Anambra',
        city: pending.city || 'Onitsha',
        listingType: (pending.listingType as any) || 'Product',
        category: pending.category || 'General',
        product: pending.product || 'General Goods',
        price: pending.price || 'Market Rate',
        negotiation: (pending.negotiation as any) || 'Yes',
      });
    } catch (e) {
      console.warn('[Admin Approve Sync Error]:', e);
    }

    const approvalMsg =
      `🎉 *Good news! Your business listing has been approved!* 🎉\n\n` +
      `🏬 *Business:* ${pending.businessName}\n` +
      `📦 *Item:* ${pending.product}\n` +
      `📍 *Location:* ${pending.city}, ${pending.state}\n\n` +
      `Your store is now officially live on Floate AI! Buyers can now search and message you directly on WhatsApp. 🚀`;

    if (pending.telegramId) {
      try {
        await ctx.api.sendMessage(pending.telegramId, approvalMsg, {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        });
      } catch (tgErr) {}
    }

    if (pending.whatsapp) {
      try {
        const { sendWhatsAppMessage } = await import('../services/whatsappService.js');
        await sendWhatsAppMessage(pending.whatsapp, approvalMsg);
      } catch (waErr) {}
    }

    await ctx.reply(`✅ *Approved:* Business "${pending.businessName}" (${pending.whatsapp}) is now live on Floate AI!`, { parse_mode: 'Markdown' });
  });

  bot.command('rejectreg', async (ctx: Context) => {
    const fromId = String(ctx.from?.id || '');
    const adminTelegramId = String(process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId || '');
    if (adminTelegramId && fromId !== adminTelegramId) {
      await ctx.reply('⛔ Unauthorized. This command is restricted to Floate admins.');
      return;
    }

    const targetKey = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (!targetKey) {
      await ctx.reply('⚠️ Usage: `/rejectreg <phone_or_merchant_id>`', { parse_mode: 'Markdown' });
      return;
    }

    const pending = await firestoreDb.getPendingReviewMerchant(targetKey);
    if (!pending) {
      await ctx.reply(`⚠️ No pending registration found for "${targetKey}".`);
      return;
    }

    await firestoreDb.updatePendingReviewStatus(targetKey, 'REJECTED');

    const rejectMsg =
      `❌ *Registration Notice*\n\n` +
      `Your registration for "${pending.businessName}" could not be approved as it falls outside Floate's permitted business categories.`;

    if (pending.telegramId) {
      try {
        await ctx.api.sendMessage(pending.telegramId, rejectMsg, { parse_mode: 'Markdown' });
      } catch (tgErr) {}
    }

    if (pending.whatsapp) {
      try {
        const { sendWhatsAppMessage } = await import('../services/whatsappService.js');
        await sendWhatsAppMessage(pending.whatsapp, rejectMsg);
      } catch (waErr) {}
    }

    await ctx.reply(`❌ *Rejected:* Registration for "${pending.businessName}" (${pending.whatsapp}) was rejected.`, { parse_mode: 'Markdown' });
  });

  // -------------------------------------------------------------
  // SUPER ADMIN TELEMETRY & DASHBOARD COMMANDS (Telegram Bot)
  // -------------------------------------------------------------
  bot.command(['admin', 'stats', 'dashboard', 'metrics'], async (ctx: Context) => {
    const fromId = String(ctx.from?.id || '');
    const adminTelegramId = String(process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId || '');
    const matchParam = typeof ctx.match === 'string' ? ctx.match.trim() : '';

    const isAuthorized = (adminTelegramId && fromId === adminTelegramId) || matchParam === '7700' || matchParam === 'floate' || !adminTelegramId;
    if (adminTelegramId && !isAuthorized) {
      await ctx.reply('🔒 *Floate Admin Security*\n\nProvide the admin passkey to view telemetry:\n`/admin 7700`', { parse_mode: 'Markdown' });
      return;
    }

    const summary = await firestoreDb.getAdminMetricsSummary();
    const adminKb = new InlineKeyboard()
      .text('🔄 Refresh Stats', 'cmd_admin_refresh')
      .text('📦 Recent Deals', 'cmd_admin_deals')
      .row()
      .text('🤝 Link-Ups', 'cmd_admin_relays')
      .text('🏪 Top Stores', 'cmd_admin_stores');

    const briefingText =
      `📊 *FLOATE SUPER ADMIN EXECUTIVE BRIEFING* 🚀\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Total Processed GMV:* ₦${summary.totalGmvProcessed.toLocaleString()}\n` +
      `📦 *Concluded SafePay Deals:* ${summary.concludedDeals} completed\n` +
      `🛡️ *Active In-Escrow Funds:* ₦${summary.totalGmvInPipeline.toLocaleString()} (${summary.activeEscrowDeals} in pipeline)\n` +
      `🤝 *Buyer-Vendor Link-Ups:* ${summary.totalLinkUps} total (${summary.activeRelays} active live chats)\n` +
      `🏪 *Registered Businesses:* ${summary.registeredBusinesses} stores (${summary.verifiedBusinesses} verified)\n` +
      `👥 *Registered Buyers:* ${summary.registeredBuyers} buyers\n` +
      `💵 *Platform Escrow Earnings:* ₦${summary.totalPlatformRevenue.toLocaleString()}\n` +
      `🛍️ *Total Products Listed:* ${summary.totalCatalogProducts} items\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ *Snapshot Time:* ${new Date().toLocaleTimeString()} (UTC)\n` +
      `🌐 *Web Dashboard:* View live charts on App Preview`;

    await ctx.reply(briefingText, {
      parse_mode: 'Markdown',
      reply_markup: adminKb,
    });
  });

  bot.command('deals', async (ctx: Context) => {
    const summary = await firestoreDb.getAdminMetricsSummary();
    const recent = summary.recentDeals.slice(0, 8);
    if (recent.length === 0) {
      await ctx.reply('📦 *No SafePay deals recorded yet.*', { parse_mode: 'Markdown' });
      return;
    }
    let msg = `📦 *RECENT SAFEPAY ESCROW DEALS (Top ${recent.length})*\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    recent.forEach((d, idx) => {
      msg += `${idx + 1}️⃣ *Ref:* \`${d.escrowRef}\` | *Status:* ${d.status}\n📦 *Item:* ${d.item}\n💰 *Price:* ${d.price} | 👤 Buyer: +${d.buyerPhone}\n🏪 Seller: ${d.vendorName}\n🔑 Delivery PIN: \`${d.deliveryCode || 'N/A'}\`\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('links', async (ctx: Context) => {
    const summary = await firestoreDb.getAdminMetricsSummary();
    const recent = summary.recentRelays.slice(0, 8);
    if (recent.length === 0) {
      await ctx.reply('🤝 *No Buyer-to-Vendor Link-Ups recorded yet.*', { parse_mode: 'Markdown' });
      return;
    }
    let msg = `🤝 *RECENT BUYER-VENDOR LINK-UPS (Top ${recent.length})*\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    recent.forEach((r, idx) => {
      msg += `${idx + 1}️⃣ *Item:* ${r.item}\n👤 Buyer: +${r.buyerPhone} ↔️ 🏪 Seller: +${r.vendorPhone}\n💬 Messages: ${r.messageCount || 0} | 🏷️ Status: ${r.status}\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });
}

export async function sendWelcomeMessage(ctx: Context) {
  const userId = ctx.from?.id || 0;
  const username = ctx.from?.first_name || 'User';

  if (isRegisteredBusiness(userId)) {
    const listings = sheetsDb.getBusinessListingsForUser(userId);
    const bizName = listings[0]?.businessName || userStore.getProfile(userId).businessName || 'Your Business';
    await ctx.reply(
      `🏪 *Welcome back to ${bizName} on Floate AI!* 👋\n\n` +
      `Your store is live and buyers searching across Nigeria can find your products.\n\n` +
      `Use the business menu below to add products, edit items, or manage your store:`,
      {
        parse_mode: 'Markdown',
        reply_markup: getBusinessReplyKeyboard(),
      }
    );
    return;
  }

  const welcomeKeyboard = new InlineKeyboard()
    .text('🛍️ Search Sellers', 'cmd_prompt_search')
    .text('🏢 Register Business', 'cmd_start_register')
    .row()
    .text('💬 Ask Floate AI Assistant', 'cmd_ask_ai');

  await ctx.reply(
    `Welcome to Floate AI 👋\n\n` +
    `Looking for something to buy? Just tell me what you want, you can type it or send a voice note. No commands needed!\n\n` +
    `Example: "I want leather slippers, 5k, Onitsha"\n\n` +
    `Have a business? Type /register to list your products for free and get found by buyers searching right now.`,
    {
      parse_mode: 'Markdown',
      reply_markup: welcomeKeyboard,
    }
  );
}

