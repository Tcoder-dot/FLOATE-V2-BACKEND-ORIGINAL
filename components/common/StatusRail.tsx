import React, { useState, useEffect } from "react";
import { StatusItem } from "../../types/floate";
import { StatusViewer } from "./StatusViewer";
import { api } from "../../services/api";
import { connectLiveStatuses } from "../../services/floateConnection";

interface StatusRailProps {
  statuses?: StatusItem[];
  currentCity?: string;
  onOpenVendor?: (slug: string) => void;
  isProfileMode?: boolean;
}

export const StatusRail: React.FC<StatusRailProps> = ({
  statuses: propStatuses,
  currentCity,
  onOpenVendor,
  isProfileMode = false
}) => {
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [fetchedStatuses, setFetchedStatuses] = useState<StatusItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch live statuses if currentCity is provided and propStatuses is not supplied
  useEffect(() => {
    if (propStatuses && propStatuses.length > 0) return;

    let isMounted = true;
    setIsLoading(true);

    if (currentCity) {
      api.getHome(currentCity)
        .then((res) => {
          if (isMounted && res.success && res.status_rings) {
            setFetchedStatuses(res.status_rings);
          }
        })
        .catch((err) => {
          console.warn("[StatusRail] Error fetching live statuses:", err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    // 2. Real-Time 24h Status Stories Sync via connectLiveStatuses
    const unsubscribe = connectLiveStatuses((liveStatuses) => {
      if (isMounted && liveStatuses && liveStatuses.length > 0) {
        const mapped: StatusItem[] = liveStatuses.map((s: any) => ({
          id: s.id,
          vendor_slug: s.vendor_slug || s.slug || "vendor",
          vendor_name: s.vendor_name || s.name || "Verified Stall",
          vendor_city: s.city || currentCity || "Lagos",
          avatar_url: s.avatar_url || s.image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
          verified: true,
          preview_image: s.preview_image || s.image_url || s.photo_url,
          caption: s.caption || s.text || "",
          created_at: s.created_at || new Date().toISOString(),
          expires_at: s.expires_at || new Date(Date.now() + 24 * 3600000).toISOString(),
          whatsapp_number: s.whatsapp_number || s.whatsapp || s.vendorPhone || s.vendor_phone,
          vendor_phone: s.vendorPhone || s.vendor_phone || s.whatsapp_number || s.whatsapp
        }));
        setFetchedStatuses(mapped);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentCity, propStatuses]);

  // Combine and filter active statuses
  const rawStatuses = (propStatuses && propStatuses.length > 0) ? propStatuses : fetchedStatuses;

  // Filter out any expired items if expires_at is in the past
  const nowIso = new Date().toISOString();
  const activeStatuses = rawStatuses.filter((s) => {
    if (!s.expires_at) return true;
    return s.expires_at > nowIso;
  });

  // Hide row if <1 active status
  if (isLoading || activeStatuses.length < 1) {
    return null;
  }

  // Maximum 8 rings for home, 5 for profile
  const displayedStatuses = activeStatuses.slice(0, isProfileMode ? 5 : 8);

  return (
    <div className={`w-full ${isProfileMode ? "py-2" : "py-3"}`}>
      {/* Horizontal Scroll Track: 12px gap (gap-3), 72px rings */}
      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar px-1 py-1">
        {displayedStatuses.map((status, index) => {
          return (
            <button
              key={status.id || index}
              onClick={() => setSelectedStatusIndex(index)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
              aria-label={`View status story from ${status.vendor_name}`}
            >
              {/* Outer Ring with 72px width/height and Purple Gradient Stroke */}
              <div className="relative p-[2.5px] rounded-full bg-floate-gradient group-hover:scale-105 transition-transform duration-200 shadow-sm flex-shrink-0">
                <div className="p-[2px] bg-[#FAFAFA] rounded-full">
                  <img
                    src={status.avatar_url || status.preview_image}
                    alt={status.vendor_name}
                    className="w-[72px] h-[72px] rounded-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Vendor Caption: 11px #6B6572 */}
              <span className="text-[11px] font-medium text-[#6B6572] truncate max-w-[72px] text-center">
                {isProfileMode ? `Status ${index + 1}` : status.vendor_name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full-Screen Story Viewer Modal */}
      {selectedStatusIndex !== null && (
        <StatusViewer
          isOpen={selectedStatusIndex !== null}
          onClose={() => setSelectedStatusIndex(null)}
          statuses={displayedStatuses}
          initialIndex={selectedStatusIndex}
          onOpenVendor={onOpenVendor}
        />
      )}
    </div>
  );
};
