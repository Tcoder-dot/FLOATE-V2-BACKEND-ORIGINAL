import React, { useState, useEffect } from "react";
import { WifiOff, Zap } from "lucide-react";

interface OfflineIndicatorProps {
  onOpenOfflineDrawer?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onOpenOfflineDrawer }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[500px]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#123F16] text-white rounded-xl shadow-lg border border-[#1B5E20] text-xs animate-bounce-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 text-[#FFC107] flex-shrink-0" />
          <span className="truncate font-medium">
            Offline Mode — Showing cached searched items
          </span>
        </div>
        {onOpenOfflineDrawer && (
          <button
            onClick={onOpenOfflineDrawer}
            className="flex items-center gap-1 bg-[#1B5E20] hover:bg-[#2E7D32] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition flex-shrink-0"
          >
            <Zap className="w-3 h-3 text-[#FFC107]" />
            <span>Saved Items</span>
          </button>
        )}
      </div>
    </div>
  );
};
