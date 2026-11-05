import React from "react";
import { LoaderCircle } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Opening Verified Stall...",
  subtitle = "Please wait while we load the next step.",
  fullScreen = true
}) => {
  return (
    <div
      className={`${
        fullScreen ? "fixed inset-0 z-50 min-h-screen w-full" : "w-full min-h-[200px] py-12"
      } bg-[#F7F7F2] text-[#13241F] flex flex-col items-center justify-center px-6 py-10 text-center font-sans antialiased relative overflow-hidden`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#123F16]" aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#123F16]/15 bg-white text-[#123F16] shadow-sm">
          <LoaderCircle className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>

        <div className="w-full space-y-2">
          <p className="text-xs font-extrabold text-[#0A4D3C]">FLOATE</p>
          <h3 className="text-base font-bold leading-snug text-[#13241F] sm:text-lg">
            {message}
          </h3>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#5B6E66]">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
