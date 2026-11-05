import React, { useState, useEffect } from "react";
import { Store, CheckCircle2, MessageCircle, MapPin, ChevronRight, ShieldCheck, Loader2 } from "lucide-react";
import { subscribeDatabaseBusinesses, DatabaseBusiness } from "../../services/businessService";

interface AllVendorsByLocationSectionProps {
  onOpenVendor: (slug: string) => void;
  onNavigateSearch: (query?: string, category?: string, maxPrice?: number, city?: string) => void;
}

export const AllVendorsByLocationSection: React.FC<AllVendorsByLocationSectionProps> = ({
  onOpenVendor,
  onNavigateSearch
}) => {
  const [businesses, setBusinesses] = useState<DatabaseBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>("All");

  useEffect(() => {
    const unsubscribe = subscribeDatabaseBusinesses((list) => {
      setBusinesses(list);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const cities = ["All", "Lagos", "Onitsha", "Awka", "Owerri", "Aba", "Abuja", "Kano"];

  const currentVendors = businesses.filter((b) => {
    if (selectedCity === "All") return true;
    const loc = `${b.city} ${b.marketLocation}`.toLowerCase();
    return loc.includes(selectedCity.toLowerCase());
  });

  return (
    <section className="w-full my-10 pt-6 border-t border-[#0A4D3C]/10">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0A4D3C] text-[#FACC15]">
              <Store className="w-5 h-5 font-black" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#13241F] uppercase tracking-tight">
              ALL VENDORS IN DATABASE
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#5B6E66] mt-1">
            Displaying live verified physical stalls and businesses from the authoritative market database
          </p>
        </div>

        {/* City Filter Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
          {cities.map((city) => {
            const isSelected = city === selectedCity;
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#0A4D3C] text-white shadow-md scale-105"
                    : "bg-white text-[#13241F] hover:bg-[#E6F4EA] border border-[#0A4D3C]/15"
                }`}
              >
                📍 {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Live Real Database Cards */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#0A4D3C]" />
          <span className="text-xs font-semibold">Loading real database businesses...</span>
        </div>
      ) : currentVendors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No businesses registered under {selectedCity} yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
          {currentVendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => onOpenVendor(vendor.id)}
              className="group relative bg-white rounded-2xl border border-[#0A4D3C]/12 p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer select-none active:scale-95"
            >
              <div>
                {/* Dual-Mode Avatar / Photo */}
                {vendor.hasImage && vendor.avatarUrl ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#13241F] mb-2 mx-auto border-2 border-[#0A4D3C]/20">
                    <img
                      src={vendor.avatarUrl}
                      alt={vendor.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#10B981] border-2 border-white rounded-full" />
                  </div>
                ) : (
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A4D3C] to-[#13241F] text-[#FDE047] font-black text-xs mb-2 mx-auto flex items-center justify-center border border-white/20 shadow-xs">
                    {vendor.initials}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-white rounded-full" />
                  </div>
                )}

                {/* Name & Verified Badge */}
                <div className="text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <h4 className="text-xs sm:text-sm font-black text-[#13241F] truncate group-hover:text-[#0A4D3C] transition-colors max-w-[110px]">
                      {vendor.businessName}
                    </h4>
                    {vendor.verified ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] fill-[#10B981] text-white shrink-0" />
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                        Not verified
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-extrabold text-[#0A4D3C] truncate">
                    {vendor.category}
                  </div>

                  <div className="text-[10px] font-semibold text-[#5B6E66] truncate">
                    📍 {vendor.marketLocation}
                  </div>
                </div>
              </div>

              {/* WhatsApp Action Footer */}
              <div className="pt-2 mt-2 border-t border-[#0A4D3C]/10 flex items-center justify-between">
                <span className={`text-[10px] font-extrabold ${vendor.verified ? 'text-[#10B981]' : 'text-amber-700'}`}>
                  {vendor.verified ? 'Verified Stall' : 'Not verified yet'}
                </span>

                <a
                  href={vendor.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-transform active:scale-90 shadow-xs cursor-pointer"
                  title={`Chat with ${vendor.businessName} on WhatsApp`}
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View More Button for Location */}
      <div className="pt-6 pb-2 flex justify-center">
        <button
          onClick={() => onNavigateSearch("", undefined, undefined, selectedCity === "All" ? undefined : selectedCity)}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs sm:text-sm font-black shadow-md border-2 border-[#13241F] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
        >
          <span>View All Database Vendors ({businesses.length})</span>
          <ChevronRight className="w-4 h-4 text-[#FACC15]" />
        </button>
      </div>
    </section>
  );
};
