import { GoogleGenAI, Type } from '@google/genai';

export interface SafetyAuditResult {
  decision: 'AUTO_APPROVE' | 'PENDING_REVIEW' | 'HARD_BLOCK';
  reason: string;
  categoryFlags: string[];
}

/**
 * Gemini Safety & Compliance Auditor for new business registrations (/register).
 * Analyzes submitted Business Name, Category, and Product/Service Description.
 * 
 * 1. HARD_BLOCK:
 *    - Selling phone numbers, SIM cards for resale/OTP/verification bypass, virtual numbers.
 *    - Selling login credentials, stolen logins, unauthorized account access (e.g. streaming, banking, social accounts).
 *    - Explicit fraud-enabling services (counterfeit money, fake IDs, forged docs, carding/hacking tools).
 * 
 * 2. PENDING_REVIEW:
 *    - Drugs, pharmaceuticals, medications, drug paraphernalia.
 *    - Alcohol (wines, spirits, beers).
 *    - Tobacco, cigarettes, cigars, vapes, e-cigarettes, nicotine liquids.
 *    - Regulated or age-restricted merchandise.
 * 
 * 3. AUTO_APPROVE:
 *    - Standard legitimate commerce (fashion, electronics, laptops, home goods, catering, auto parts, professional services).
 */
export async function auditBusinessRegistrationWithGemini(details: {
  businessName: string;
  category: string;
  productDescription: string;
}): Promise<SafetyAuditResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[SafetyAudit] GEMINI_API_KEY is not set. Defaulting to AUTO_APPROVE.');
    return {
      decision: 'AUTO_APPROVE',
      reason: 'Safety auditor bypassed (API key missing)',
      categoryFlags: [],
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are the chief risk, compliance, and anti-fraud auditor for FLOATE, a Nigerian commerce marketplace.
Analyze the following new merchant registration details:
- Business Name: "${details.businessName}"
- Category: "${details.category}"
- Products/Services Description: "${details.productDescription}"

Evaluate strictly against these 3 policies:

1. HARD_BLOCK (Immediate rejection, fraudulent or scam infrastructure):
- Selling phone numbers, SIM cards for resale/OTP/verification bypass, bulk virtual numbers.
- Selling login credentials, account access, cracked or stolen accounts (e.g. Netflix, bank logs, VPN logins, social accounts).
- Any explicitly fraud-enabling service (fake IDs, fake certificates/documents, carding tools, hacking tools, counterfeit money).

2. PENDING_REVIEW (Hold for human admin approval, regulated or age-restricted goods):
- Prescription drugs, chemical pharmaceuticals, drug paraphernalia.
- Alcohol (wines, spirits, beers, liquors).
- Tobacco, cigarettes, cigars, vapes, e-cigarettes, shisha, nicotine pouches/e-liquids.
- Any other regulated, adult, or age-restricted goods.

3. AUTO_APPROVE (Standard legitimate trade):
- Fashion, shoes, bags, electronics, phones & gadgets, computers, furniture, groceries, beauty, food catering, automotive parts, carpentry, tailoring, professional services, etc.

Return a valid JSON object matching the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: {
              type: Type.STRING,
              enum: ['AUTO_APPROVE', 'PENDING_REVIEW', 'HARD_BLOCK'],
              description: 'The safety decision.',
            },
            reason: {
              type: Type.STRING,
              description: 'Concise explanation for this classification.',
            },
            categoryFlags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific flagged terms or compliance categories.',
            },
          },
          required: ['decision', 'reason', 'categoryFlags'],
        },
      },
    });

    const parsed: SafetyAuditResult = JSON.parse(response.text || '{}');
    if (parsed.decision) {
      return parsed;
    }
  } catch (err: any) {
    console.error('[Registration Safety Audit Error]:', err?.message || err);
  }

  return {
    decision: 'AUTO_APPROVE',
    reason: 'Standard commerce approval',
    categoryFlags: [],
  };
}
