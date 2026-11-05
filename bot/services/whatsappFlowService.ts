import { config } from '../config.js';
import { firestoreDb } from './firestoreService.js';

export interface FlowDeploymentResult {
  flowKey: string;
  name: string;
  flowId?: string;
  status: 'PUBLISHED' | 'DRAFT' | 'FAILED' | 'SKIPPED';
  error?: string;
}

// In-memory cache for deployed flow IDs
let cachedFlowIds: Record<string, string> = {};

/**
 * 1. SafePay Deal Creation Flow JSON Schema (Meta Flow Version 6.3)
 */
export const SAFEPAY_CREATION_FLOW_JSON = {
  version: '6.3',
  screens: [
    {
      id: 'SAFEPAY_FORM',
      title: 'Floate SafePay Escrow',
      terminal: true,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'TextHeading',
            text: 'Create Protected SafePay Deal',
          },
          {
            type: 'TextSubheading',
            text: 'Your payment is safely held in escrow until you inspect and accept your delivery.',
          },
          {
            type: 'TextInput',
            name: 'seller_phone',
            label: 'Seller WhatsApp',
            required: true,
            'input-type': 'phone',
            'helper-text': 'e.g. 0803 123 4567',
          },
          {
            type: 'TextInput',
            name: 'item_description',
            label: 'Product Name',
            required: true,
            'input-type': 'text',
            'helper-text': 'e.g. Nike Air Jordan 4 (Size 43) or 1KVA Solar Inverter',
          },
          {
            type: 'TextInput',
            name: 'agreed_amount',
            label: 'Agreed Amount (₦)',
            required: true,
            'input-type': 'number',
            'helper-text': 'Enter amount in Naira (e.g. 45000)',
          },
          {
            type: 'Dropdown',
            name: 'delivery_type',
            label: 'Delivery Method',
            required: true,
            'data-source': [
              { id: 'local_dispatch', title: 'Local Dispatch / Rider' },
              { id: 'interstate_waybill', title: 'Interstate Waybill' },
              { id: 'in_person_pickup', title: 'In-Person Store Pickup' },
            ],
          },
          {
            type: 'TextInput',
            name: 'delivery_city',
            label: 'Destination City',
            required: true,
            'input-type': 'text',
            'helper-text': 'e.g. Lagos (Ikeja), Abuja (Wuse 2), Onitsha',
          },
          {
            type: 'TextInput',
            name: 'additional_notes',
            label: 'Notes (Optional)',
            required: false,
            'input-type': 'text',
            'helper-text': 'Any color, size, or waybill driver notes',
          },
          {
            type: 'Footer',
            label: 'Lock Funds in SafePay',
            'on-click-action': {
              name: 'complete',
              payload: {
                flow_action: 'CREATE_SAFEPAY_DEAL',
                seller_phone: '${form.seller_phone}',
                item_description: '${form.item_description}',
                agreed_amount: '${form.agreed_amount}',
                delivery_type: '${form.delivery_type}',
                delivery_city: '${form.delivery_city}',
                additional_notes: '${form.additional_notes}',
              },
            },
          },
        ],
      },
    },
  ],
};

/**
 * 2. Merchant Onboarding & Bank Payout Flow JSON Schema (Meta Flow Version 6.3)
 */
export const MERCHANT_ONBOARDING_FLOW_JSON = {
  version: '6.3',
  screens: [
    {
      id: 'MERCHANT_REGISTER',
      title: 'Register Store',
      terminal: true,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'TextHeading',
            text: '60-Second Store Registration',
          },
          {
            type: 'TextSubheading',
            text: 'Connect with thousands of buyers across Nigeria and receive instant SafePay payouts.',
          },
          {
            type: 'TextInput',
            name: 'owner_full_name',
            label: 'Full Name',
            required: true,
            'input-type': 'text',
            'helper-text': 'First and Last name (letters only, e.g. Emeka Okafor)',
          },
          {
            type: 'TextInput',
            name: 'business_name',
            label: 'Store / Shop Name',
            required: true,
            'input-type': 'text',
            'helper-text': 'e.g. Divine Footwear Collection',
          },
          {
            type: 'Dropdown',
            name: 'business_type',
            label: 'Business Operation Model',
            required: true,
            'data-source': [
              { id: 'physical_stall', title: '🏬 Physical Stall / Shop in Market' },
              { id: 'dropshipper_online', title: '📦 Dropshipper / Online Merchant (No Shop)' },
            ],
          },
          {
            type: 'TextInput',
            name: 'shop_address',
            label: 'Shop Address (Recommended)',
            required: false,
            'input-type': 'text',
            'helper-text': 'Recommended for physical stalls (e.g. Shop B14, Line 3). Leave blank if dropshipper.',
          },
          {
            type: 'Dropdown',
            name: 'market_location',
            label: 'Primary Market / Hub',
            required: true,
            'data-source': [
              { id: 'online_nationwide', title: '🌐 Online / Dropshipping (Nationwide)' },
              { id: 'balogun_market_lagos', title: 'Balogun / Idumota (Lagos)' },
              { id: 'computer_village_lagos', title: 'Computer Village (Lagos)' },
              { id: 'alaba_intl_lagos', title: 'Alaba Int\'l Market (Lagos)' },
              { id: 'onitsha_main_market', title: 'Onitsha Main Market' },
              { id: 'trade_fair_lagos', title: 'Trade Fair Complex (Lagos)' },
              { id: 'ariaria_market_aba', title: 'Ariaria Int\'l Market (Aba)' },
              { id: 'wuse_market_abuja', title: 'Wuse Market (Abuja)' },
              { id: 'mile_12_lagos', title: 'Mile 12 Market (Lagos)' },
              { id: 'oil_mill_ph', title: 'Oil Mill Market (PH)' },
              { id: 'other_nigerian_market', title: 'Other Nigerian Market' },
            ],
          },
          {
            type: 'Dropdown',
            name: 'category',
            label: 'Store Category',
            required: true,
            'data-source': [
              { id: 'fashion_footwear', title: 'Fashion, Shoes, Bags & Purses' },
              { id: 'electronics_gadgets', title: 'Electronics & Audio' },
              { id: 'phones_laptops', title: 'Phones, PCs & Accessories' },
              { id: 'beauty_hair', title: 'Beauty, Cosmetics & Hair' },
              { id: 'solar_inverter', title: 'Solar Panels & Inverters' },
              { id: 'auto_parts', title: 'Automobile & Spare Parts' },
              { id: 'groceries_food', title: 'Food, Drinks & Groceries' },
              { id: 'home_appliances', title: 'Home & Kitchen Appliances' },
            ],
          },
          {
            type: 'Footer',
            label: 'Complete Store Setup',
            'on-click-action': {
              name: 'complete',
              payload: {
                flow_action: 'REGISTER_MERCHANT',
                owner_full_name: '${form.owner_full_name}',
                business_name: '${form.business_name}',
                business_type: '${form.business_type}',
                shop_address: '${form.shop_address}',
                market_location: '${form.market_location}',
                category: '${form.category}',
              },
            },
          },
        ],
      },
    },
  ],
};

/**
 * 3. Market Directory & Multi-Criteria Filter Flow JSON Schema (Meta Flow Version 6.3)
 */
export const MARKET_DIRECTORY_FILTER_FLOW_JSON = {
  version: '6.3',
  screens: [
    {
      id: 'FILTER_SCREEN',
      title: 'Filter Markets',
      terminal: true,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'TextHeading',
            text: 'Find Verified Vendors',
          },
          {
            type: 'TextInput',
            name: 'search_query',
            label: 'Search Product',
            required: false,
            'input-type': 'text',
            'helper-text': 'e.g. Chelsea boots, iPhone 13, Solar Inverter',
          },
          {
            type: 'Dropdown',
            name: 'selected_market',
            label: 'Select Market Hub',
            required: true,
            'data-source': [
              { id: 'all_nigeria', title: '🇳🇬 All Markets (Nationwide)' },
              { id: 'onitsha_main_market', title: '📍 Onitsha Main Market' },
              { id: 'alaba_intl_lagos', title: '📍 Alaba Int\'l (Lagos)' },
              { id: 'computer_village_lagos', title: '📍 Computer Village (Ikeja)' },
              { id: 'trade_fair_lagos', title: '📍 Trade Fair (Lagos)' },
              { id: 'ariaria_market_aba', title: '📍 Ariaria Int\'l (Aba)' },
              { id: 'balogun_market_lagos', title: '📍 Balogun / Idumota' },
              { id: 'wuse_market_abuja', title: '📍 Wuse Market (Abuja)' },
              { id: 'oil_mill_ph', title: '📍 Port Harcourt (Rivers)' },
            ],
          },
          {
            type: 'Dropdown',
            name: 'price_range',
            label: 'Budget Range',
            required: false,
            'data-source': [
              { id: 'any_price', title: 'Any Price Range' },
              { id: 'under_20k', title: 'Under ₦20,000' },
              { id: '20k_to_50k', title: '₦20,000 – ₦50,000' },
              { id: '50k_to_150k', title: '₦50,000 – ₦150,000' },
              { id: 'above_150k', title: 'Above ₦150,000' },
            ],
          },
          {
            type: 'CheckboxGroup',
            name: 'trust_filters',
            label: 'Trust Level',
            required: false,
            'data-source': [
              { id: 'verified_only', title: 'Verified Merchants Only 🟢' },
              { id: 'safepay_ready', title: 'SafePay Escrow Protected 🛡️' },
            ],
          },
          {
            type: 'Footer',
            label: 'Search Directory',
            'on-click-action': {
              name: 'complete',
              payload: {
                flow_action: 'FILTER_MARKET_DIRECTORY',
                search_query: '${form.search_query}',
                selected_market: '${form.selected_market}',
                price_range: '${form.price_range}',
                trust_filters: '${form.trust_filters}',
              },
            },
          },
        ],
      },
    },
  ],
};

/**
 * Loads flow IDs from Firestore or memory
 */
export async function getDeployedFlowIds(): Promise<Record<string, string>> {
  if (Object.keys(cachedFlowIds).length > 0) {
    return cachedFlowIds;
  }

  try {
    const configDoc = await firestoreDb.getSystemConfigDoc('whatsapp_flows');
    if (configDoc && configDoc.flowIds) {
      cachedFlowIds = configDoc.flowIds;
      return cachedFlowIds;
    }
  } catch (err) {
    console.warn('[WhatsApp Flows] Could not fetch saved flow IDs from Firestore:', err);
  }

  return cachedFlowIds;
}

/**
 * Saves deployed flow IDs to Firestore
 */
export async function saveDeployedFlowIds(flowIds: Record<string, string>): Promise<void> {
  cachedFlowIds = { ...cachedFlowIds, ...flowIds };
  try {
    await firestoreDb.saveSystemConfigDoc('whatsapp_flows', {
      flowIds: cachedFlowIds,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[WhatsApp Flows] Could not persist flow IDs to Firestore:', err);
  }
}

/**
 * Resolves the true WhatsApp Business Account (WABA) ID from config or Phone Number ID
 */
async function resolveWabaId(token: string, rawWabaId?: string, phoneId?: string): Promise<string> {
  const cleanRawWaba = (rawWabaId || '').trim();
  const cleanPhoneId = (phoneId || '').trim();

  // If a phone number ID is available, verify or retrieve the associated WABA ID
  if (cleanPhoneId) {
    try {
      const inspectUrl = `https://graph.facebook.com/v21.0/${cleanPhoneId}?fields=whatsapp_business_account,id`;
      const inspectRes = await fetch(inspectUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inspectData: any = await inspectRes.json();
      if (inspectData?.whatsapp_business_account?.id) {
        console.log(`[WhatsApp Flow Deployer] 🔍 Auto-resolved WABA ID: ${inspectData.whatsapp_business_account.id} (from Phone ID: ${cleanPhoneId})`);
        return inspectData.whatsapp_business_account.id;
      }
    } catch (err) {
      console.warn('[WhatsApp Flow Deployer] Could not inspect phone node for WABA ID:', err);
    }
  }

  return cleanRawWaba || cleanPhoneId;
}

/**
 * Automatically deploys a single Flow to Meta's WhatsApp Business Platform
 */
export async function deploySingleFlow(params: {
  flowKey: string;
  name: string;
  flowJson: any;
}): Promise<FlowDeploymentResult> {
  const { flowKey, name, flowJson } = params;
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || config.whatsappAccessToken || '').trim();
  const rawWabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WHATSAPP_WABA_ID || config.whatsappBusinessAccountId || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || config.whatsappPhoneNumberId || '').trim();

  if (!token || (!rawWabaId && !phoneId)) {
    return {
      flowKey,
      name,
      status: 'SKIPPED',
      error: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID is not configured.',
    };
  }

  const wabaId = await resolveWabaId(token, rawWabaId, phoneId);

  try {
    console.log(`[WhatsApp Flow Deployer] 🚀 Step 1: Checking or creating Flow container for "${name}" on WABA ${wabaId}...`);

    let flowId = '';

    // Step 1a: Check if a Flow with this name already exists in this WABA
    try {
      const listUrl = `https://graph.facebook.com/v21.0/${wabaId}/flows`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData: any = await listRes.json();
      if (listRes.ok && Array.isArray(listData?.data)) {
        const existing = listData.data.find((f: any) => f.name === name);
        if (existing?.id) {
          flowId = existing.id;
          console.log(`[WhatsApp Flow Deployer] ♻️ Found existing Flow "${name}" (ID: ${flowId}). Reusing container for update...`);
        }
      }
    } catch (checkErr) {
      console.warn('[WhatsApp Flow Deployer] Existing flow check warning:', checkErr);
    }

    // Step 1b: If not found, create new Flow container
    if (!flowId) {
      const createUrl = `https://graph.facebook.com/v21.0/${wabaId}/flows`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          categories: ['OTHER'],
        }),
      });

      const createData: any = await createRes.json();
      if (!createRes.ok || !createData.id) {
        const errorDetail = createData?.error
          ? `${createData.error.message}${createData.error.error_user_msg ? ': ' + createData.error.error_user_msg : ''} (code: ${createData.error.code})`
          : JSON.stringify(createData);
        console.error(`[WhatsApp Flow Deployer] ❌ Flow container creation failed:`, errorDetail);
        return { flowKey, name, status: 'FAILED', error: errorDetail };
      }
      flowId = createData.id;
      console.log(`[WhatsApp Flow Deployer] ✅ Flow created with ID: ${flowId}. Uploading flow.json asset...`);
    }

    // Step 2: Upload flow.json asset using FormData
    const assetUrl = `https://graph.facebook.com/v21.0/${flowId}/assets`;
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(flowJson, null, 2)], { type: 'application/json' });
    formData.append('name', 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');
    formData.append('file', jsonBlob, 'flow.json');

    const assetRes = await fetch(assetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const assetData: any = await assetRes.json();
    if (!assetRes.ok || assetData.success === false) {
      const errorMsg = assetData?.error?.message || JSON.stringify(assetData);
      console.error(`[WhatsApp Flow Deployer] ❌ Flow asset upload failed:`, errorMsg);
      return { flowKey, name, flowId, status: 'FAILED', error: errorMsg };
    }

    console.log(`[WhatsApp Flow Deployer] ✅ Asset uploaded. Step 3: Publishing Flow ${flowId}...`);

    // Step 3: Publish the Flow
    const publishUrl = `https://graph.facebook.com/v21.0/${flowId}/publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const publishData: any = await publishRes.json();
    if (!publishRes.ok || publishData.success === false) {
      const errorMsg = publishData?.error?.message || JSON.stringify(publishData);
      console.warn(`[WhatsApp Flow Deployer] ⚠️ Publish step warning (Flow may be in DRAFT):`, errorMsg);
      // Even in DRAFT, it can be tested in developer mode
      return { flowKey, name, flowId, status: 'DRAFT', error: errorMsg };
    }

    console.log(`[WhatsApp Flow Deployer] 🎉 Flow "${name}" successfully PUBLISHED! ID: ${flowId}`);
    return { flowKey, name, flowId, status: 'PUBLISHED' };
  } catch (err: any) {
    console.error(`[WhatsApp Flow Deployer Fatal]:`, err);
    return { flowKey, name, status: 'FAILED', error: err?.message || String(err) };
  }
}

/**
 * Handles incoming Flow submissions (from nfm_reply webhook)
 */
export async function handleFlowSubmission(params: {
  senderPhone: string;
  senderName: string;
  responseJson: string;
}): Promise<{ handled: boolean; action: string; summary?: string }> {
  const { senderPhone, senderName, responseJson } = params;

  try {
    const data = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
    const action = data?.flow_action || data?.action;

    console.log(`[WhatsApp Flow Engine] 📥 Processing Flow Submission: "${action}" from +${senderPhone}`, data);

    if (action === 'CREATE_SAFEPAY_DEAL') {
      const sellerPhone = data.seller_phone;
      const item = data.item_description || 'Commercial Merchandise';
      const amount = parseFloat(data.agreed_amount) || 0;
      const deliveryType = data.delivery_type || 'local_dispatch';
      const city = data.delivery_city || '';

      return {
        handled: true,
        action: 'CREATE_SAFEPAY_DEAL',
        summary: `SafePay created for ${item} (₦${amount.toLocaleString()}) to seller +${sellerPhone}`,
      };
    }

    if (action === 'REGISTER_MERCHANT') {
      const ownerFullName = data.owner_full_name || senderName;
      const businessName = data.business_name || 'Commercial Store';
      const businessType = data.business_type || (data.shop_address ? 'physical_stall' : 'dropshipper_online');
      const shopAddress = data.shop_address || '';
      const marketLocation = data.market_location || 'Lagos';
      const category = data.category || 'General Commercial';
      const payoutBank = data.payout_bank;
      const accountNumber = data.account_number;

      const verificationRef = `FLT-VR-${Math.floor(100000 + Math.random() * 900000)}`;
      const verificationToken = Buffer.from(`${senderPhone}_${Date.now()}`).toString('hex').slice(0, 24);

      // Save merchant profile directly to Firestore
      await firestoreDb.saveMerchant({
        id: senderPhone,
        businessName,
        ownerFullName,
        whatsapp: senderPhone,
        city: marketLocation,
        category,
        businessModel: businessType,
        shopAddress: shopAddress || undefined,
        verificationRef,
        verificationToken,
        ...(payoutBank ? { payoutBankName: payoutBank } : {}),
        ...(accountNumber ? { payoutAccountNumber: accountNumber } : {}),
        isVerified: false,
        identityVerified: false,
        verifiedStatus: 'PENDING',
        verificationStatus: 'PENDING_VISUAL',
        credit_balance: 25, // 25 free buyer leads upon onboarding
        status: 'ACTIVE',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // Create persistent verification session in Firestore
      await firestoreDb.createVerificationSession({
        id: verificationToken,
        token: verificationToken,
        ref: verificationRef,
        phone: senderPhone,
        businessName,
        ownerFullName,
        businessModel: businessType,
        shopAddress: shopAddress || undefined,
        marketLocation,
        category,
        status: 'PENDING_VISUAL',
        createdAt: new Date().toISOString(),
      });

      return {
        handled: true,
        action: 'REGISTER_MERCHANT',
        summary: `Store "${businessName}" successfully registered for ${ownerFullName} (+${senderPhone}) with verification ref ${verificationRef}`,
        verificationRef,
        verificationToken,
      } as any;
    }

    if (action === 'FILTER_MARKET_DIRECTORY') {
      return {
        handled: true,
        action: 'FILTER_MARKET_DIRECTORY',
        summary: `Filtered directory for ${data.search_query || 'All'} in ${data.selected_market}`,
      };
    }

    return { handled: false, action: action || 'UNKNOWN' };
  } catch (err) {
    console.error('[WhatsApp Flow Submission Parse Error]:', err);
    return { handled: false, action: 'ERROR' };
  }
}

/**
 * 1-Click Automated Deployment of All Core WhatsApp Flows for Floate
 */
export async function deployAllWhatsAppFlows(): Promise<{
  success: boolean;
  results: FlowDeploymentResult[];
  activeFlowIds: Record<string, string>;
}> {
  const flowsToDeploy = [
    {
      flowKey: 'safepay_create',
      name: 'floate_safepay_flow',
      flowJson: SAFEPAY_CREATION_FLOW_JSON,
    },
    {
      flowKey: 'merchant_register',
      name: 'floate_merchant_flow',
      flowJson: MERCHANT_ONBOARDING_FLOW_JSON,
    },
    {
      flowKey: 'market_filter',
      name: 'floate_market_filter_flow',
      flowJson: MARKET_DIRECTORY_FILTER_FLOW_JSON,
    },
  ];

  const results: FlowDeploymentResult[] = [];
  const activeFlowIds: Record<string, string> = { ...(await getDeployedFlowIds()) };

  for (const item of flowsToDeploy) {
    const res = await deploySingleFlow(item);
    results.push(res);
    if (res.flowId) {
      activeFlowIds[res.flowKey] = res.flowId;
    }
  }

  await saveDeployedFlowIds(activeFlowIds);

  const allSuccess = results.every((r) => r.status === 'PUBLISHED' || r.status === 'DRAFT');
  return {
    success: allSuccess,
    results,
    activeFlowIds,
  };
}
