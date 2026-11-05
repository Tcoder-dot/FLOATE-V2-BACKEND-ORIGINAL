export interface LogEntry {
  id: string;
  type: 'email' | 'sms' | 'call' | 'status_change';
  timestamp: string;
  text: string;
  status: 'delivered' | 'failed' | 'read' | 'completed' | 'opened';
  openedAt?: string;
  readerDevice?: string;
  readerLocation?: string;
}

export interface Debtor {
  id: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  receiptName: string | null;
  receiptUrl: string | null;
  remindStyle: 'GENTLE' | 'AGGRESSIVE' | 'CUSTOM' | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'PAUSED';
  remindersCount: number;
  lastRemindedAt: string | null;
  createdAt: string;
  history: LogEntry[];
  ownerId?: string;

  sequenceMode?: 'FRIENDLY' | 'ENFORCEMENT';

  // SMART AI-oriented attributes
  merchantBusinessName?: string;
  merchantLocation?: string;
  merchantEthnicity?: string;
  merchantWhatTheySell?: string;
  debtorLocation?: string;
  paymentDueDate?: string;
  isFreelancer?: boolean;
  
  // Data Integrity & Fraud Verification fields
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISPUTED';
  verificationOcrLog?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  isMouthToMouth?: boolean;
  handshakeStatus?: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DECLINED';
}

export interface UserState {
  isLoggedIn: boolean;
  isSandbox?: boolean;
  name: string;
  email: string;
  credits: number;
  subscriptionTier: 'FREE' | 'HUSTLER' | 'MERCHANT' | 'PAY_AS_YOU_GO' | 'STARTER' | 'PRO';
  escrowBalance?: number;
  isBlacklisted?: boolean;
  
  // Compliance & Onboarding fields
  phone?: string;
  realName?: string;
  businessName?: string;
  businessCategory?: string;
  cacNumber?: string;
  businessAddress?: string;
  onboardingCompleted?: boolean;
  creditScore?: number;
  location?: string;
  profession?: string;
  referralSource?: string;
  paymentChallenge?: string;

  // Custom Communications Integrations
  resendApiKey?: string;
  senderEmail?: string;

  // Remittance / Custom Bank details
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  ownerId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  currency: string;
  
  // From/Sender
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  logoUrl?: string;

  // To/Client
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;

  // Invoice Items
  items: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;

  // Remittance / Bank Details
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  notes?: string;

  createdAt: string;
}
