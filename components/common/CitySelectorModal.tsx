import React from "react";
import { X, Check, MapPin } from "lucide-react";

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  availableCities: string[];
  onSelectCity: (city: string) => void;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  onClose,
  currentCity,
  availableCities,
  onSelectCity
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-[20px] sm:rounded-2xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
              <MapPin className="w-4 h-4 text-[#1B5E20]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111111]">Select Market City</h2>
              <p className="text-xs text-[#666666]">Browse verified shops in your region</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F7F7F2] text-[#666666] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          {availableCities.map((city) => {
            const isSelected = city.toLowerCase() === currentCity.toLowerCase();
            return (
              <button
                key={city}
                onClick={() => {
                  onSelectCity(city);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[#1B5E20] bg-[#E8F5E9]/50 text-[#111111] font-semibold"
                    : "border-slate-200 bg-[#F7F7F2] hover:bg-[#E8F5E9]/30 text-[#111111] font-normal"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-[#1B5E20]" : "bg-slate-300"}`} />
                  <span className="text-sm">{city}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1B5E20]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
