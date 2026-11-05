import React from 'react';

export type SectionVariant = 'green' | 'cream' | 'paper' | 'white';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: SectionVariant;
  className?: string;
  children: React.ReactNode;
  id?: string;
  as?: 'section' | 'div' | 'article' | 'footer' | 'header';
}

const VARIANT_STYLES: Record<SectionVariant, string> = {
  green: 'hero-green-gradient text-white selection:bg-[#FFC107]/30 selection:text-white',
  cream: 'bg-[#FFF8E1] text-[#111111] selection:bg-[#FFC107]/20 selection:text-[#123F16]',
  paper: 'bg-[#F7F7F2] text-[#111111] selection:bg-[#FFC107]/20 selection:text-[#123F16]',
  white: 'bg-white text-[#111111] selection:bg-[#FFC107]/20 selection:text-[#123F16]',
};

export const Section: React.FC<SectionProps> = ({
  variant = 'white',
  className = '',
  children,
  id,
  as: Component = 'section',
  ...rest
}) => {
  return (
    <Component
      id={id}
      className={`relative w-full ${VARIANT_STYLES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Section;
