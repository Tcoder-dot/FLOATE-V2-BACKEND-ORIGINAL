import React, { useState } from 'react';

const reportText = `Dear Backend Team,

This is a summary of the recent frontend developments that require synchronization with the backend API:

1. Business Registration: Implemented. User registers with details, including location (all Nigerian states) and category (informal sector).
2. Authentication & WhatsApp OTP: Implemented login flow using WhatsApp number. OTP is sent and verified via Floate AI WhatsApp integration.
3. Administrative Vetting: Added a workflow where registered businesses are set to a 'pending' state, waiting for manual admin approval.
4. Ads Management: Added components for managing and displaying ads.
5. UI Cleanup: Removed 'Informal Traders & Merchants' status indicator.

Please review these updates to align the API endpoints for business registration, OTP verification, and admin approval workflows.`;

export const BackendUpdateReport = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-bold mb-2">Backend Update Report</h2>
      <pre className="text-sm bg-gray-50 p-2 rounded mb-4 overflow-x-auto whitespace-pre-wrap">
        {reportText}
      </pre>
      <button
        onClick={handleCopy}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>
    </div>
  );
};
