import React, { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle, MessageSquare, MessageCircle } from "lucide-react";
import { StatusItem } from "../../types/floate";
import { getVendorWhatsAppLink } from "../../services/floateConnection";

interface StatusViewerProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: StatusItem[];
  initialIndex?: number;
  onOpenVendor?: (slug: string) => void;
}

export const StatusViewer: React.FC<StatusViewerProps> = ({
  isOpen,
  onClose,
  statuses,
  initialIndex = 0,
  onOpenVendor
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, isOpen]);

  const currentStatus = statuses[currentIndex];

  // Preload next image only
  useEffect(() => {
    if (currentIndex + 1 < statuses.length) {
      const img = new Image();
      img.src = statuses[currentIndex + 1].preview_image;
    }
  }, [currentIndex, statuses]);

  // 15s Story Auto-Progress
  useEffect(() => {
    if (!isOpen || isPaused || !currentStatus) return;

    const intervalTime = 100; // 100ms
    const totalDuration = 15000; // 15 seconds
    const step = (intervalTime / totalDuration) * 100;

    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentIndex, isPaused, currentStatus]);

  const handleNext = () => {
    setProgress(0);
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!isOpen || !currentStatus) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex items-center justify-center animate-fade-in select-none">
      {/* Container limited for mobile/desktop aspect */}
      <div
        className="relative w-full h-full max-w-md bg-black flex flex-col justify-between overflow-hidden shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 flex gap-1.5 bg-gradient-to-b from-black/70 to-transparent">
          {statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width:
                    idx === currentIndex
                      ? `${progress}%`
                      : idx < currentIndex
                      ? "100%"
                      : "0%"
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header Strip: Vendor info & close */}
        <div className="absolute top-6 left-0 right-0 z-30 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => {
              if (onOpenVendor) {
                onOpenVendor(currentStatus.vendor_slug);
                onClose();
              }
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <img
              src={currentStatus.avatar_url}
              alt={currentStatus.vendor_name}
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs sm:text-sm font-semibold truncate max-w-[180px]">
                  {currentStatus.vendor_name}
                </span>
                {currentStatus.verified && (
                  <CheckCircle className="w-3.5 h-3.5 text-[#1B5E20] fill-white" />
                )}
              </div>
              <span className="text-[11px] text-white/80">{currentStatus.vendor_city} • Live now</span>
            </div>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus:outline-none"
            aria-label="Close status viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Photo / Visual */}
        <div className="relative w-full h-full flex items-center justify-center bg-[#000000]">
          <img
            src={currentStatus.preview_image}
            alt={currentStatus.caption || "Status update"}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Left / Right Tap Zones */}
          <div
            onClick={handlePrev}
            className="absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-pointer"
            aria-label="Previous status"
          />
          <div
            onClick={handleNext}
            className="absolute top-0 bottom-0 right-0 w-2/3 z-20 cursor-pointer"
            aria-label="Next status"
          />
        </div>

        {/* Bottom Caption & Vendor Action */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3">
          {currentStatus.caption && (
            <p className="text-white text-xs sm:text-sm leading-relaxed drop-shadow-sm font-normal">
              {currentStatus.caption}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                const waUrl = getVendorWhatsAppLink(
                  currentStatus.whatsapp_number || currentStatus.vendor_phone,
                  `Daily Status: ${currentStatus.caption || currentStatus.vendor_name}`
                );
                window.location.href = waUrl;
              }}
              className="flex-1 py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-[#123F16]" />
              <span>Reply on WhatsApp</span>
            </button>

            <button
              onClick={() => {
                if (onOpenVendor) {
                  onOpenVendor(currentStatus.vendor_slug);
                  onClose();
                }
              }}
              className="py-2.5 px-4 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Shop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
