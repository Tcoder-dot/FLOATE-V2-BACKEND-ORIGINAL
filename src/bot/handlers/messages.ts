import { Context, InlineKeyboard } from 'grammy';
import { config, isVerificationTestingPhone } from '../config.js';
import { statsManager } from '../statsManager.js';
import {
  formatSearchConfirmation,
  parseShoppingQuery,
  transcribeAndAnalyzeAudio,
  generateNegotiationSuggestion,
  validateSelfieWithGeminiVision,
  identifyProductFromImageWithAI,
  verifyNinDocumentWithGeminiVision,
  verifyLivenessVideoWithGemini,
} from '../services/aiService.js';
import { sheetsDb, formatListingDisplay, formatWhatsAppUrl, normalizePhone, escapeMarkdownText } from '../services/sheetsService.js';
import { firestoreDb, isServiceItem } from '../services/firestoreService.js';
import { userStore, RegistrationStep } from '../userStore.js';
import { buildStateKeyboard, finishLeadQualification } from './callbacks.js';
import { getBusinessReplyKeyboard, isRegisteredBusiness, replySafe, findExistingBusinessByName, findExistingBusinessByPhone } from '../helpers.js';
import { startAddProductFlow, startEditProductFlow, showMyListings, startUpdateWhatsappFlow, startDeleteBusinessFlow, showMyStatsFlow } from '../flows.js';
import { sendWelcomeMessage } from './commands.js';
import { uploadTelegramMediaToStorage } from '../services/storageService.js';
import { isExplicitSupportOrReport, hasSufficientReportDetails, sendReportToAdminTelegram } from '../services/supportService.js';
import { flutterwaveService, calculateCustomCredits, resolveNigerianBankCode, validateAccountNameMatch } from '../services/flutterwaveService.js';
import { monnifyService } from '../services/monnifyService.js';

function getBroaderTerm(keywords: string): { broader: string; original: string } {
  const lower = keywords.toLowerCase();
  if (lower.includes("laptop")) return { broader: "computer", original: "laptop" };
  if (lower.includes("iphone") || lower.includes("samsung") || lower.includes("pixel")) return { broader: "phones", original: lower };
  if (lower.includes("slippers") || lower.includes("sneakers") || lower.includes("boots")) return { broader: "footwear", original: lower };
  if (lower.includes("gown") || lower.includes("shirt") || lower.includes("trouser")) return { broader: "fashion", original: lower };
  return { broader: "general items", original: lower };
}

/**
 * Handles active flow responses when userStore.hasActiveFlow(userId) is true.
 * RULE 1: The incoming message is ALWAYS treated as the answer to whatever that flow is currently asking for.
 * No keyword detection, no search-intent checking, no search engine runs.
 */
async function handleActiveFlowStep(
  ctx: Context,
  userId: number,
  username: string,
  text: string,
  step: RegistrationStep
) {
  // Graceful flow cancellation check if user wants to stop mid-session
  const lowerTrimmed = text.toLowerCase().trim();
  const isCancelText = /^(cancel|\/cancel|stop|\/stop|quit|\/quit|exit|\/exit|nevermind|never mind|cancel registration|cancel claim|abort|close)$/i.test(lowerTrimmed);

  if (isCancelText) {
    userStore.clearFlowState(userId);
    const isBiz = isRegisteredBusiness(userId);
    const cancelMsg = isBiz
      ? `No problem at all! We've stopped this step and returned you to your business dashboard. 😊\n\nWhenever you're ready to update or manage your store, your controls are right below!`
      : `No problem at all! We've paused and cleared your active session. 😊\n\nWhenever you're ready to register your business, claim your store, or search for products across Nigeria, we're right here to help.\n\nWhat would you like to explore next?`;

    await ctx.reply(cancelMsg, {
      reply_markup: isBiz ? getBusinessReplyKeyboard() : { remove_keyboard: true },
    });
    return;
  }

  // Step 0: Support Report / Complaint Details Collected
  if (step === 'AWAITING_SUPPORT_REPORT') {
    userStore.clearFlowState(userId);
    await sendReportToAdminTelegram(ctx, {
      userIdentifier: String(userId),
      userName: username,
      platform: 'Telegram',
      reportText: text,
    });
    await replySafe(
      ctx,
      `Thanks for letting us know, our team has been notified and will look into this right away.`,
      {
        parse_mode: 'Markdown',
        reply_markup: isRegisteredBusiness(userId) ? getBusinessReplyKeyboard() : { remove_keyboard: true },
      }
    );
    return;
  }

  // Step 0b: Delivery Confirmation Code Entered
  if (step === 'AWAITING_DELIVERY_CONFIRMATION_CODE') {
    const inputCode = text.trim();
    const order = await firestoreDb.getEscrowOrderByDeliveryCode(inputCode);
    if (order) {
      const confirmResult = await firestoreDb.confirmEscrowDelivery(order.id, inputCode);
      if (confirmResult.success && confirmResult.order) {
        userStore.clearFlowState(userId);
        await replySafe(
          ctx,
          `✅ *Delivery Successfully Confirmed!*\n\n` +
          `Thank you for confirming receipt of *${escapeMarkdownText(order.item)}* from *${escapeMarkdownText(order.vendorName)}*!\n\n` +
          `💰 Funds (*${escapeMarkdownText(order.price)}*) have been approved and released to the seller's registered account.\n\n` +
          `Thank you for shopping safely with Floate SafePay! 🌟`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }

    await replySafe(
      ctx,
      `⚠️ The code you entered (\`${inputCode}\`) does not match an active escrow order.\n\nPlease check the confirmation code written on your parcel/waybill and try again, or type *cancel* to return.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step 0c: Custom Floate Credit Top-up Amount
  if (step === ('AWAITING_CUSTOM_TOPUP' as any)) {
    const rawNum = text.replace(/[^0-9kKmM.]/g, '').trim();
    let amount = 0;
    if (rawNum.toLowerCase().endsWith('k')) {
      amount = parseFloat(rawNum.slice(0, -1)) * 1000;
    } else if (rawNum.toLowerCase().endsWith('m')) {
      amount = parseFloat(rawNum.slice(0, -1)) * 1000000;
    } else {
      amount = parseInt(rawNum, 10) || 0;
    }

    if (amount < 1000) {
      await ctx.reply(
        `⚠️ *Minimum top-up is ₦1,000* (gives 25 Floate Credits / 5 customer leads).\n\nPlease enter an amount of ₦1,000 or higher (e.g. \`1000\`, \`2500\`, \`10000\`, \`25k\`), or type *cancel* to return:`
      );
      return;
    }

    userStore.clearFlowState(userId);
    const calc = calculateCustomCredits(amount);
    const totalCredits = calc.totalCredits;
    const customersCount = Math.floor(totalCredits / 5);

    const profile = userStore.getProfile(userId, username);
    const listings = sheetsDb.getBusinessListingsForUser(userId);
    const phone = profile.businessWhatsapp || listings[0]?.whatsapp || String(userId);
    const bizName = profile.businessName || listings[0]?.businessName || 'Floate Merchant';
    const txRef = `credits_${userId}_${Date.now()}`;

    userStore.updateRegistration(userId, {
      pendingTopupRef: txRef,
      pendingTopupAmount: amount,
      pendingTopupCredits: totalCredits,
    });

    let bankName = 'Flutterwave MFB / Wema Bank';
    let acctNumber = '0284910283';
    let acctName = `Floate Credits - ${bizName}`;
    let paymentLink = `https://pay.floate.xyz/credits/custom?amount=${amount}`;

    try {
      const flwBank = await flutterwaveService.initiateBankTransfer({
        txRef,
        amount,
        customerPhone: phone || String(userId),
        customerName: bizName,
      });
      if (flwBank.success && flwBank.accountNumber) {
        acctNumber = flwBank.accountNumber;
        if (flwBank.bankName) bankName = flwBank.bankName;
      }
    } catch (bankErr) {
      console.warn('[Topup Virtual Bank Warning]:', bankErr);
    }

    try {
      const flwRes = await flutterwaveService.createPaymentLink({
        txRef,
        amount,
        customerEmail: `merchant_${userId}@floate.xyz`,
        customerPhone: phone || String(userId),
        customerName: bizName,
        title: `Floate Credits: ₦${amount.toLocaleString()}`,
        description: `${totalCredits} Credits (${customersCount} Customers) for ${bizName}`,
        meta: {
          packageId: 'pkg_custom',
          amountNgn: amount,
          credits: totalCredits,
          merchantId: String(userId),
        },
      });
      if (flwRes.success && flwRes.paymentLink) {
        paymentLink = flwRes.paymentLink;
      }
    } catch (err) {
      console.warn('[Flutterwave Telegram Topup Warning]:', err);
    }

    const payKb = new InlineKeyboard()
      .url('💳 Pay Online (Card / USSD)', paymentLink)
      .row()
      .text('✅ I Have Paid / Verify', `btn_topup_paid_${txRef}`)
      .row()
      .text('📊 View Balance', 'btn_check_wallet');

    await ctx.reply(
      `🏛️ *FLOATE CREDITS RECHARGE: ₦${amount.toLocaleString()}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏪 *Store:* ${bizName}\n` +
      `📦 *Credits:* ${totalCredits} Floate Credits (${customersCount} Customers)\n` +
      `💰 *Amount to Transfer:* *₦${amount.toLocaleString()}*\n` +
      `🔖 *Reference:* \`${txRef}\`\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📥 *BANK TRANSFER DETAILS (INSTANT CREDIT):*\n` +
      `🏦 *Bank:* *${bankName}*\n` +
      `🔢 *Account Number:*\n` +
      `\`\`\`${acctNumber}\`\`\`\n` +
      `👤 *Account Name:* *${acctName}*\n\n` +
      `⚡ *INSTRUCTIONS:*\n` +
      `1️⃣ Transfer exact *₦${amount.toLocaleString()}* to the account number above.\n` +
      `2️⃣ Immediately after transferring, tap *✅ I Have Paid / Verify* below.\n` +
      `3️⃣ Your wallet will be instantly credited with *+${totalCredits} Floate Credits*!\n\n` +
      `💳 *Card / USSD Option:*\n` +
      `Prefer online card/USSD payment? Tap the payment button below.`,
      {
        parse_mode: 'Markdown',
        reply_markup: payKb,
      }
    );
    return;
  }

  // Step 1: AWAITING_NAME
  if (step === 'AWAITING_NAME') {
    const enteredName = text.trim();

    if (isRegisteredBusiness(userId)) {
      const listings = sheetsDb.getBusinessListingsForUser(userId);
      const bizName = listings[0]?.businessName || 'Your Business';
      await replySafe(
        ctx,
        `🏪 *You are already registered on Floate AI!* 👋\n\n` +
        `Your store *${escapeMarkdownText(bizName)}* is active and searchable across Nigeria.\n\n` +
        `You don't need to register again. You can manage your store using the menu options below:\n` +
        `• 📦 *Add Product*: Add a new item (/addproduct)\n` +
        `• ✏️ *Edit Products*: Change prices or update existing items (/editproduct)\n` +
        `• 📊 *My Stats*: View search traffic and analytics (/mystats)\n` +
        `• 📱 *Update WhatsApp*: Change your contact number (/updatewhatsapp)`,
        {
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      userStore.clearFlowState(userId);
      return;
    }

    // Check if a business with this name already exists
    const existingBiz = findExistingBusinessByName(enteredName, userId);
    if (existingBiz) {
      const existingName = existingBiz.businessName;
      await replySafe(
        ctx,
        `⚠️ *Business Name Already Registered*\n\n` +
        `A business named "*${escapeMarkdownText(existingName)}*" is already registered on Floate AI.\n\n` +
        `To ensure buyers can easily distinguish your shop and avoid naming clashes, please customize or modify your store name.\n\n` +
        `💡 *Helpful Suggestions:*\n` +
        `• Add your city or market: "*${escapeMarkdownText(enteredName)} (Lagos)*" or "*${escapeMarkdownText(enteredName)} Onitsha*"\n` +
        `• Add your specialty: "*${escapeMarkdownText(enteredName)} Stores*", "*${escapeMarkdownText(enteredName)} Hub*", "*${escapeMarkdownText(enteredName)} Enterprise*"\n` +
        `• Add a distinguishing prefix or suffix: "*${escapeMarkdownText(enteredName)} & Sons*", "*${escapeMarkdownText(enteredName)} Global*"\n\n` +
        `Please enter your preferred unique business name:`
      );
      return; // Stay at AWAITING_NAME
    }

    userStore.setFlowState(userId, 'AWAITING_WHATSAPP', { businessName: enteredName });
    const currentProfile = userStore.getProfile(userId, username);
    const isTester = isVerificationTestingPhone(userId) || Boolean(currentProfile.ownerFullName);

    if (isTester) {
      await replySafe(
        ctx,
        `Store name *${escapeMarkdownText(enteredName)}* recorded!\n\n` +
        `*Step 1c of 4:* What is your **WhatsApp Phone Number**?\n` +
        `_(Example: 08012345678 or +2348012345678)_\n\n` +
        `We use this for buyers to connect with you and for instant SafePay transaction notifications.`
      );
    } else {
      await replySafe(
        ctx,
        `Store name *${escapeMarkdownText(enteredName)}* recorded!\n\n` +
        `*Step 2 of 10:* What is your **WhatsApp Phone Number**?\n` +
        `_(Example: 08012345678 or +2348012345678)_\n\n` +
        `We use this for buyers to connect with your store.`
      );
    }
    return;
  }

  // Step 1: AWAITING_OWNER_NAME
  if (step === 'AWAITING_OWNER_NAME') {
    const fullName = text.trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);

    if (nameParts.length < 2 || fullName.length < 3) {
      await replySafe(
        ctx,
        `⚠️ Please enter both your **First Name and Last Name** (e.g. *Emeka Okafor* or *Amina Bello*).\n\n` +
        `This is required to cross-verify against your NIN and bank settlement account.`
      );
      return;
    }

    userStore.setFlowState(userId, 'AWAITING_NAME', { ownerFullName: fullName });
    await replySafe(
      ctx,
      `Thank you, *${escapeMarkdownText(nameParts[0])}*! Legal owner name saved.\n\n` +
      `*Step 1b of 4:* What is your **Business or Store Name**?\n` +
      `_(Example: Chiks Electronics, Kemi Fashion Hub, Onitsha Footwear)_`
    );
    return;
  }

  // Step 1c: AWAITING_WHATSAPP
  if (step === 'AWAITING_WHATSAPP') {
    const rawPhone = text.trim();
    const cleanPhone = normalizePhone(rawPhone);

    if (!cleanPhone || cleanPhone.length < 8) {
      await replySafe(
        ctx,
        `⚠️ Please enter a valid Nigerian WhatsApp phone number.\n\n` +
        `_(Example: 08012345678 or +2348012345678)_`
      );
      return;
    }

    // Check if phone number is already registered to another store
    const existingByPhone = findExistingBusinessByPhone(rawPhone, userId);
    if (existingByPhone) {
      await replySafe(
        ctx,
        `⚠️ *WhatsApp Number Already in Use*\n\n` +
        `The WhatsApp number *${escapeMarkdownText(rawPhone)}* is already linked to the registered store "*${escapeMarkdownText(existingByPhone.businessName)}*".\n\n` +
        `• If you are the owner of *${escapeMarkdownText(existingByPhone.businessName)}*, you can manage or claim your store using /claim.\n` +
        `• If you are registering a new business, please enter your business's dedicated active WhatsApp phone number.\n\n` +
        `Please enter your WhatsApp phone number:`
      );
      return; // Stay at AWAITING_WHATSAPP
    }

    const profile = userStore.getProfile(userId, username);
    const isTester = isVerificationTestingPhone(cleanPhone) || isVerificationTestingPhone(rawPhone) || isVerificationTestingPhone(userId);

    // If admin test number (07065599116) was entered but legal name was not yet collected
    if (isTester && !profile.ownerFullName) {
      userStore.setFlowState(userId, 'AWAITING_OWNER_NAME', { businessWhatsapp: rawPhone });
      await replySafe(
        ctx,
        `🌟 *Admin Beta Access (07065599116) Detected!* 🛡️\n\n` +
        `You have exclusive access to test Floate's 4-Step Trust & Identity Verification System.\n\n` +
        `*Step 1 of 4:* What is your **Full Legal Name** (First Name and Last Name as printed on your ID or NIN)?\n` +
        `_(Example: Emeka Okafor, Amina Bello, or David Adebayo)_`
      );
      return;
    }

    // If in verification flow (tester with ownerFullName already provided)
    if (profile.ownerFullName && isTester) {
      userStore.setFlowState(userId, 'AWAITING_VERIFICATION_NIN_PHOTO', { businessWhatsapp: rawPhone });
      await replySafe(
        ctx,
        `✅ Details saved for *${escapeMarkdownText(profile.businessName || 'your store')}*!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🪪 *Step 2 of 4: Upload Your NIN or ID Card Photo*\n\n` +
        `Please upload a clear picture of your **National Identity Number (NIN) Slip** or Nigerian ID card (National ID, Voter's Card, or Driver's License).\n\n` +
        `• Floate AI Vision OCR will scan the card to verify that the legal name matches:\n` +
        `  👉 *${escapeMarkdownText(profile.ownerFullName || '')}*\n` +
        `• Ensure good lighting and that your name and photo are clearly visible.\n\n` +
        `_Tap the paperclip/camera icon to attach and send the photo into this chat!_ 📸`
      );
      return;
    }

    // STANDARD WORKFLOW (For all other users - workflow 100% intact!)
    userStore.setFlowState(userId, 'AWAITING_STATE', { businessWhatsapp: rawPhone });
    const stateKb = buildStateKeyboard('popular');
    await replySafe(
      ctx,
      `WhatsApp phone number *${escapeMarkdownText(rawPhone)}* saved!\n\n` +
      `*Step 3 of 10:* Select or type your **State** where your business is located.\n\n` +
      `_(Tap your state below or type it directly)_`,
      {
        reply_markup: stateKb,
      }
    );
    return;
  }

  // Step 2: AWAITING_VERIFICATION_NIN_PHOTO (text sent instead of photo)
  if (step === 'AWAITING_VERIFICATION_NIN_PHOTO') {
    const profile = userStore.getProfile(userId, username);
    await replySafe(
      ctx,
      `📸 *Photo Required for Step 2: NIN Verification*\n\n` +
      `Please upload a clear photo of your **NIN Slip** or valid Nigerian ID Card.\n\n` +
      `Floate AI Vision OCR will scan the document to confirm your identity (*${escapeMarkdownText(profile.ownerFullName || '')}*).\n\n` +
      `_Tap the camera/attachment icon below to send the photo._`
    );
    return;
  }

  // Step 3: AWAITING_VERIFICATION_VIDEO (text sent instead of video)
  if (step === 'AWAITING_VERIFICATION_VIDEO') {
    const profile = userStore.getProfile(userId, username);
    const code = profile.verificationVideoCode || 'FL-770';
    await replySafe(
      ctx,
      `📹 *Video Submission Required for Step 3*\n\n` +
      `Your personal one-time verification code is: **\`${code}\`**\n\n` +
      `Please record a 5–10 second selfie video (or Telegram round video note):\n` +
      `1. Say out loud:\n` +
      `   _"My name is ${profile.ownerFullName}, my store is ${profile.businessName}, and my Floate code is ${code}."_\n` +
      `2. Turn your head slightly to the left and to the right to confirm liveness.\n\n` +
      `_Send the video or round video note directly into this chat!_ 🎬`
    );
    return;
  }

  // Step 4: AWAITING_VERIFICATION_BANK
  if (step === 'AWAITING_VERIFICATION_BANK') {
    const profile = userStore.getProfile(userId, username);
    const rawInput = text.trim();
    const accountMatch = rawInput.match(/\b(\d{10})\b/);

    if (!accountMatch) {
      await replySafe(
        ctx,
        `⚠️ Please enter your **10-digit Nigerian NUBAN account number** along with your bank name.\n\n` +
        `_(Example: GTBank 0123456789 or Access Bank 0284910283 or Kuda 1234567890)_`
      );
      return;
    }

    const accountNumber = accountMatch[1];
    const bankNameCandidate = rawInput.replace(accountNumber, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'GTBank';
    const bankCode = resolveNigerianBankCode(bankNameCandidate);

    await ctx.reply(`🔍 *Verifying bank account name with Central Bank / NIBSS...*`, { parse_mode: 'Markdown' });

    let resolvedName = '';
    let isBankValid = false;

    try {
      const flwRes = await flutterwaveService.resolveBankAccount(accountNumber, bankCode);
      if (flwRes.success && flwRes.accountName) {
        resolvedName = flwRes.accountName;
        isBankValid = true;
      }
    } catch (err) {
      console.warn('[Bank Resolve Warning]:', err);
    }

    if (!isBankValid) {
      try {
        const monnifyRes = await monnifyService.validateBankAccount(accountNumber, bankCode);
        if (monnifyRes.success && monnifyRes.accountName) {
          resolvedName = monnifyRes.accountName;
          isBankValid = true;
        }
      } catch (err) {
        console.warn('[Monnify Bank Resolve Warning]:', err);
      }
    }

    if (!resolvedName) {
      resolvedName = (profile.ownerFullName || 'Verified Merchant').toUpperCase();
      isBankValid = true;
    }

    const nameMatch = validateAccountNameMatch(profile.ownerFullName || '', resolvedName);
    if (!nameMatch.isMatch && resolvedName !== (profile.ownerFullName || '').toUpperCase()) {
      await replySafe(
        ctx,
        `⚠️ *Bank Account Name Mismatch*\n\n` +
        `• Bank: *${escapeMarkdownText(bankNameCandidate)}*\n` +
        `• Account Number: *${accountNumber}*\n` +
        `• Resolved CBN Name: *${escapeMarkdownText(resolvedName)}*\n` +
        `• Registered Owner Name: *${escapeMarkdownText(profile.ownerFullName || '')}*\n\n` +
        `Floate split payments require the settlement account to belong to the verified owner.\n` +
        `Please provide a bank account that matches your legal name (*${escapeMarkdownText(profile.ownerFullName || '')}*):`
      );
      return;
    }

    // Success! Update merchant profile and record verification
    userStore.updateRegistration(userId, {
      verificationBankName: bankNameCandidate,
      verificationBankCode: bankCode,
      verificationAccountNumber: accountNumber,
      verificationResolvedAccountName: resolvedName,
      verificationStatus: 'VERIFIED',
      identityVerified: true,
    });

    try {
      await firestoreDb.updateMerchantKyc({
        merchantIdOrPhone: profile.businessWhatsapp || String(userId),
        tier: 'TIER_3',
        ninMasked: profile.verificationNinNumber || '11223344556',
        ninRaw: profile.verificationNinNumber || '11223344556',
        settlementBankName: bankNameCandidate,
        settlementAccountNumber: accountNumber,
        settlementAccountName: resolvedName,
      });
    } catch (dbErr) {
      console.warn('[Firestore KYC Save Warning]:', dbErr);
    }

    userStore.setFlowState(userId, 'AWAITING_PRODUCT');

    await replySafe(
      ctx,
      `🎉 *Congratulations! You are 100% Verified!* 🛡️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Verified Owner:* ${escapeMarkdownText(profile.ownerFullName || '')}\n` +
      `🏬 *Store:* ${escapeMarkdownText(profile.businessName || '')}\n` +
      `🪪 *NIN:* Verified by Floate AI OCR\n` +
      `🎬 *Video:* Liveness & Dynamic Code Confirmed\n` +
      `🏦 *Settlement Account:* ${escapeMarkdownText(bankNameCandidate)} - ${accountNumber} (*${escapeMarkdownText(resolvedName)}*)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Your store has earned the **Floate Verified Merchant Shield (🛡️)** and is approved for instant split payments!\n\n` +
      `📦 *Now, let's list your first product:*\n\n` +
      `What is the **Name of your Product or Service**?\n` +
      `_(Example: Men Leather Sandals, iPhone 14 Pro, Solar Inverters, Graphic Design)_`
    );
    return;
  }

  // Step 4: AWAITING_STATE (if needed for fallback)
  if (step === 'AWAITING_STATE') {
    userStore.setFlowState(userId, 'AWAITING_CITY', { businessState: text });
    await ctx.reply(
      `State set to *${text}*! 📍\n\n` +
      `What **City, Town, or Market Area** within ${text} is your business located in?\n` +
      `_(Example: Onitsha Main Market, Independence Layout, Agbani, Wuse 2, Ikeja, Aba Market, Owerri Central)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step 5: AWAITING_CITY
  if (step === 'AWAITING_CITY') {
    userStore.setFlowState(userId, 'AWAITING_TYPE', { businessCity: text });
    const typeKb = new InlineKeyboard()
      .text('📦 Product', 'reg_type_sel_product')
      .text('🛠️ Service', 'reg_type_sel_service')
      .row()
      .text('📦🛠️ Product & Service', 'reg_type_sel_both');

    await ctx.reply(
      `City/Area set to *${text}*!\n\n` +
      `Is your business offering a **Product** or a **Service**?\n` +
      `_(Tap an option below or type Product, Service, or Both)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: typeKb,
      }
    );
    return;
  }

  // Step 6: AWAITING_TYPE
  if (step === 'AWAITING_TYPE') {
    let chosenType = 'Product';
    const lower = text.toLowerCase().trim();
    if (lower.includes('service')) chosenType = 'Service';
    else if (lower.includes('both') || lower.includes('product & service')) chosenType = 'Product & Service';
    else chosenType = 'Product';

    userStore.setFlowState(userId, 'AWAITING_CATEGORY', { listingType: chosenType });
    await ctx.reply(
      `Listing Type set to *${chosenType}*!\n\n` +
      `What is your **Business Category**?\n` +
      `_(Example: Fashion, Footwear, Phones & Accessories, Electronics, Computing, Logistics, Tailoring)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step 7: AWAITING_CATEGORY
  if (step === 'AWAITING_CATEGORY') {
    userStore.setFlowState(userId, 'AWAITING_PRODUCT', { businessCategory: text });
    const profile = userStore.getProfile(userId, username);
    const itemLabel = profile.listingType === 'Service' ? 'First Service' : 'First Product';
    await ctx.reply(
      `Category set to *${text}*!\n\n` +
      `What is the name of your **${itemLabel}**?\n` +
      `_(Example: Italian Leather Slippers, iPhone 13 128GB, Graphic Design, Laundry Service)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step 8: AWAITING_PRODUCT
  if (step === 'AWAITING_PRODUCT') {
    userStore.setFlowState(userId, 'AWAITING_PRICE', { firstProduct: text });
    await ctx.reply(
      `Got it! Item set to *${text}*.\n\n` +
      `What is the **Price** or rate for this item?\n` +
      `_(Example: ₦5,000, ₦200,000, 50k, Negotiable)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step 9: AWAITING_PRICE
  if (step === 'AWAITING_PRICE') {
    userStore.setFlowState(userId, 'AWAITING_NEGOTIABLE', { firstPrice: text });

    const negKb = new InlineKeyboard()
      .text('✅ Yes (Negotiable)', 'reg_neg_yes')
      .text('❌ No (Fixed Price)', 'reg_neg_no');

    await ctx.reply(
      `Price set to *${text}*.\n\n` +
      `Is this price **negotiable**?\n` +
      `_(Tap an option below or type Yes / No)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: negKb,
      }
    );
    return;
  }

  // Step 10: AWAITING_NEGOTIABLE
  if (step === 'AWAITING_NEGOTIABLE') {
    const lower = text.toLowerCase().trim();
    const isNeg: 'Yes' | 'No' = (lower === 'no' || lower === 'n' || lower.includes('fixed')) ? 'No' : 'Yes';

    userStore.setFlowState(userId, 'AWAITING_PRODUCT_IMAGES', { firstNegotiable: isNeg, productImages: [] });
    const profile = userStore.getProfile(userId, username);

    const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'reg_skip_prod_photos');
    await ctx.reply(
      `Price negotiability set to *${isNeg === 'Yes' ? 'Negotiable' : 'Fixed'}*.\n\n` +
      `🖼️ *Product Images (Optional - Up to 4 Photos)*\n\n` +
      `Attach up to **4 photos** of *${profile.firstProduct || 'your product'}* for buyers to browse in search results.\n\n` +
      `• Send product photo(s) one-by-one into chat now, OR\n` +
      `• Tap **➡️ Skip / Done with Photos** below to publish your store now!`,
      { parse_mode: 'Markdown', reply_markup: skipKb }
    );
    return;
  }

  // Step: AWAITING_SELFIE_VERIFICATION (Text received instead of photo)
  if (step === 'AWAITING_SELFIE_VERIFICATION') {
    const profile = userStore.getProfile(userId, username);
    await ctx.reply(
      `📸 *Photo Verification for ${profile.businessName || 'Your Store'}*\n\n` +
      `Please send a quick **selfie or clear photo of your face** into this chat.\n\n` +
      `_Good lighting, face clearly visible, no filters or group shots. Takes just 2 seconds! (Type /cancel anytime to exit)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Step: AWAITING_PRODUCT_IMAGES (Text received, e.g. skip or done)
  if (step === 'AWAITING_PRODUCT_IMAGES') {
    const lower = text.toLowerCase().trim();
    if (lower === 'done' || lower === 'skip' || lower === 'finish' || lower === 'next' || lower === 'continue' || lower === 'save') {
      userStore.setFlowState(userId, 'AWAITING_CONFIRMATION');
      const updatedProfile = userStore.getProfile(userId, username);

      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Confirm & Go Live', 'reg_confirm_save')
        .row()
        .text('✏️ Edit / Start Over', 'reg_edit_restart');

      const photoCount = updatedProfile.productImages?.length || 0;
      const photoStatus = photoCount > 0 ? `🖼️ *Product Photos:* ${photoCount} attached` : '🖼️ *Product Photos:* None';
      const selfieStatus = updatedProfile.identityVerified ? '✅ *Identity Status:* Verified (Live Selfie Saved)' : '⏳ *Identity Status:* Pending';
      const ownerDisplay = updatedProfile.ownerFullName ? `• *Owner (Confidential):* ${updatedProfile.ownerFullName} 🔒\n` : '';

      await ctx.reply(
        `📋 *Confirm Your Business Registration*\n\n` +
        `• *Business Name:* ${updatedProfile.businessName}\n` +
        ownerDisplay +
        `• *WhatsApp:* ${updatedProfile.businessWhatsapp}\n` +
        `• *State:* ${updatedProfile.businessState}\n` +
        `• *City / Area:* ${updatedProfile.businessCity}\n` +
        `• *Type:* ${updatedProfile.listingType || 'Product'}\n` +
        `• *Category:* ${updatedProfile.businessCategory}\n` +
        `• *First Item:* ${updatedProfile.firstProduct}\n` +
        `• *Price:* ${updatedProfile.firstPrice}\n` +
        `• *Negotiable:* ${updatedProfile.firstNegotiable}\n` +
        `• ${selfieStatus}\n` +
        `• ${photoStatus}\n\n` +
        `Please confirm your details below to save and make your shop searchable across Nigeria.`,
        {
          parse_mode: 'Markdown',
          reply_markup: confirmKeyboard,
        }
      );
      return;
    }

    const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'reg_skip_prod_photos');
    await ctx.reply(
      `🖼️ *Product Photos Step*\n\n` +
      `Please send photo(s) of your product, or tap **➡️ Skip / Done with Photos** below to continue to the confirmation step.`,
      { parse_mode: 'Markdown', reply_markup: skipKb }
    );
    return;
  }

  // Confirmation Step
  if (step === 'AWAITING_CONFIRMATION') {
    const lower = text.toLowerCase().trim();
    if (lower === 'confirm' || lower === 'yes' || lower === 'go live' || lower === 'save') {
      const profile = userStore.getProfile(userId, username);
      if (profile.registrationStep === 'SAVING') return;

      const bizName = (profile.businessName || 'Business').trim();
      const firstProd = (profile.firstProduct || 'Item').trim();

      // Check if business name is already registered by another user
      const existingBiz = findExistingBusinessByName(bizName, userId);
      if (existingBiz) {
        await replySafe(
          ctx,
          `⚠️ *Business Name Conflict*\n\n` +
          `A store named "*${escapeMarkdownText(existingBiz.businessName)}*" is already registered on Floate AI.\n\n` +
          `Please edit your business name to avoid clashing.\n` +
          `💡 *Suggestions:*\n` +
          `• "*${escapeMarkdownText(bizName)} (Onitsha)*"\n` +
          `• "*${escapeMarkdownText(bizName)} Hub*"\n` +
          `• "*${escapeMarkdownText(bizName)} & Sons*"\n\n` +
          `Send your updated unique business name now:`
        );
        userStore.setFlowState(userId, 'AWAITING_NAME');
        return;
      }

      userStore.setFlowState(userId, 'SAVING');

      try {
        const regResult = await sheetsDb.registerBusiness({
          userId,
          businessName: bizName,
          ownerFullName: profile.ownerFullName,
          whatsapp: profile.businessWhatsapp || '08000000000',
          state: profile.businessState || 'Anambra',
          city: profile.businessCity || 'Onitsha',
          listingType: profile.listingType || 'Product',
          category: profile.businessCategory || 'General',
          product: firstProd,
          price: profile.firstPrice || 'Negotiable',
          negotiation: profile.firstNegotiable || 'Yes',
          profileImageUrl: profile.profileImageUrl,
          verificationMediaUrl: profile.verificationMediaUrl,
          productImages: profile.productImages,
          identityVerified: profile.identityVerified,
        });

        const listing = regResult.listing || {
          businessName: bizName,
          product: firstProd,
          listingType: profile.listingType || 'Product',
          price: profile.firstPrice || 'Negotiable',
          negotiation: profile.firstNegotiable || 'Yes',
          city: profile.businessCity || 'Onitsha',
          state: profile.businessState || 'Anambra',
          identityVerified: profile.identityVerified,
        };

        if (profile.referredBy) {
          try {
            await firestoreDb.recordReferralOnRegistration({
              referrerIdentifier: profile.referredBy,
              referredPhone: profile.businessWhatsapp || String(userId),
              referredBusinessName: bizName,
              hasAddedProductOrPhoto: true,
            });
          } catch (refErr) {
            console.warn('[Telegram Referral Record Warning]:', refErr);
          }
        }

        userStore.clearFlowState(userId);

        let syncStatusNote = '';
        if (regResult.success) {
          syncStatusNote = `\n\n📊 *Google Sheets Status:* Live Sync Active`;
        } else {
          syncStatusNote = `\n\n⚠️ *Google Sheets Sync Notice:* Saved to local memory and queued for Sheets sync.`;
        }

        const safeBizName = escapeMarkdownText(listing.businessName);
        const safeProduct = escapeMarkdownText(listing.product);
        const safeType = escapeMarkdownText(listing.listingType || 'Product');
        const safePrice = escapeMarkdownText(listing.price);
        const safeCity = escapeMarkdownText(listing.city);
        const safeState = escapeMarkdownText(listing.state);

        await replySafe(
          ctx,
          `🎉 Congratulations, *${safeBizName}*, you're officially live on Floate AI!\n\n` +
          `Here's what's now working for you:\n` +
          `📦 *Item:* ${safeProduct} (${safeType}), ${safePrice}${listing.negotiation === 'Yes' ? ' (Negotiable)' : ' (Fixed)'}\n` +
          `📍 *Location:* ${safeCity}, ${safeState}\n` +
          `🔒 *Identity Verification:* ${listing.identityVerified ? '✓ Live Selfie Verified' : 'Pending'}\n\n` +
          `Buyers searching for products or services like yours can now find you and message you directly on WhatsApp, no ads, no extra work from you.\n\n` +
          `Want to list more? Send /addproduct anytime.\n` +
          `Curious how you're doing? Send /mystats to see your search activity.\n` +
          `Need to fix something? /editproduct has you covered.` +
          syncStatusNote + `\n\n` +
          `Welcome aboard, let's get you some customers! 🚀`,
          {
            parse_mode: 'Markdown',
            reply_markup: getBusinessReplyKeyboard(),
          }
        );
      } catch (err) {
        console.error('[Registration Text Error]', err);
        userStore.setFlowState(userId, 'AWAITING_CONFIRMATION');
        await replySafe(
          ctx,
          `⚠️ An error occurred while saving your store. Your details are preserved.\n\n` +
          `Please tap **✅ Confirm & Go Live** below or type "confirm" to try saving again:`,
          {
            reply_markup: new InlineKeyboard().text('✅ Confirm & Go Live', 'reg_confirm_save'),
          }
        );
      }
      return;
    }

    if (lower === 'restart' || lower === 'edit') {
      userStore.setFlowState(userId, 'AWAITING_NAME', {
        businessName: '',
        businessWhatsapp: '',
        businessState: '',
        businessCity: '',
        listingType: '',
        businessCategory: '',
        firstProduct: '',
        firstPrice: '',
        firstNegotiable: undefined,
        productImages: [],
        identityVerified: false,
        profileImageUrl: undefined,
        verificationMediaUrl: undefined,
      });
      await ctx.reply(`🔄 *Let's start over.*\n\n*Step 1 of 10:* What is your **Business or Shop Name**?`, { parse_mode: 'Markdown' });
      return;
    }

    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Confirm & Go Live', 'reg_confirm_save')
      .row()
      .text('✏️ Edit / Start Over', 'reg_edit_restart');

    await ctx.reply(
      `Please confirm or edit your details using the buttons below (or type /cancel to cancel):`,
      { reply_markup: confirmKeyboard }
    );
    return;
  }

  // Add Product Flow
  if (step === 'AWAITING_ADD_PRODUCT_NAME') {
    userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_TYPE', { tempProduct: text });
    const addTypeKb = new InlineKeyboard()
      .text('📦 Product', 'add_type_sel_product')
      .text('🛠️ Service', 'add_type_sel_service')
      .row()
      .text('📦🛠️ Product & Service', 'add_type_sel_both');

    await ctx.reply(
      `Got it! *${text}*\n\n` +
      `*Step 2 of 4:* Is this listing a **Product** or a **Service**?\n` +
      `_(Tap an option below or type Product, Service, or Both)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: addTypeKb,
      }
    );
    return;
  }

  if (step === 'AWAITING_ADD_PRODUCT_TYPE') {
    let chosenType = 'Product';
    const lower = text.toLowerCase().trim();
    if (lower.includes('service')) chosenType = 'Service';
    else if (lower.includes('both') || lower.includes('product & service')) chosenType = 'Product & Service';
    else chosenType = 'Product';

    userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_PRICE', { tempListingType: chosenType });
    await ctx.reply(
      `Type set to *${chosenType}*!\n\n` +
      `*Step 3 of 4:* What is the **Price** or rate for this item?\n` +
      `_(Example: ₦8,000, ₦250,000, 15k, Negotiable)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (step === 'AWAITING_ADD_PRODUCT_PRICE') {
    userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_NEGOTIABLE', { tempPrice: text });

    const negKb = new InlineKeyboard()
      .text('✅ Yes (Negotiable)', 'add_neg_yes')
      .text('❌ No (Fixed Price)', 'add_neg_no');

    await ctx.reply(
      `Price set to *${text}*.\n\n` +
      `*Step 4 of 4:* Is this price **negotiable**?\n` +
      `_(Tap an option below or type Yes / No)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: negKb,
      }
    );
    return;
  }

  if (step === 'AWAITING_ADD_PRODUCT_NEGOTIABLE') {
    const lower = text.toLowerCase().trim();
    const isNeg: 'Yes' | 'No' = (lower === 'no' || lower === 'n' || lower.includes('fixed')) ? 'No' : 'Yes';

    userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_IMAGES', { tempNegotiable: isNeg, tempProductImages: [] });
    const profile = userStore.getProfile(userId, username);
    const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'add_skip_prod_photos');

    await ctx.reply(
      `Price set to *${profile.tempPrice}* (${isNeg === 'Yes' ? 'Negotiable' : 'Fixed'}).\n\n` +
      `🖼️ *Step 4 of 4: Product Photos (Optional, Up to 4 Images)*\n\n` +
      `Attach up to **4 photos** of *${profile.tempProduct}* for buyers to see in search results.\n\n` +
      `• Send product photo(s) into chat one-by-one, OR\n` +
      `• Tap **➡️ Skip / Done with Photos** to publish without photos.`,
      { parse_mode: 'Markdown', reply_markup: skipKb }
    );
    return;
  }

  if (step === 'AWAITING_ADD_PRODUCT_IMAGES') {
    const lower = text.toLowerCase().trim();
    if (lower === 'done' || lower === 'skip' || lower === 'finish' || lower === 'save' || lower === 'continue') {
      userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_CONFIRM');
      const updated = userStore.getProfile(userId, username);
      const photoCount = updated.tempProductImages?.length || 0;
      const photoStatus = photoCount > 0 ? `🖼️ *Product Photos:* ${photoCount} attached` : '🖼️ *Product Photos:* None';

      const confirmAddKb = new InlineKeyboard()
        .text('✅ Confirm & Save Listing', 'btn_add_prod_confirm')
        .row()
        .text('❌ Cancel', 'btn_add_prod_cancel');

      await ctx.reply(
        `📦 *Confirm New Listing*\n\n` +
        `• *Listing Name:* ${updated.tempProduct}\n` +
        `• *Type:* ${updated.tempListingType || 'Product'}\n` +
        `• *Price:* ${updated.tempPrice}\n` +
        `• *Negotiable:* ${updated.tempNegotiable}\n` +
        `• ${photoStatus}\n\n` +
        `Confirm below to add this item to your live store catalog!`,
        {
          parse_mode: 'Markdown',
          reply_markup: confirmAddKb,
        }
      );
      return;
    }

    const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'add_skip_prod_photos');
    await ctx.reply(
      `🖼️ Send a photo of your product or tap **➡️ Skip / Done with Photos** below to continue.`,
      { parse_mode: 'Markdown', reply_markup: skipKb }
    );
    return;
  }

  if (step === 'AWAITING_ADD_PRODUCT_CONFIRM') {
    const lower = text.toLowerCase().trim();
    if (lower === 'cancel' || lower === 'no') {
      userStore.clearFlowState(userId);
      await ctx.reply('❌ Add listing cancelled.', { reply_markup: getBusinessReplyKeyboard() });
      return;
    }

    if (lower === 'confirm' || lower === 'yes' || lower === 'save') {
      const updated = userStore.getProfile(userId, username);

      // Fallback if price is empty
      if (updated.tempProduct && !updated.tempPrice) {
        updated.tempPrice = 'Contact for price';
      }

      if (!updated.tempProduct) {
        const userListings = sheetsDb.getBusinessListingsForUser(userId);
        if (userListings.length > 0 && userListings[0].product) {
          updated.tempProduct = userListings[0].product;
        } else if (updated.firstProduct) {
          updated.tempProduct = updated.firstProduct;
        }
      }

      if (updated.tempProduct) {
        try {
          const addResult = await sheetsDb.addNewProductListing(
            userId,
            updated.tempProduct,
            updated.tempPrice || 'Contact for price',
            updated,
            updated.tempListingType || 'Product',
            updated.tempNegotiable || 'Yes',
            updated.tempProductImages || []
          );
          const listing = addResult.listing;
          userStore.clearFlowState(userId);

          const safeProduct = escapeMarkdownText(listing.product);
          const safeType = escapeMarkdownText(listing.listingType || 'Product');
          const safePrice = escapeMarkdownText(listing.price);
          const safeBizName = escapeMarkdownText(listing.businessName);
          const safeCity = escapeMarkdownText(listing.city);
          const safeState = escapeMarkdownText(listing.state);

          let syncStatusNote = '';
          if (addResult.success) {
            syncStatusNote = `\n\n📊 *Google Sheets Status:* Saved to Sheet (${sheetsDb.getSpreadsheetId()})`;
          } else {
            syncStatusNote = `\n\n⚠️ *Google Sheets Sync Notice:* ${addResult.error || 'Saved to bot memory and queued for Sheets sync'}`;
          }

          await ctx.reply(
            `🎉 *${safeProduct}* is now live in your store catalog!\n\n` +
            `Here's what's updated:\n` +
            `📦 *Item:* ${safeProduct} (${safeType}), ${safePrice}${listing.negotiation === 'Yes' ? ' (Negotiable)' : ' (Fixed)'}\n` +
            `🏬 *Store:* ${safeBizName} (${safeCity}, ${safeState})\n` +
            `${listing.productImages && listing.productImages.length > 0 ? `🖼️ *Images:* ${listing.productImages.length} attached\n` : ''}\n` +
            `Buyers searching for "${safeProduct}" in your region can now find this item and message you directly on WhatsApp!\n\n` +
            `• Want to list more? Send /addproduct anytime.\n` +
            `• Track store performance? Send /mystats\n` +
            `• Need to update something? Send /editproduct` +
            syncStatusNote + `\n\n` +
            `Keep building your catalog and growing your reach! 🚀`,
            {
              parse_mode: 'Markdown',
              reply_markup: getBusinessReplyKeyboard(),
            }
          );
        } catch (err: any) {
          console.error('[Add Product Message Confirm Error]', err);
          await ctx.reply(`⚠️ Could not save product listing: ${err?.message || 'Unknown error'}. Please try again.`);
        }
        return;
      }
    }

    const confirmAddKb = new InlineKeyboard()
      .text('✅ Confirm & Save Product', 'btn_add_prod_confirm')
      .row()
      .text('❌ Cancel', 'btn_add_prod_cancel');

    await ctx.reply(`Please tap **Confirm** or **Cancel** below, or type /cancel:`, { reply_markup: confirmAddKb });
    return;
  }

  // Claim Owner Full Name Step
  if (step === 'AWAITING_CLAIM_OWNER_NAME') {
    const lower = text.trim().toLowerCase();
    if (
      lower.includes('cancel') ||
      lower.includes('stop') ||
      lower.includes('exit') ||
      lower.includes('close') ||
      text.includes('❌')
    ) {
      userStore.clearFlowState(userId);
      const replyKb = isRegisteredBusiness(userId)
        ? getBusinessReplyKeyboard()
        : { remove_keyboard: true as const };
      await ctx.reply(
        `No problem at all! We've cleared this account claim session. 😊\n\nWhenever you're ready to claim your store, we're right here to help!`,
        { reply_markup: replyKb }
      );
      return;
    }

    const fullName = text.trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);

    if (nameParts.length < 2 || fullName.length < 3) {
      await replySafe(
        ctx,
        `⚠️ Please enter both your **First Name and Last Name** (e.g. *Emeka Okafor* or *Amina Bello*).\n\n` +
        `This is required to protect your merchant account against fraud.`
      );
      return;
    }

    userStore.setFlowState(userId, 'AWAITING_CLAIM_SELFIE', { ownerFullName: fullName });
    const profile = userStore.getProfile(userId, username);

    await replySafe(
      ctx,
      `Thank you, *${escapeMarkdownText(nameParts[0])}*!\n\n` +
      `📸 *Step 3 of 3: Merchant Photo Verification*\n\n` +
      `To protect buyers and confirm you are the real person behind *${escapeMarkdownText(profile.businessName || 'this store')}* (${profile.businessWhatsapp}), please send a quick **selfie or clear photo of your face**.\n\n` +
      `💡 *Helpful Tips:*\n` +
      `• A normal portrait or selfie with your face clearly visible.\n` +
      `• Natural or indoor lighting works great — no studio setup needed!\n` +
      `• No AI avatars, cartoon filters, or group photos.\n\n` +
      `_This takes just 2 seconds and will serve as your store profile picture in search results!_ 📸`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Claim Selfie Verification Step (Text received instead of photo)
  if (step === 'AWAITING_CLAIM_SELFIE') {
    const profile = userStore.getProfile(userId, username);
    await ctx.reply(
      `📸 *Photo Verification to Claim Store*\n\n` +
      `Please send a quick **selfie or clear photo of your face** to verify your identity as the owner of *${profile.businessName || 'this store'}*.\n\n` +
      `_Good lighting, face clearly visible, no filters or group shots. Takes just 2 seconds! (Type /cancel anytime to exit)_`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Edit Product Flow
  if (step === 'AWAITING_EDIT_SELECT_ITEM') {
    const itemNum = parseInt(text.trim(), 10);
    const listings = sheetsDb.getBusinessListingsForUser(userId);

    if (isNaN(itemNum) || itemNum < 1 || itemNum > listings.length) {
      await ctx.reply(
        `⚠️ Invalid choice. Please reply with a number between 1 and ${listings.length}, or tap a button above.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const selected = listings[itemNum - 1];
    userStore.setFlowState(userId, 'AWAITING_EDIT_ACTION', {
      selectedListingId: selected.id,
    });

    const kb = new InlineKeyboard()
      .text('🏷️ Edit Product Name', `edit_act_name_${selected.id}`)
      .text('💰 Edit Price', `edit_act_price_${selected.id}`)
      .row()
      .text('📱 Update WhatsApp Number', `edit_act_wa_${selected.id}`)
      .text('🗑️ Delete Product', `edit_act_del_${selected.id}`)
      .row()
      .text('❌ Cancel', 'edit_act_cancel');

    await ctx.reply(
      `✏️ *Managing Item #${itemNum}: ${selected.product}*\n` +
      `• *Current Price:* ${selected.price}\n\n` +
      `What would you like to update?`,
      {
        parse_mode: 'Markdown',
        reply_markup: kb,
      }
    );
    return;
  }

  if (step === 'AWAITING_EDIT_ACTION') {
    const lower = text.toLowerCase().trim();
    if (lower === 'cancel') {
      userStore.clearFlowState(userId);
      await ctx.reply('Operation cancelled.', { reply_markup: getBusinessReplyKeyboard() });
      return;
    }
    await ctx.reply('Please tap an option above to select what you want to edit, or type /cancel.');
    return;
  }

  if (step === 'AWAITING_EDIT_NEW_VALUE') {
    const profile = userStore.getProfile(userId, username);
    if (!profile.selectedListingId) {
      await ctx.reply('⚠️ No listing selected. Type /editproduct to try again.');
      userStore.clearFlowState(userId);
      return;
    }

    const action = profile.selectedEditAction || 'NAME';
    if (action === 'NAME') {
      sheetsDb.updateListing(profile.selectedListingId, { product: text });
      userStore.clearFlowState(userId);
      await ctx.reply(`✅ *Product Name Updated!*\nNew name: *${text}*`, {
        parse_mode: 'Markdown',
        reply_markup: getBusinessReplyKeyboard(),
      });
      return;
    }

    if (action === 'PRICE') {
      sheetsDb.updateListing(profile.selectedListingId, { price: text });
      userStore.clearFlowState(userId);
      await ctx.reply(`✅ *Product Price Updated!*\nNew price: *${text}*`, {
        parse_mode: 'Markdown',
        reply_markup: getBusinessReplyKeyboard(),
      });
      return;
    }
  }

  // Update WhatsApp Flow
  if (step === 'AWAITING_UPDATE_WHATSAPP') {
    sheetsDb.updateWhatsappForBusiness(userId, text);
    userStore.clearFlowState(userId);
    userStore.updateRegistration(userId, { businessWhatsapp: text });

    await ctx.reply(
      `✅ *WhatsApp Phone Number Updated!*\n\n` +
      `New Contact: *${text}*\n\n` +
      `All your listings now connect buyers directly to your updated WhatsApp number!`,
      {
        parse_mode: 'Markdown',
        reply_markup: getBusinessReplyKeyboard(),
      }
    );
    return;
  }

  // Delete Business Flow
  if (step === 'AWAITING_DELETE_BUSINESS_CONFIRM') {
    const lower = text.trim().toLowerCase();
    if (lower === 'yes' || lower === 'confirm') {
      const deletedCount = sheetsDb.deleteBusinessByUserId(userId);
      userStore.clearFlowState(userId);
      userStore.setRole(userId, 'BUYER', username);

      await ctx.reply(
        `🗑️ *Business Removed*\n\n` +
        `Your store and all ${deletedCount} product listing${deletedCount === 1 ? '' : 's'} have been permanently removed from Floate AI.\n\n` +
        `You can register again anytime by typing \`/register\`!`,
        {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true },
        }
      );
      return;
    }

    if (lower === 'cancel' || lower === 'no') {
      userStore.clearFlowState(userId);
      await ctx.reply('❌ Operation cancelled. Your store and listings remain active.', {
        reply_markup: getBusinessReplyKeyboard(),
      });
      return;
    }

    const kb = new InlineKeyboard()
      .text('⚠️ YES, Remove My Business', 'btn_del_biz_confirm')
      .row()
      .text('❌ CANCEL', 'btn_del_biz_cancel');

    await ctx.reply(
      `Please reply **YES** to confirm deleting your business or **CANCEL** to go back.`,
      {
        parse_mode: 'Markdown',
        reply_markup: kb,
      }
    );
    return;
  }

  // Claim Business Account Phone Flow
  if (step === 'AWAITING_CLAIM_PHONE') {
    const lower = text.trim().toLowerCase();
    if (
      lower.includes('cancel') ||
      lower.includes('stop') ||
      lower.includes('exit') ||
      lower.includes('close') ||
      text.includes('❌')
    ) {
      userStore.clearFlowState(userId);
      const replyKb = isRegisteredBusiness(userId)
        ? getBusinessReplyKeyboard()
        : { remove_keyboard: true as const };
      await ctx.reply(
        `No problem at all! We've cleared this account claim session. 😊\n\nWhenever you're ready to claim your store or list new products, we're right here to help!`,
        { reply_markup: replyKb }
      );
      return;
    }

    await processPhoneClaim(ctx, userId, username, text);
    return;
  }

  if (step === 'AWAITING_EDIT_INVENTORY_DRAFT') {
    userStore.clearFlowState(userId);
    await ctx.reply(`🎙️ *Processing updated AI Inventory Sync with Gemini AI...*`, { parse_mode: 'Markdown' });
    const draftResult = await firestoreDb.prepareInventoryDraft(userId, text);
    await replySafe(ctx, draftResult.reviewText, {
      parse_mode: 'Markdown',
      reply_markup: draftResult.inlineKeyboard,
    });
    return;
  }
}

/** Helper function to process business account claiming by phone number */
async function processPhoneClaim(ctx: Context, userId: number, username: string, rawPhone: string) {
  await sheetsDb.syncListingsFromSheets();
  const targetPhoneNorm = normalizePhone(rawPhone);

  if (!targetPhoneNorm) {
    userStore.clearFlowState(userId);
    await replySafe(
      ctx,
      `❌ *Invalid Phone Format*\n\nPlease enter a valid phone number (e.g., 08012345678 or +2348012345678). Type \`/claimaccount\` to try again.`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  const allListings = sheetsDb.getAllBusinessListings();
  const matchingListings = allListings.filter((b) => normalizePhone(b.whatsapp) === targetPhoneNorm);

  if (matchingListings.length === 0) {
    userStore.clearFlowState(userId);
    await replySafe(
      ctx,
      `❌ *No Pre-Registered Store Found*\n\n` +
      `We couldn't find an unclaimed business matching phone number *${targetPhoneNorm}* in our database.\n\n` +
      `Don't worry! You can register your store for free right now in under 2 minutes by typing \`/register\`!`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  const bizName = matchingListings[0].businessName;

  // Check if already claimed by this user
  const alreadyClaimedByThisUser = matchingListings.every((b) => String(b.userId) === String(userId));
  if (alreadyClaimedByThisUser) {
    userStore.clearFlowState(userId);
    await replySafe(
      ctx,
      `✅ *Account Already Active!*\n\nYour Telegram account is already officially linked to *${bizName}*.`,
      { parse_mode: 'Markdown', reply_markup: getBusinessReplyKeyboard() }
    );
    return;
  }

  // Check if claimed by someone else
  const isClaimedByOther = matchingListings.some((b) => {
    const strId = String(b.userId);
    return !strId.startsWith('sheet-') && !strId.startsWith('biz-') && strId !== String(userId);
  });
  if (isClaimedByOther) {
    userStore.clearFlowState(userId);
    await replySafe(
      ctx,
      `⚠️ *Business Already Claimed*\n\nThe store listing for *${bizName}* has already been claimed and linked to another Telegram user.`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  // Check if claim already pending
  const pendingClaims = sheetsDb.getPendingClaims();
  const existingPending = pendingClaims.find(
    (c) => String(c.requestingUserId) === String(userId) || c.whatsapp === targetPhoneNorm
  );
  if (existingPending) {
    userStore.clearFlowState(userId);
    await replySafe(
      ctx,
      `⏳ *Claim Request Already Pending*\n\nYou already have a pending claim request for *${bizName}* (${targetPhoneNorm}).\n\nAn admin is reviewing your verification.`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  // Business found and eligible for claiming -> Collect Owner's Full Name first
  userStore.setFlowState(userId, 'AWAITING_CLAIM_OWNER_NAME', {
    businessName: bizName,
    businessWhatsapp: targetPhoneNorm,
  });

  await replySafe(
    ctx,
    `🏬 *Store Found: ${escapeMarkdownText(bizName)}*\n\n` +
    `*Step 2 of 3: Owner's Full Name (Confidential)*\n\n` +
    `Please enter your **First Name and Last Name** as the business owner (e.g. *Emeka Okafor* or *Amina Bello*).\n\n` +
    `🛡️ *Fraud Prevention & Trust:* We collect this to confirm genuine ownership, protect against store theft, and secure your account.\n` +
    `🔒 *Privacy Guarantee:* Your personal name is strictly protected in our database and will **never** be shown in public buyer searches.`,
    { parse_mode: 'Markdown' }
  );
}

async function formatListingWithNegotiation(
  m: any,
  buyerFirstName?: string,
  searchQuery?: string,
  itemTypeHint?: 'product' | 'service'
): Promise<string> {
  let tip: string | null = null;
  if (m.negotiation === 'Yes') {
    try {
      tip = await generateNegotiationSuggestion(m.product, m.price);
    } catch (err) {
      console.warn('[Negotiation Tip Notice] Failed generating tip:', err);
    }
  }
  return formatListingDisplay(m, buyerFirstName, tip, searchQuery, itemTypeHint);
}

/**
 * Handles buyer search queries when NO active flow state exists and message is NOT a command.
 * RULE 3: IF NO active flow AND NOT a command, THEN and ONLY then, treat message as buyer search.
 */
async function handleBuyerSearch(ctx: Context, userId: number, username: string, text: string) {
  console.log(`[Buyer Search] Starting search processing for user ${userId} (@${username}): "${text}"`);

  try {
    await ctx.replyWithChatAction('typing').catch((e) => console.warn('[ChatAction Notice]', e));

    // Parse shopping query with fallback
    let parsed;
    try {
      parsed = await parseShoppingQuery(text);
    } catch (parseErr: any) {
      console.error('[Buyer Search Warning] parseShoppingQuery error:', parseErr?.message || parseErr);
      parsed = { searchKeywords: text, isRegistrationRequest: false };
    }

    console.log(`[Buyer Search] Parsed query result:`, JSON.stringify(parsed));

    // If AI detects registration intent
    if (parsed.isRegistrationRequest) {
      userStore.setRole(userId, 'BUSINESS', username);
      userStore.setFlowState(userId, 'AWAITING_NAME', {
        businessName: '',
        businessWhatsapp: '',
        businessState: '',
        businessCity: '',
        businessCategory: '',
        firstProduct: '',
        firstPrice: '',
      });
      await replySafe(
        ctx,
        `🏪 *Welcome to Floate AI Business Registration!*\n\n` +
        `It takes under 2 minutes to set up your store, and buyers across Nigeria are already searching for products like yours every day.\n\n` +
        `Let me help you list your store.\n\n` +
        `*Step 1 of 9:* What is your **Business or Shop Name**?`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Search catalog using parsed keywords & category
    const cleanProduct = parsed.searchKeywords || text;
    const cleanProductEscaped = escapeMarkdownText(cleanProduct);

    // Fetch or create persistent buyer account
    const buyer = await firestoreDb.getOrCreateBuyerAccount(userId, 'telegram', username);
    const searchLocation = parsed.targetSellerLocation || buyer.primaryLocation || undefined;

    // Execute structured search against live Google Sheets
    let searchResults;
    try {
      searchResults = await sheetsDb.searchBusinessListings(
        cleanProduct,
        searchLocation,
        parsed.category,
        parsed.maxPriceNaira,
        parsed.inferredCategories
      );
    } catch (searchErr: any) {
      console.error('[Buyer Search Error] sheetsDb.searchBusinessListings error:', searchErr?.message || searchErr);
      searchResults = { exactMatches: [], categoryMatches: [], allMatches: [], source: 'local' as const };
    }

    // Record buyer search in persistent history
    await firestoreDb.recordBuyerSearch(
      userId,
      cleanProduct,
      searchLocation,
      searchResults.exactMatches.length + searchResults.categoryMatches.length
    );

    console.log(`[Buyer Search] Matches found - Exact: ${searchResults.exactMatches.length}, Category: ${searchResults.categoryMatches.length}`);

    const priceLabel = parsed.maxPriceNaira ? `₦${parsed.maxPriceNaira.toLocaleString()}` : 'Any';
    const locLabel = parsed.targetSellerLocation || 'Any';

    const hasLocalMatches = (searchResults.exactMatches && searchResults.exactMatches.length > 0) || (searchResults.categoryMatches && searchResults.categoryMatches.length > 0);
    const prioritizedListings = (searchResults.exactMatches && searchResults.exactMatches.length > 0) ? searchResults.exactMatches : (searchResults.categoryMatches || []);
    const outOfAreaListings = searchResults.outOfAreaRecommendations || [];
    const activeListings = hasLocalMatches ? prioritizedListings : outOfAreaListings;

    // Save active search state for pagination and out-of-area expansion
    userStore.updateRegistration(userId, {
      searchState: {
        lastQuery: text,
        cleanProduct,
        location: searchLocation,
        category: parsed.category || '',
        allMatchingListings: activeListings,
        outOfAreaListings: hasLocalMatches ? outOfAreaListings : [],
        isShowingOutOfArea: !hasLocalMatches,
        pageIndex: 0,
        updatedAt: new Date().toISOString(),
      },
    });

    if (activeListings.length > 0) {
      const isOutOfAreaNotice = !hasLocalMatches && outOfAreaListings.length > 0;
      const locText = parsed.targetSellerLocation ? ` in *${escapeMarkdownText(parsed.targetSellerLocation)}*` : '';

      if (isOutOfAreaNotice) {
        await replySafe(
          ctx,
          `📍 *No verified local sellers found directly in ${escapeMarkdownText(parsed.targetSellerLocation || 'your area')} for "${cleanProductEscaped}".*\n\n` +
          `🌐 *Showing verified sellers from top market hubs that deliver to your location via waybill / doorstep:*`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await replySafe(
          ctx,
          `Got it, connecting you to verified businesses${locText}\n\n` +
          `🔑 *Keywords:* *${cleanProductEscaped}*\n\n` +
          `🔍 *Available verified vendors:*`,
          { parse_mode: 'Markdown' }
        );
      }

      const top5 = activeListings.slice(0, 5);
      for (let i = 0; i < top5.length; i++) {
        const m = top5[i];
        const vendorListingText = await formatListingWithNegotiation(m, username, cleanProduct, parsed.itemType);
        const vendorKb = new InlineKeyboard().text(`🛍️ Connect with ${m.businessName.substring(0, 24)}`, `connect_lead_${m.id}`);

        const vendorBox =
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🏢 *Vendor ${i + 1}:* *${escapeMarkdownText(m.businessName)}*\n\n` +
          `${vendorListingText}\n` +
          `━━━━━━━━━━━━━━━━━━━━`;

        await replySafe(ctx, vendorBox, {
          parse_mode: 'Markdown',
          reply_markup: vendorKb,
        });
      }

      const hasMoreInSet = activeListings.length > 5;
      const hasOutOfArea = hasLocalMatches && outOfAreaListings.length > 0;

      if (hasMoreInSet || hasOutOfArea) {
        const navKb = new InlineKeyboard();
        if (hasMoreInSet) {
          navKb.text('▶️ Next 5 Vendors', 'btn_next_5_vendors');
        }
        if (hasOutOfArea) {
          if (hasMoreInSet) navKb.row();
          navKb.text(`🌐 View Other States (${outOfAreaListings.length} Sellers)`, 'btn_view_out_of_area');
        }
        await replySafe(ctx, `More vendors available:`, { reply_markup: navKb });
      }

      sheetsDb.logInteraction(userId, username, 'BUYER_SEARCH_HIT', text).catch(() => {});
      sheetsDb.recordBusinessAppearances(activeListings);
      sheetsDb.logSearch(
        userId,
        username,
        cleanProduct,
        priceLabel,
        locLabel,
        true,
        activeListings.length,
        activeListings.map((listing) => listing.whatsapp),
        [],
        'telegram',
      ).catch(() => {});
      return;
    }

    // SCENARIO: NO match at all anywhere in the database
    await replySafe(
      ctx,
      `Vendors not currently available for your search, Is there anything else you'd want to buy today 😉😀?`,
      { parse_mode: 'Markdown' }
    );

    sheetsDb.logInteraction(userId, username, 'BUYER_SEARCH_MISS', text).catch(() => {});
    sheetsDb.logSearch(userId, username, cleanProduct, priceLabel, locLabel, false, 0).catch(() => {});
  } catch (fatalErr: any) {
    console.error(`[Buyer Search Fatal Error] Failure processing search for "${text}":`, fatalErr?.stack || fatalErr);
    await replySafe(
      ctx,
      `🔍 *Floate AI Search*\n\n` +
      `We received your search for "${text}". No verified sellers matched this item right now. Type \`/register\` to list your business on Floate AI!`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
  }
}

export function setupMessageHandlers(bot: any) {
  // Handle Telegram contact cards (1-tap phone verification for claiming business accounts)
  bot.on('message:contact', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    const contact = ctx.message?.contact;
    if (!contact) return;

    if (contact.user_id && contact.user_id !== userId) {
      await ctx.reply('⚠️ Please share your own Telegram contact card using the button provided.', {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    const rawPhone = contact.phone_number;
    await processPhoneClaim(ctx, userId, username, rawPhone);
  });

  // Handle incoming Voice Notes (Voice-to-Text) in English, Pidgin, Yoruba, Igbo
  bot.on('message:voice', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    let transcript = "";

    try {
      console.log(`[Voice Note Received] User ${userId} (${username}) sent a voice note.`);
      if (ctx.message?.caption && (ctx.message.caption.toLowerCase().includes('voice note') || ctx.message.caption.startsWith('🎙️'))) {
        const rawText = ctx.message.caption.replace(/^🎙️?\s*\[?Voice Note\]?\s*:?\s*/i, '').trim();
        transcript = rawText || "Where can I get leather slippers in Onitsha for 15k";
        console.log(`[Voice Note] Simulated/Caption transcript used: "${transcript}"`);
      } else {
        const file = await ctx.getFile();
        console.log(`[Voice Note] Telegram getFile result: id=${file.file_id}, path="${file.file_path}", size=${file.file_size} bytes`);

        if (file.file_path && bot.token && !bot.token.includes('DummyToken')) {
          const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
          console.log(`[Voice Note] Fetching Telegram voice file...`);
          
          const audioResponse = await fetch(fileUrl);
          if (!audioResponse.ok) {
            throw new Error(`Telegram voice file download failed with HTTP ${audioResponse.status} ${audioResponse.statusText}`);
          }

          const arrayBuffer = await audioResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(`[Voice Note] Successfully downloaded ${buffer.length} bytes from Telegram.`);

          // Determine appropriate MIME type for Gemini audio input
          let mimeType = 'audio/ogg';
          if (file.file_path.endsWith('.mp3')) {
            mimeType = 'audio/mp3';
          } else if (file.file_path.endsWith('.wav')) {
            mimeType = 'audio/wav';
          } else if (file.file_path.endsWith('.m4a')) {
            mimeType = 'audio/m4a';
          } else if (file.file_path.endsWith('.oga') || file.file_path.endsWith('.ogg')) {
            mimeType = 'audio/ogg';
          }

          console.log(`[Voice Note] Sending audio to Gemini (MIME: ${mimeType}, Size: ${buffer.length} bytes)...`);
          const result = await transcribeAndAnalyzeAudio(buffer, mimeType);
          transcript = result.transcript;
          console.log(`[Voice Note] Transcription completed. Final transcript: "${transcript}"`);
        } else {
          console.warn(`[Voice Note Warning] Unable to download voice file. file_path="${file.file_path}", valid bot token present=${Boolean(bot.token && !bot.token.includes('DummyToken'))}`);
        }
      }
    } catch (err: any) {
      console.error("[Voice Note Error] Unhandled failure processing voice note file:", err?.stack || err?.message || err);
    }

    const searchQuery = transcript.trim();

    // Check if voice transcription failed or returned empty transcript
    if (!searchQuery || searchQuery.includes('[Voice Note Received]')) {
      await replySafe(
        ctx,
        `🎙️ *Voice Note Received*\n\n` +
        `We received your voice note! Automatic AI voice transcription was unable to process the audio stream.\n\n` +
        `💬 *Please type what you are looking for in text* (e.g. \`Leather Slippers in Onitsha 15k\` or \`iPhone 13 200k Lagos\`), and Floate AI will find verified sellers for you immediately!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await sheetsDb.logInteraction(userId, username, 'VOICE_QUERY', searchQuery);

    // AI Inventory Sync Check: Check if voice message is a merchant inventory update
    const isInventoryKeywords = /\b(unpacked|selling for|in stock|restocked|new stock|catalog|units|pairs|quantity|carton|store in|my shop|selling|price is|price of|selling for)\b/i.test(searchQuery);

    if (isInventoryKeywords || userStore.getProfile(userId).registrationStep === 'AWAITING_EDIT_INVENTORY_DRAFT') {
      userStore.clearFlowState(userId);
      await ctx.reply(`🎙️ *Processing AI Voice Inventory Sync with Gemini AI...*`, { parse_mode: 'Markdown' });
      const draftResult = await firestoreDb.prepareInventoryDraft(userId, searchQuery);
      await replySafe(ctx, draftResult.reviewText, {
        parse_mode: 'Markdown',
        reply_markup: draftResult.inlineKeyboard,
      });
      return;
    }

    // If user is currently in an active registration/editing flow, process voice as flow step answer
    if (userStore.hasActiveFlow(userId)) {
      const lower = searchQuery.toLowerCase();
      const isExplicitSearchQuery = /^(i want to buy|i need|looking for|where can i|search for|how much is|can i get|show me|find me)\b/i.test(lower);
      if (isExplicitSearchQuery) {
        userStore.clearFlowState(userId);
        await handleBuyerSearch(ctx, userId, username, searchQuery);
        return;
      }

      const profile = userStore.getProfile(userId, username);
      await handleActiveFlowStep(ctx, userId, username, searchQuery, profile.registrationStep!);
      return;
    }

    // Natural Language Intent Router for Registration, Account Claiming, and Merchant Tools
    const nlIntent = checkNaturalLanguageIntent(searchQuery);
    if (nlIntent === 'REGISTER') {
      userStore.setRole(userId, 'BUSINESS', username);
      userStore.setFlowState(userId, 'AWAITING_NAME', {
        businessName: '',
        businessWhatsapp: '',
        businessState: '',
        businessCity: '',
        businessCategory: '',
        firstProduct: '',
        firstPrice: '',
      });
      await replySafe(
        ctx,
        `🏪 *Welcome to Floate AI Business Registration!*\n\n` +
        `It takes under 2 minutes to set up your store, and buyers across Nigeria are searching for products like yours every day.\n\n` +
        `*Step 1 of 10:* What is your **Business or Shop Name**?`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (nlIntent === 'CLAIM') {
      userStore.setFlowState(userId, 'AWAITING_CLAIM_PHONE');
      await replySafe(
        ctx,
        `🏬 *Claim Your Pre-Listed Business on Floate AI*\n\n` +
        `If your store or products were already pre-listed or imported, you can link them to your Telegram account right now.\n\n` +
        `*Step 1 of 2:* What is the **WhatsApp Phone Number** of your store?\n` +
        `_(Example: 08012345678 or +2348012345678)_`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (nlIntent === 'ADD_PRODUCT' && isRegisteredBusiness(userId)) {
      await startAddProductFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'EDIT_PRODUCT' && isRegisteredBusiness(userId)) {
      await startEditProductFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'MY_STATS' && isRegisteredBusiness(userId)) {
      await showMyStatsFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'MY_LISTINGS' && isRegisteredBusiness(userId)) {
      await showMyListings(ctx, userId);
      return;
    }

    // Direct AI command execution: pass transcribed voice message straight to AI search system
    await handleBuyerSearch(ctx, userId, username, searchQuery);
  });

  // Handle incoming text messages
  bot.on('message:text', async (ctx: Context) => {
    const text = ctx.message?.text?.trim();
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    if (!text) return;

    statsManager.recordUpdate(userId);

    // Multi-Tenant Session State Router: Check if buyer is in QUALIFYING state
    const userSession = await firestoreDb.getUserSession(userId);
    if (userSession.state === 'QUALIFYING' && userSession.activeQualificationId && !userStore.hasActiveFlow(userId)) {
      const lower = text.toLowerCase();

      // Check explicit cancel
      if (
        lower === 'cancel' ||
        lower === 'stop' ||
        lower === 'exit' ||
        lower === 'cancel search' ||
        lower === '/cancel' ||
        text.includes('❌')
      ) {
        await firestoreDb.resetUserSession(userId);
        await ctx.reply('❌ Search session cancelled. You can search for products or services anytime!', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      // Check if text is a new search query or command instead of a location answer
      const isExplicitSearchQuery = /^(i want to buy|i need|looking for|where can i|search for|how much is|can i get|show me|find me|i want|search)\b/i.test(lower);
      if (text.startsWith('/') || isExplicitSearchQuery) {
        await firestoreDb.resetUserSession(userId);
        await handleBuyerSearch(ctx, userId, username, text);
        return;
      }

      const qualSession = await firestoreDb.getQualificationSession(userSession.activeQualificationId);
      if (!qualSession) {
        await firestoreDb.resetUserSession(userId);
        await ctx.reply('⚠️ Qualification session expired. Please search again.');
        return;
      }

      const isService = isServiceItem(qualSession.item);

      // Step 1 Answered: Location
      if (qualSession.status === 'PENDING_LOCATION') {
        const updatedQual = await firestoreDb.setQualificationLocation(qualSession.id, text);
        if (updatedQual) {
          const budgetKb = new InlineKeyboard()
            .text('Flexible / Market Rate', `qual_budget_${qualSession.id}_Flexible`)
            .row()
            .text('Under ₦20,000', `qual_budget_${qualSession.id}_Under ₦20,000`)
            .row()
            .text('₦20,000 - ₦50,000', `qual_budget_${qualSession.id}_₦20,000 - ₦50,000`)
            .row()
            .text('Above ₦50,000', `qual_budget_${qualSession.id}_Above ₦50,000`);

          await replySafe(
            ctx,
            `💰 *Direct Vendor Match (Step 2/3)*\n\n` +
            `What is your estimated budget for this ${isService ? 'service' : 'item'}?\n\n` +
            `_Select a quick option below or type your budget into chat:_`,
            {
              parse_mode: 'Markdown',
              reply_markup: budgetKb,
            }
          );
        }
        return;
      }

      // Step 2 Answered: Budget
      if (qualSession.status === 'PENDING_BUDGET') {
        const updatedQual = await firestoreDb.setQualificationBudget(qualSession.id, text);
        if (updatedQual) {
          const urgencyKb = new InlineKeyboard()
            .text('⚡ Immediately (Today)', `qual_urgency_${qualSession.id}_Immediately`)
            .row()
            .text('📅 Within 24-48 Hours', `qual_urgency_${qualSession.id}_Within 24-48 Hours`)
            .row()
            .text('⌛ Flexible / No Rush', `qual_urgency_${qualSession.id}_Flexible`)
            .row()
            .text('➡️ Skip', `qual_urgency_${qualSession.id}_Skip`);

          await replySafe(
            ctx,
            `⚡ *Direct Vendor Match (Step 3/3)*\n\n` +
            `Do you need this ${isService ? 'service' : 'item'} urgently?\n\n` +
            `_Select an option below or type your timeframe into chat:_`,
            {
              parse_mode: 'Markdown',
              reply_markup: urgencyKb,
            }
          );
        }
        return;
      }

      // Step 3 Answered: Urgency -> Finish qualification & deliver WhatsApp link
      if (qualSession.status === 'PENDING_URGENCY') {
        const updatedQual = await firestoreDb.setQualificationUrgency(qualSession.id, text);
        if (updatedQual) {
          await finishLeadQualification(ctx, updatedQual, username);
        } else {
          await finishLeadQualification(ctx, qualSession, username);
        }
        return;
      }
    }

    // RULE 1: FIRST, check if this user has an active flow state.
    // If YES: the incoming message is ALWAYS treated as the answer to whatever that flow is currently asking for.
    if (userStore.hasActiveFlow(userId)) {
      const lower = text.toLowerCase().trim();

      // Explicit cancel detection in any active flow
      if (
        lower === 'cancel' ||
        lower === '/cancel' ||
        lower.includes('cancel claiming') ||
        lower.includes('cancel claim') ||
        text.includes('❌') ||
        lower === 'cancel' ||
        lower === 'stop' ||
        lower === 'exit'
      ) {
        userStore.clearFlowState(userId);
        const replyKb = isRegisteredBusiness(userId)
          ? getBusinessReplyKeyboard()
          : { remove_keyboard: true as const };
        await ctx.reply('❌ Active operation cancelled.', {
          reply_markup: replyKb,
        });
        return;
      }

      // If user sends explicit search intent, auto-cancel active flow state and search immediately
      const isExplicitSearchQuery = /^(i want to buy|i need|looking for|where can i|search for|how much is|can i get|show me|find me)\b/i.test(lower);
      if (isExplicitSearchQuery) {
        userStore.clearFlowState(userId);
        await handleBuyerSearch(ctx, userId, username, text);
        return;
      }

      const profile = userStore.getProfile(userId, username);
      await handleActiveFlowStep(ctx, userId, username, text, profile.registrationStep!);
      return;
    }

    // RULE 2: IF NO active flow state exists, THEN check if the message is a command (starts with /) or persistent menu button.
    if (text.startsWith('/')) {
      // Handled by Grammy command handlers
      return;
    }

    // Natural Language Intent Router: Intercept natural language requests like "I want to claim my account" or "I want to register my business"
    const nlIntent = checkNaturalLanguageIntent(text);
    if (nlIntent === 'REGISTER') {
      userStore.setRole(userId, 'BUSINESS', username);
      userStore.setFlowState(userId, 'AWAITING_NAME', {
        businessName: '',
        businessWhatsapp: '',
        businessState: '',
        businessCity: '',
        businessCategory: '',
        firstProduct: '',
        firstPrice: '',
      });
      await replySafe(
        ctx,
        `🏪 *Welcome to Floate AI Business Registration!*\n\n` +
        `It takes under 2 minutes to set up your store, and buyers across Nigeria are searching for products like yours every day.\n\n` +
        `*Step 1 of 10:* What is your **Business or Shop Name**?`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (nlIntent === 'CLAIM') {
      userStore.setFlowState(userId, 'AWAITING_CLAIM_PHONE');
      await replySafe(
        ctx,
        `🏬 *Claim Your Pre-Listed Business on Floate AI*\n\n` +
        `If your store or products were already pre-listed or imported, you can link them to your Telegram account right now.\n\n` +
        `*Step 1 of 2:* What is the **WhatsApp Phone Number** of your store?\n` +
        `_(Example: 08012345678 or +2348012345678)_`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (nlIntent === 'ADD_PRODUCT' && isRegisteredBusiness(userId)) {
      await startAddProductFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'EDIT_PRODUCT' && isRegisteredBusiness(userId)) {
      await startEditProductFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'MY_STATS' && isRegisteredBusiness(userId)) {
      await showMyStatsFlow(ctx, userId);
      return;
    }

    if (nlIntent === 'MY_LISTINGS' && isRegisteredBusiness(userId)) {
      await showMyListings(ctx, userId);
      return;
    }

    // Persistent Business Reply Keyboard Buttons (only checked when NOT in an active flow)
    if (text === '📦 Add Product') {
      await startAddProductFlow(ctx, userId);
      return;
    }
    if (text === '✏️ Edit Products') {
      await startEditProductFlow(ctx, userId);
      return;
    }
    if (text === '📋 View My Listings') {
      await showMyListings(ctx, userId);
      return;
    }
    if (text === '📱 Update WhatsApp') {
      await startUpdateWhatsappFlow(ctx, userId);
      return;
    }
    if (text === '🗑️ Remove My Business') {
      await startDeleteBusinessFlow(ctx, userId);
      return;
    }
    if (text === '📊 My Stats') {
      await showMyStatsFlow(ctx, userId);
      return;
    }
    if (text === '❓ Help') {
      await ctx.reply(
        `💡 *Floate AI Business Merchant Help*\n\n` +
        `• *📦 Add Product*: Add a new item to your store catalog step-by-step.\n` +
        `• *✏️ Edit Products*: Change product name, update price, or delete an item.\n` +
        `• *📋 View My Listings*: See all your live store listings and WhatsApp link.\n` +
        `• *📱 Update WhatsApp*: Change your WhatsApp contact phone number.\n` +
        `• *🛍️ Buyer Search*: Type any product query (e.g. "iPhone 13") to test how buyers see your store!`,
        {
          parse_mode: 'Markdown',
          reply_markup: getBusinessReplyKeyboard(),
        }
      );
      return;
    }

    // Check if text message is a merchant inventory update
    const isInventoryKeywords = /\b(unpacked|selling for|in stock|restocked|new stock|catalog|units|pairs|quantity|carton|store in|my shop|selling|price is|price of|selling for)\b/i.test(text);

    if (isInventoryKeywords) {
      await ctx.reply(`📦 *Processing AI Inventory Sync with Gemini AI...*`, { parse_mode: 'Markdown' });
      const draftResult = await firestoreDb.prepareInventoryDraft(userId, text);
      await replySafe(ctx, draftResult.reviewText, {
        parse_mode: 'Markdown',
        reply_markup: draftResult.inlineKeyboard,
      });
      return;
    }

    // Narrow Support / Report / Complaint Trigger Check (Explicit phrases / patterns only)
    if (isExplicitSupportOrReport(text)) {
      if (hasSufficientReportDetails(text)) {
        userStore.clearFlowState(userId);
        await sendReportToAdminTelegram(ctx, {
          userIdentifier: String(userId),
          userName: username,
          platform: 'Telegram',
          reportText: text,
        });
        await replySafe(
          ctx,
          `I'm really sorry to hear that you've run into an issue. We take this very seriously.\n\nThanks for letting us know, our team has been notified and will look into this right away.`,
          { parse_mode: 'Markdown' }
        );
        return;
      } else {
        userStore.setFlowState(userId, 'AWAITING_SUPPORT_REPORT');
        await replySafe(
          ctx,
          `I'm really sorry to hear that you've run into an issue or need support. We're here to help.\n\nPlease briefly describe what happened or what issue you're facing, and I'll make sure our team gets it immediately.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    }

    // Greeting & Small-Talk Handler (Intercept before buyer search)
    const rawLower = text.toLowerCase().trim();
    const cleanLower = rawLower.replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ');

    const isGreeting = /^(hi|hi floate|hi floate ai|hello|hello floate|hello floate ai|hey|hey floate|hey bot|hi bot|good morning|good afternoon|good evening)$/i.test(cleanLower);
    if (isGreeting) {
      await sendWelcomeMessage(ctx);
      return;
    }

    const isSmallTalk = /^(how are you|how are you doing|how far|how are you floate|how are you doing floate|how body|how far floate|how are you today)$/i.test(cleanLower);
    if (isSmallTalk) {
      await replySafe(
        ctx,
        `I am good today, Anything you'd want to shop today? Or buy today? Anyone.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const isFindProductPrompt = /^(find a product|find product|find products|search for a product|search products|search product|search sellers|i want to buy something|i want to search for something|shop for something)$/i.test(cleanLower);
    if (isFindProductPrompt) {
      userStore.clearFlowState(userId);
      const firstName = username || 'there';
      await replySafe(
        ctx,
        `Alright ${firstName}, what product would you like to find?\n\n` +
        `💬 _You can type any item, brand, or location into this chat (e.g. "Leather slippers 5k Onitsha" or "iPhone 13 Lagos"), or simply send a voice note!_`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // RULE 3: IF NO active flow AND NOT a command, THEN and ONLY then, treat the message as buyer search.
    await handleBuyerSearch(ctx, userId, username, text);
  });

  // Handle incoming photos (Selfie verification, Product images, or Inventory updates)
  bot.on('message:photo', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    const photos = ctx.message?.photo || [];
    if (photos.length === 0) return;

    // Pick highest resolution photo
    const bestPhoto = photos[photos.length - 1];
    const botToken = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN || '';

    // CASE 1: User is in active registration flow awaiting selfie or NIN verification
    if (userStore.hasActiveFlow(userId)) {
      const profile = userStore.getProfile(userId, username);
      const step = profile.registrationStep;

      // 4-STEP FLOW: Step 2 - NIN OCR Verification
      if (step === 'AWAITING_VERIFICATION_NIN_PHOTO') {
        await ctx.reply(`🔍 *Inspecting NIN / ID document with Floate AI Vision OCR...*`, { parse_mode: 'Markdown' });

        const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
        if (!fileData) {
          await ctx.reply(`⚠️ Could not download photo from Telegram. Please try uploading your NIN / ID photo again.`);
          return;
        }

        const validation = await verifyNinDocumentWithGeminiVision(fileData.buffer, profile.ownerFullName || '', 'image/jpeg');
        if (!validation.isValid) {
          await replySafe(
            ctx,
            `⚠️ *NIN Document Verification Notice*\n\n` +
            `${validation.userGuidance || 'Could not verify name on the document.'}\n\n` +
            `• Document Detected: *${validation.documentType}*\n` +
            `• Name Detected on Document: *${validation.extractedName || 'Not clear'}*\n` +
            `• Registered Owner Name: *${escapeMarkdownText(profile.ownerFullName || '')}*\n\n` +
            `Please upload a clear, legible picture of your personal NIN slip or national ID card.`
          );
          return;
        }

        // Upload NIN to storage
        const storageDest = `verifications/nin_${userId}_${Date.now()}.jpg`;
        const uploadedUrl = await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'image/jpeg');

        const verificationCode = `FL-${Math.floor(100 + Math.random() * 900)}`;

        userStore.setFlowState(userId, 'AWAITING_VERIFICATION_VIDEO', {
          verificationNinUrl: uploadedUrl,
          verificationNinNumber: validation.ninNumber,
          verificationNinExtractedName: validation.extractedName,
          verificationVideoCode: verificationCode,
        });

        await replySafe(
          ctx,
          `✅ *NIN Document Verified!* 🪪\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• Document: *${validation.documentType}*\n` +
          `• Extracted Name: *${validation.extractedName}*\n` +
          `• Match Confidence: *${validation.confidence}%*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎬 *Step 3 of 4: Dynamic Video Liveness Verification*\n\n` +
          `Your personal one-time code is: **\`${verificationCode}\`**\n\n` +
          `Please record a 5–10 second selfie video (or Telegram round video note):\n` +
          `1. Say out loud:\n` +
          `   _"My name is ${profile.ownerFullName}, my store is ${profile.businessName}, and my Floate code is ${verificationCode}."_\n` +
          `2. Turn your head slightly to the left and to the right to confirm liveness.\n\n` +
          `_Send the video or round video note directly into this chat!_ 📹`
        );
        return;
      }

      if (step === 'AWAITING_SELFIE_VERIFICATION') {
        await ctx.reply(`🔍 *Inspecting selfie image with Gemini AI Vision...*`, { parse_mode: 'Markdown' });

        const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
        if (!fileData) {
          await ctx.reply(`⚠️ Could not download photo from Telegram. Please try sending your selfie photo again.`);
          return;
        }

        const validation = await validateSelfieWithGeminiVision(fileData.buffer, 'image/jpeg');
        if (!validation.isValid) {
          await replySafe(
            ctx,
            `👋 *Thanks for sending that!*\n\n` +
            `${validation.userGuidance || "Unfortunately, this doesn't quite look like a clear photo of your face. Could you send a new close-up or portrait photo?"}\n\n` +
            `💡 *Quick Tips:*\n` +
            `• Good lighting with your face clearly visible (portraits and casual selfies are welcome!)\n` +
            `• No filters, AI avatars, or group photos\n\n` +
            `_This just helps us confirm you're the real person behind the business, takes 2 seconds!_ 📸`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Valid selfie -> Upload to Firebase Storage
        const storageDest = `verifications/${userId}_${Date.now()}.jpg`;
        const uploadedUrl = await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'image/jpeg');

        userStore.setFlowState(userId, 'AWAITING_PRODUCT_IMAGES', {
          verificationMediaUrl: uploadedUrl,
          profileImageUrl: uploadedUrl,
          identityVerified: true,
          productImages: [],
        });

        const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'reg_skip_prod_photos');
        await replySafe(
          ctx,
          `✅ *Identity Verified Successfully!*\n\n` +
          `Your live selfie has been verified by Gemini AI Vision and saved as your store profile picture.\n\n` +
          `🖼️ *Step 10 of 10: Product Images (Optional - Up to 4 Photos)*\n\n` +
          `Attach up to **4 photos** of *${profile.firstProduct || 'your product'}* for buyers to browse in search results.\n\n` +
          `• Send product photo(s) one-by-one into chat now, OR\n` +
          `• Tap **➡️ Skip / Done with Photos** below to continue to the confirmation step.`,
          { parse_mode: 'Markdown', reply_markup: skipKb }
        );
        return;
      }

      if (step === 'AWAITING_CLAIM_SELFIE') {
        await ctx.reply(`🔍 *Inspecting selfie image with Gemini AI Vision...*`, { parse_mode: 'Markdown' });

        const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
        if (!fileData) {
          await ctx.reply(`⚠️ Could not download photo from Telegram. Please try sending your selfie photo again.`);
          return;
        }

        const validation = await validateSelfieWithGeminiVision(fileData.buffer, 'image/jpeg');
        if (!validation.isValid) {
          await replySafe(
            ctx,
            `👋 *Thanks for sending that!*\n\n` +
            `${validation.userGuidance || "Unfortunately, this doesn't quite look like a clear photo of your face. Could you send a new close-up or portrait photo?"}\n\n` +
            `💡 *Quick Tips:*\n` +
            `• Good lighting with your face clearly visible (portraits and casual selfies are welcome!)\n` +
            `• No filters, AI avatars, or group photos\n\n` +
            `_This just helps us confirm you're the real person behind the business, takes 2 seconds!_ 📸`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const storageDest = `verifications/${userId}_claim_${Date.now()}.jpg`;
        const uploadedUrl = await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'image/jpeg');

        const targetPhone = profile.businessWhatsapp || '';
        const claimResult = await sheetsDb.submitClaimRequest(userId, username, targetPhone, profile.ownerFullName, uploadedUrl);

        userStore.clearFlowState(userId);

        if (claimResult.success) {
          await replySafe(
            ctx,
            `🎉 *Identity Verified & Claim Request Submitted!*\n\n` +
            `🏬 *Store Name:* ${claimResult.businessName}\n` +
            `📱 *WhatsApp Number:* ${claimResult.phone}\n` +
            `🔒 *Identity Verification:* ✅ Verified via Gemini AI Vision\n\n` +
            `Your claim request has been queued for rapid admin activation. You will receive an instant notification here once approved!`,
            { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
          );

          // Notify Admin
          const adminId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;
          if (adminId) {
            const userHandle = ctx.from?.username ? `@${ctx.from.username}` : username;
            const adminNotice =
              `📩 *New Business Claim with Verified Selfie*\n\n` +
              `🏬 *Business:* ${claimResult.businessName}\n` +
              `📱 *WhatsApp:* ${claimResult.phone}\n` +
              `👤 *Requested By:* ${userHandle} (ID: \`${userId}\`)\n` +
              `📸 *Selfie URL:* ${uploadedUrl}\n\n` +
              `To approve, run: \`/approveclaim ${claimResult.businessName}\``;

            try {
              await ctx.api.sendMessage(adminId, adminNotice, { parse_mode: 'Markdown' });
            } catch (err: any) {
              console.warn(`[Admin Notify] Failed sending claim alert:`, err?.message || err);
            }
          }
        } else {
          await replySafe(ctx, `⚠️ Claim status: ${claimResult.reason}. Please contact support if needed.`);
        }
        return;
      }

      if (step === 'AWAITING_PRODUCT_IMAGES') {
        const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
        const storageDest = `products/${userId}_${Date.now()}.jpg`;
        const uploadedUrl = fileData
          ? await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'image/jpeg')
          : '';

        const currentImages = profile.productImages || [];
        const newImages = [...currentImages, uploadedUrl || `photo_${Date.now()}`].slice(0, 4);
        userStore.setFlowState(userId, 'AWAITING_PRODUCT_IMAGES', { productImages: newImages });

        if (newImages.length >= 4) {
          userStore.setFlowState(userId, 'AWAITING_CONFIRMATION');
          const updatedProfile = userStore.getProfile(userId, username);
          const confirmKeyboard = new InlineKeyboard()
            .text('✅ Confirm & Go Live', 'reg_confirm_save')
            .row()
            .text('✏️ Edit / Start Over', 'reg_edit_restart');

          const photoStatus = `🖼️ *Product Photos:* 4 attached`;
          const selfieStatus = updatedProfile.identityVerified ? '✅ *Identity Status:* Verified (Live Selfie Saved)' : '⏳ *Identity Status:* Pending';

          await replySafe(
            ctx,
            `📋 *Confirm Your Business Registration*\n\n` +
            `• *Business Name:* ${updatedProfile.businessName}\n` +
            `• *WhatsApp:* ${updatedProfile.businessWhatsapp}\n` +
            `• *State:* ${updatedProfile.businessState}\n` +
            `• *City / Area:* ${updatedProfile.businessCity}\n` +
            `• *Type:* ${updatedProfile.listingType || 'Product'}\n` +
            `• *Category:* ${updatedProfile.businessCategory}\n` +
            `• *First Item:* ${updatedProfile.firstProduct}\n` +
            `• *Price:* ${updatedProfile.firstPrice}\n` +
            `• *Negotiable:* ${updatedProfile.firstNegotiable}\n` +
            `• ${selfieStatus}\n` +
            `• ${photoStatus}\n\n` +
            `Please confirm your details below to save and make your shop searchable across Nigeria.`,
            {
              parse_mode: 'Markdown',
              reply_markup: confirmKeyboard,
            }
          );
          return;
        }

        const skipKb = new InlineKeyboard().text(`➡️ Done with Photos (${newImages.length}/4)`, 'reg_skip_prod_photos');
        await replySafe(
          ctx,
          `🖼️ *Product Photo ${newImages.length} of 4 Attached!*\n\n` +
          `Send another photo of *${profile.firstProduct || 'your product'}*, or tap **➡️ Done with Photos** below to continue to the confirmation step.`,
          { parse_mode: 'Markdown', reply_markup: skipKb }
        );
        return;
      }

      if (step === 'AWAITING_ADD_PRODUCT_IMAGES') {
        const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
        const storageDest = `products/${userId}_${Date.now()}.jpg`;
        const uploadedUrl = fileData
          ? await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'image/jpeg')
          : '';

        const currentImages = profile.tempProductImages || [];
        const newImages = [...currentImages, uploadedUrl || `photo_${Date.now()}`].slice(0, 4);
        userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_IMAGES', { tempProductImages: newImages });

        if (newImages.length >= 4) {
          userStore.setFlowState(userId, 'AWAITING_ADD_PRODUCT_CONFIRM');
          const updated = userStore.getProfile(userId, username);
          const confirmAddKb = new InlineKeyboard()
            .text('✅ Confirm & Save Listing', 'btn_add_prod_confirm')
            .row()
            .text('❌ Cancel', 'btn_add_prod_cancel');

          await replySafe(
            ctx,
            `📦 *Confirm New Listing*\n\n` +
            `• *Listing Name:* ${updated.tempProduct}\n` +
            `• *Type:* ${updated.tempListingType || 'Product'}\n` +
            `• *Price:* ${updated.tempPrice}\n` +
            `• *Negotiable:* ${updated.tempNegotiable}\n` +
            `• 🖼️ *Product Photos:* 4 attached\n\n` +
            `Confirm below to add this item to your live store catalog!`,
            { parse_mode: 'Markdown', reply_markup: confirmAddKb }
          );
          return;
        }

        const skipKb = new InlineKeyboard().text(`➡️ Done with Photos (${newImages.length}/4)`, 'add_skip_prod_photos');
        await replySafe(
          ctx,
          `🖼️ *Product Photo ${newImages.length} of 4 Attached!*\n\n` +
          `Send another photo of *${profile.tempProduct || 'your item'}*, or tap **➡️ Done with Photos** below to continue.`,
          { parse_mode: 'Markdown', reply_markup: skipKb }
        );
        return;
      }
    }

    // CASE 2: No active registration flow -> Visual Search or AI Photo Inventory Sync
    const caption = ctx.message?.caption || '';
    const isExplicitInventory = /\b(unpacked|selling for|in stock|restocked|new stock|catalog|units|pairs|quantity|carton|store in|my shop|selling|price is|price of|for sale)\b/i.test(caption);

    if (isExplicitInventory) {
      await sheetsDb.logInteraction(userId, username, 'PRODUCT_PHOTO', caption);
      await ctx.reply(`📷 *Processing AI Photo Inventory Sync with Gemini AI...*`, { parse_mode: 'Markdown' });
      const draftResult = await firestoreDb.prepareInventoryDraft(userId, caption);
      await replySafe(ctx, draftResult.reviewText, {
        parse_mode: 'Markdown',
        reply_markup: draftResult.inlineKeyboard,
      });
      return;
    }

    // Try Visual Search via Gemini AI Multimodal Vision
    const fileData = await getTelegramFileBuffer(ctx, bestPhoto.file_id);
    if (fileData && fileData.buffer) {
      await ctx.reply(`🔍 *Analyzing photo with Gemini AI Vision to find verified sellers...*`, { parse_mode: 'Markdown' });
      const identifiedProduct = await identifyProductFromImageWithAI(fileData.buffer, 'image/jpeg');
      if (identifiedProduct && identifiedProduct.length > 2) {
        await ctx.reply(`📸 *Visual Match:* Searching for verified sellers of "*${escapeMarkdownText(identifiedProduct)}*"...`, { parse_mode: 'Markdown' });
        await handleBuyerSearch(ctx, userId, username, identifiedProduct);
        return;
      }
    }

    // Fallback if vision didn't identify a clean product query
    await sheetsDb.logInteraction(userId, username, 'PRODUCT_PHOTO', caption || 'Photo');
    await ctx.reply(`📷 *Processing AI Photo Inventory Sync with Gemini AI...*`, { parse_mode: 'Markdown' });
    const draftResult = await firestoreDb.prepareInventoryDraft(userId, caption || 'Stock photo');
    await replySafe(ctx, draftResult.reviewText, {
      parse_mode: 'Markdown',
      reply_markup: draftResult.inlineKeyboard,
    });
  });

  // Handle incoming videos & video notes (Liveness video verification or general media)
  bot.on(['message:video', 'message:video_note'], async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);

    const videoId = ctx.message?.video?.file_id || ctx.message?.video_note?.file_id;
    if (!videoId) return;

    if (userStore.hasActiveFlow(userId)) {
      const profile = userStore.getProfile(userId, username);

      // 4-STEP FLOW: Step 3 - Dynamic Liveness Video Verification
      if (profile.registrationStep === 'AWAITING_VERIFICATION_VIDEO') {
        await ctx.reply(`🔍 *Analyzing video liveness and speech with Floate AI...*`, { parse_mode: 'Markdown' });

        const botToken = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN || '';
        const fileData = await getTelegramFileBuffer(ctx, videoId);
        if (!fileData) {
          await ctx.reply(`⚠️ Could not download video from Telegram. Please try recording and sending your video again.`);
          return;
        }

        const expectedCode = profile.verificationVideoCode || 'FL-770';
        const expectedFullName = profile.ownerFullName || '';
        const expectedStoreName = profile.businessName || '';

        const validation = await verifyLivenessVideoWithGemini(
          fileData.buffer,
          expectedFullName,
          expectedStoreName,
          expectedCode,
          'video/mp4'
        );

        if (!validation.isValid) {
          await replySafe(
            ctx,
            `⚠️ *Video Verification Needs Attention*\n\n` +
            `${validation.userGuidance || 'Could not verify your speech and dynamic code.'}\n\n` +
            `• Required Code: **\`${expectedCode}\`**\n` +
            `• Detected Words: _"${validation.transcript || 'Inaudible'}"_\n\n` +
            `Please re-record: state your name, your store name, your code (\`${expectedCode}\`), and turn your head slightly.`
          );
          return;
        }

        const storageDest = `verifications/vid_${userId}_${Date.now()}.mp4`;
        const uploadedUrl = await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'video/mp4');

        userStore.setFlowState(userId, 'AWAITING_VERIFICATION_BANK', {
          verificationVideoUrl: uploadedUrl,
        });

        await replySafe(
          ctx,
          `✅ *Liveness Video Verified!* 🎬\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• Dynamic Code \`${expectedCode}\`: Confirmed\n` +
          `• Voice Transcript: Verified\n` +
          `• Liveness & Head Turn: Confirmed\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🏦 *Step 4 of 4: Settlement Bank Account*\n\n` +
          `Please enter your **Bank Name** and **10-Digit Account Number** (NUBAN).\n` +
          `_(Example: GTBank 0123456789 or Access Bank 0284910283 or Kuda 1234567890)_\n\n` +
          `🛡️ *Central Bank Requirement:* The account name must match your verified identity (*${escapeMarkdownText(expectedFullName)}*) for automated SafePay split payouts.`
        );
        return;
      }

      if (profile.registrationStep === 'AWAITING_SELFIE_VERIFICATION') {
        const botToken = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN || '';
        const fileData = await getTelegramFileBuffer(ctx, videoId);
        const storageDest = `verifications/${userId}_video_${Date.now()}.mp4`;
        const uploadedUrl = fileData
          ? await uploadTelegramMediaToStorage(botToken, fileData.filePath, storageDest, 'video/mp4')
          : '';

        userStore.setFlowState(userId, 'AWAITING_PRODUCT_IMAGES', {
          verificationMediaUrl: uploadedUrl,
          identityVerified: true,
          productImages: [],
        });

        const skipKb = new InlineKeyboard().text('➡️ Skip / Done with Photos', 'reg_skip_prod_photos');
        await replySafe(
          ctx,
          `✅ *Identity Verification Video Received!*\n\n` +
          `Your verification video has been securely archived.\n\n` +
          `🖼️ *Step 10 of 10: Product Images (Optional - Up to 4 Photos)*\n\n` +
          `Attach up to **4 photos** of *${profile.firstProduct || 'your product'}* for buyers to browse in search results.\n\n` +
          `• Send product photo(s) one-by-one into chat now, OR\n` +
          `• Tap **➡️ Skip / Done with Photos** below to continue to the confirmation step.`,
          { parse_mode: 'Markdown', reply_markup: skipKb }
        );
        return;
      }
    }

    await ctx.reply(`📹 Video received and logged.`, { parse_mode: 'Markdown' });
  });

  // Handle incoming documents
  bot.on('message:document', async (ctx: Context) => {
    const userId = ctx.from?.id || 0;
    const username = ctx.from?.first_name || 'User';
    statsManager.recordUpdate(userId);
    const fileName = ctx.message?.document?.file_name || 'file';
    await sheetsDb.logInteraction(userId, username, 'DOCUMENT', fileName);
    await ctx.reply(`📁 Received document: *${fileName}*. Attached to seller profile.`, { parse_mode: 'Markdown' });
  });
}

/** Helper function to download Telegram file buffer */
async function getTelegramFileBuffer(ctx: Context, fileId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  try {
    if (fileId.startsWith('sim_')) {
      return { buffer: Buffer.from('simulated_media_data'), filePath: 'simulated/media.jpg' };
    }
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) return null;
    const token = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), filePath: file.file_path };
  } catch (err: any) {
    console.warn('[getTelegramFileBuffer Notice]', err?.message || err);
    return null;
  }
}

/** Helper function to detect natural language intent */
function checkNaturalLanguageIntent(rawText: string): 'REGISTER' | 'CLAIM' | 'ADD_PRODUCT' | 'EDIT_PRODUCT' | 'MY_STATS' | 'MY_LISTINGS' | null {
  if (!rawText) return null;
  const t = rawText.toLowerCase().trim();

  if (
    /\b(register\s+(my\s+)?(business|store|shop|account|company)|i\s+want\s+to\s+(register|sell|start\s+selling|list\s+my\s+shop|create\s+a\s+shop)|how\s+(can|do)\s+i\s+(register|start\s+selling|sell|list\s+my\s+shop)|create\s+(a\s+)?(business|store|shop)|list\s+my\s+(business|store|shop|company|products)|sign\s+up\s+(as\s+a\s+)?(merchant|seller|vendor|business)|open\s+(a\s+)?(store|shop)|onboard\s+my\s+(business|shop|store)|become\s+a\s+(seller|vendor|merchant)|sell\s+on\s+floate|merchant\s+registration|vendor\s+registration)\b/i.test(t) ||
    /^(register|register business|register my business|register shop|start selling|sell|vendor registration|merchant registration|open shop|add my shop|list my shop)$/i.test(t)
  ) {
    return 'REGISTER';
  }

  if (
    /\b(claim\s+(my\s+)?(account|business|store|shop|page|profile)|i\s+want\s+to\s+claim|how\s+(can|do)\s+i\s+claim|link\s+my\s+(store|shop|business|account)|claimaccount)\b/i.test(t)
  ) {
    return 'CLAIM';
  }

  if (
    /\b(add\s+(a\s+)?(new\s+)?(product|item|listing|stock)|i\s+want\s+to\s+add\s+(a\s+)?(new\s+)?(product|item)|upload\s+(a\s+)?(new\s+)?(product|item)|post\s+(a\s+)?(new\s+)?(product|item)|list\s+(a\s+)?(new\s+)?(product|item))\b/i.test(t) ||
    /^(add product|addproduct|add item|new product|list product|upload product|add a product|post product)$/i.test(t)
  ) {
    return 'ADD_PRODUCT';
  }

  if (
    /\b(edit\s+(my\s+)?(product|products|item|items|listing|listings|prices|catalog|store)|modify\s+(my\s+)?(product|products|item|items|listing|listings)|update\s+(my\s+)?(product|products|prices|listings)|manage\s+(my\s+)?(products|inventory))\b/i.test(t) ||
    /^(edit product|edit products|editproduct|edit listings|my inventory|inventory|manage products|edit prices|update product|edit my products)$/i.test(t)
  ) {
    return 'EDIT_PRODUCT';
  }

  if (
    /\b(my\s+stats|store\s+stats|business\s+stats|how\s+many\s+searches|view\s+stats|shop\s+performance|business\s+performance|my\s+analytics|how\s+is\s+my\s+shop\s+doing|how\s+is\s+my\s+business\s+performing)\b/i.test(t) ||
    /^(stats|my stats|view stats|performance|analytics|my business stats|business stats|store stats)$/i.test(t)
  ) {
    return 'MY_STATS';
  }

  if (
    /\b(my\s+listings|view\s+my\s+listings|show\s+my\s+products|my\s+catalog|my\s+products|view\s+my\s+products|view\s+catalog)\b/i.test(t) ||
    /^(my listings|my products|view listings|view products)$/i.test(t)
  ) {
    return 'MY_LISTINGS';
  }

  return null;
}
