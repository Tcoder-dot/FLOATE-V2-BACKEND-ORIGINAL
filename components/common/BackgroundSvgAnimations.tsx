import React from 'react';
import { motion } from 'framer-motion';

interface BackgroundSvgAnimationsProps {
  variant?: 'emerald' | 'gold' | 'mint' | 'whatsapp' | 'telegram' | 'amber';
}

export const BackgroundSvgAnimations: React.FC<BackgroundSvgAnimationsProps> = ({ variant = 'emerald' }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
      {/* Animated Rotating Starburst 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        className="absolute top-12 left-[5%] w-72 h-72 text-current opacity-40"
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-current stroke-[2]">
          <circle cx="100" cy="100" r="80" strokeDasharray="6 6" />
          <circle cx="100" cy="100" r="50" />
          <line x1="100" y1="0" x2="100" y2="200" />
          <line x1="0" y1="100" x2="200" y2="100" />
          <line x1="29.29" y1="29.29" x2="170.71" y2="170.71" />
          <line x1="170.71" y1="29.29" x2="29.29" y2="170.71" />
        </svg>
      </motion.div>

      {/* Animated Rotating Starburst 2 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-20 right-[8%] w-96 h-96 text-current opacity-30"
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-current stroke-[1.5]">
          <polygon points="100,10 120,80 190,100 120,120 100,190 80,120 10,100 80,80" />
          <circle cx="100" cy="100" r="90" strokeDasharray="4 8" />
        </svg>
      </motion.div>

      {/* Floating Pulsing Ring 1 */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 right-[12%] w-64 h-64 rounded-full border-4 border-current opacity-30"
      />

      {/* Floating Pulsing Ring 2 */}
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/3 left-[10%] w-80 h-80 rounded-full border-2 border-dashed border-current opacity-25"
      />

      {/* Floating Subtle Trade Network Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-15" width="100%" height="100%">
        <defs>
          <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="3" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>
    </div>
  );
};
