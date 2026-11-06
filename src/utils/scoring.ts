export interface DebtorTrustInput {
  phone: string;
  timeToSettlement: '1-3' | '4-7' | '8-14' | '14+' | 'not-paid';
  escalationDepth: 'sms-web' | 'email' | 'robocall' | 'disconnected';
  frequencyRecidivism: 'first-time' | 'multi-clean' | '3-or-more-merchants';
  transactionIntegrity: 'clicked-confirm' | 'disputed' | 'none';
}

export interface DebtorTrustResult {
  debtor_phone: string;
  trust_score: number;
  rating_tier: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical/Very Poor';
  score_color_code: 'Green' | 'Emerald' | 'Amber' | 'Orange' | 'Red';
  behavioral_summary: string;
  recommended_chaser_package: string;
}

export interface UserCollectionInput {
  userId: string;
  generatedInvoicesCount: number;
  loggedDebtsCount: number;
  recoverySuccessRate: number; // 0 to 100
  timeToAction: 'within-24h' | 'after-7d' | 'prompt-to-invoice' | 'standard';
  disputePercentage: number; // 0 to 100
}

export interface UserCollectionResult {
  user_id: string;
  collection_rating_percentage: number;
  rating_tier: 'Excellent' | 'Good' | 'Average' | 'Poor';
  score_color_code: 'Green' | 'Emerald' | 'Amber' | 'Red';
  business_insight: string;
  gamified_badge: string;
}

/**
 * Calculates Debtor Trust Score (300 to 850) based on FLOATE debt logs & prompt rules
 */
export function calculateDebtorTrustScore(input: DebtorTrustInput): DebtorTrustResult {
  let score = 600; // Baseline Starting Score

  // 1. Time-to-Settlement (35% Weight Rules)
  switch (input.timeToSettlement) {
    case '1-3':
      score += 50;
      break;
    case '4-7':
      score += 20;
      break;
    case '8-14':
      score -= 40;
      break;
    case '14+':
      score -= 100;
      break;
    case 'not-paid':
      score -= 50; // default unpaid penalty
      break;
  }

  // 2. Escalation Depth (30% Weight Rules)
  // Check if phone disconnected which acts as an absolute override
  if (input.escalationDepth === 'disconnected') {
    return {
      debtor_phone: input.phone,
      trust_score: 300,
      rating_tier: 'Critical/Very Poor',
      score_color_code: 'Red',
      behavioral_summary: 'Dossier flagged. The registered phone contact is disconnected, blocked, or invalid across GSM channels. Recoverability is critically low; legal or association escalation required.',
      recommended_chaser_package: 'Manual Dispute Resolution Guild Intervention'
    };
  }

  switch (input.escalationDepth) {
    case 'sms-web':
      score += 40;
      break;
    case 'email':
      score -= 10;
      break;
    case 'robocall':
      score -= 80;
      break;
  }

  // 3. Frequency & Volume Recidivism (20% Weight Rules)
  switch (input.frequencyRecidivism) {
    case 'first-time':
      // Maintain baseline (0 points change)
      break;
    case 'multi-clean':
      score += 30;
      break;
    case '3-or-more-merchants':
      score -= 120;
      break;
  }

  // 4. Transaction Integrity (15% Weight Rules)
  switch (input.transactionIntegrity) {
    case 'clicked-confirm':
      score += 35;
      break;
    case 'disputed':
      // Dispute is neutral (0 points change, freezes score rules)
      break;
    case 'none':
      break;
  }

  // Clamp overall score between [300, 850]
  const finalScore = Math.max(300, Math.min(850, score));

  // Determine tiers and suggestions
  let rating_tier: DebtorTrustResult['rating_tier'] = 'Fair';
  let score_color_code: DebtorTrustResult['score_color_code'] = 'Amber';
  let behavioral_summary = '';
  let recommended_chaser_package = '';

  if (finalScore >= 750) {
    rating_tier = 'Excellent';
    score_color_code = 'Emerald';
    behavioral_summary = 'Highly responsive trade partner. Demonstrates exceptional transactional integrity, rapid response rates, and minimal friction. High trust limit recommended.';
    recommended_chaser_package = 'Gentle SMS Remittance Links';
  } else if (finalScore >= 680) {
    rating_tier = 'Good';
    score_color_code = 'Green';
    behavioral_summary = 'Responsible trade account with consistent settlement behavior. Highly likely to clear dues within typical grace margins without heavy friction.';
    recommended_chaser_package = 'Mild Multi-Channel Automation (SMS + Web)';
  } else if (finalScore >= 600) {
    rating_tier = 'Fair';
    score_color_code = 'Amber';
    behavioral_summary = 'Mild payment delays reported. Settles balances mostly after minor reminders, but shows stable transaction logs overall.';
    recommended_chaser_package = 'Standard Campaign (Bi-weekly SMS & Email)';
  } else if (finalScore >= 500) {
    rating_tier = 'Poor';
    score_color_code = 'Orange';
    behavioral_summary = 'Frequent collection hurdles encountered. Requires repeated manual follow-ups, with slow payment confirmation intervals.';
    recommended_chaser_package = 'Aggressive Multi-Tier Chaser (SMS, Email, Dialect Robocall)';
  } else {
    rating_tier = 'Critical/Very Poor';
    score_color_code = 'Red';
    behavioral_summary = 'Extreme risk profile marked by multiple defaults. Persistent radio silence or multi-logged defaults across Floate network.';
    recommended_chaser_package = 'High-Escalation Robocall Blitz & Community Trade Blockade';
  }

  return {
    debtor_phone: input.phone,
    trust_score: finalScore,
    rating_tier,
    score_color_code,
    behavioral_summary,
    recommended_chaser_package
  };
}

/**
 * Calculates Merchant Collection Rating Percentage (0% to 100%) based on billing discipline
 */
export function calculateUserCollectionRating(input: UserCollectionInput): UserCollectionResult {
  let percentage = 70; // Starting baseline 70%

  // 1. Recovery Success Rate (40% Weight Rules)
  if (input.recoverySuccessRate > 80) {
    percentage += 20;
  } else if (input.recoverySuccessRate >= 50) {
    percentage += 5;
  } else {
    percentage -= 15;
  }

  // 2. Billing Discipline & Proactivity (30% Weight Rules)
  switch (input.timeToAction) {
    case 'within-24h':
      percentage += 15;
      break;
    case 'after-7d':
      percentage -= 10;
      break;
    case 'prompt-to-invoice':
      percentage += 5;
      break;
    case 'standard':
      break;
  }

  // 3. Dispute Rate Minimization (30% Weight Rules)
  if (input.disputePercentage < 5) {
    percentage += 10;
  } else if (input.disputePercentage > 20) {
    percentage -= 20;
  }

  // Clamp percentage between [0, 100]
  const finalPercentage = Math.max(0, Math.min(100, percentage));

  // Determine tiers, insights, and gamified badges
  let rating_tier: UserCollectionResult['rating_tier'] = 'Average';
  let score_color_code: UserCollectionResult['score_color_code'] = 'Amber';
  let business_insight = '';
  let gamified_badge = '';

  if (finalPercentage >= 90) {
    rating_tier = 'Excellent';
    score_color_code = 'Green';
    business_insight = 'Superb collection hygiene! Immediate chasing activation coupled with a high debtor success rate places your business in the top 5% of FLOATE merchant circles.';
    gamified_badge = '🏆 Golden Ledger Sovereign';
  } else if (finalPercentage >= 75) {
    rating_tier = 'Good';
    score_color_code = 'Emerald';
    business_insight = 'Healthy collections flow. Your proactive billing speed ensures high recovery efficiency, minimizing the need for manual debt write-offs.';
    gamified_badge = '🛡️ Active Chaser Centurion';
  } else if (finalPercentage >= 50) {
    rating_tier = 'Average';
    score_color_code = 'Amber';
    business_insight = 'Moderate performance. Accelerate cash collections by ensuring the Debt Chaser is deployed within 24 hours of invoice defaults.';
    gamified_badge = '⌛ Diligent Ledger Apprentice';
  } else {
    rating_tier = 'Poor';
    score_color_code = 'Red';
    business_insight = 'Suboptimal recovery habits. The backlog of overdue accounts is piling up. Use prompt-to-invoice guidelines to clarify terms before booking trade shipments.';
    gamified_badge = '🚨 Liquidity Risk Warden';
  }

  return {
    user_id: input.userId,
    collection_rating_percentage: finalPercentage,
    rating_tier,
    score_color_code,
    business_insight,
    gamified_badge
  };
}
