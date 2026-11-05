import React from "react";

interface AdSlotProps {
  id?: string;
  placement?: string;
  city?: string;
}

/**
 * AdSlot Component:
 * Reserved slot for future non-intrusive single-card sponsor rows.
 * Per Floate spec: Returns null today (no popups, no interstitials).
 */
export const AdSlot: React.FC<AdSlotProps> = ({ id, placement, city }) => {
  return null;
};
