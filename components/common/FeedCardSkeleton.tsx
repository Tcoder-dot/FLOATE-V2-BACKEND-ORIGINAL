import React from "react";

export const FeedCardSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white border border-[#123F16]/10 rounded-2xl p-2 sm:p-2.5 shadow-xs flex flex-col justify-between animate-pulse select-none">
      {/* Image Skeleton */}
      <div className="w-full h-28 sm:h-36 rounded-xl bg-gradient-to-r from-[#E8F5E9] via-[#C8E6C9] to-[#E8F5E9] relative overflow-hidden" />

      {/* Details Skeleton */}
      <div className="pt-2 px-0.5 flex flex-col gap-1.5 mt-1">
        <div className="w-20 h-4 rounded bg-[#E8F5E9]" />
        <div className="w-full h-3 rounded bg-[#E8F5E9]" />
        <div className="flex items-center justify-between pt-1 border-t border-[#123F16]/10 mt-0.5">
          <div className="w-16 h-3 rounded bg-[#E8F5E9]" />
          <div className="w-3 h-3 rounded-full bg-[#E8F5E9]" />
        </div>
      </div>
    </div>
  );
};
