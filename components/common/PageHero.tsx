import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageHeroProps {
  microLabel?: string;
  titleLine1: string;
  titleLine2?: string;
  subtitle?: string;
  variant?: 'compact' | 'full';
  children?: React.ReactNode;
}

export const PageHero: React.FC<PageHeroProps> = ({
  microLabel,
  titleLine1,
  titleLine2,
  subtitle,
  variant = 'compact',
  children
}) => {
  return (
    <section 
      className={`relative bg-gradient-to-br from-[#1B5E20] via-[#123F16] to-[#0A290E] text-white ${
        variant === 'full' ? 'pt-32 sm:pt-40 pb-20 sm:pb-28' : 'pt-32 sm:pt-36 pb-12 sm:pb-16'
      } px-4 sm:px-8 overflow-hidden border-b border-[#FFC107]/20 z-10`}
    >
      {/* Radial Glow Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,193,7,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center space-y-4 relative z-10">
        {microLabel && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/30 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
            <span>{microLabel}</span>
          </div>
        )}

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          {titleLine1} <br />
          {titleLine2 && <span className="text-[#FFC107]">{titleLine2}</span>}
        </h1>

        {subtitle && (
          <p className="text-sm sm:text-lg text-white/80 max-w-2xl mx-auto font-normal leading-relaxed">
            {subtitle}
          </p>
        )}

        {children && <div className="pt-4">{children}</div>}
      </div>
    </section>
  );
};
