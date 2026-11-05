import { motion } from "motion/react";

const consultingImg = "/src/assets/images/freelancers_tech_1780487837238.png";
const retailImg = "/src/assets/images/african_market_1780487857901.png";
const agencyImg = "/src/assets/images/lagos_tech_space_1780487873562.png";

interface BentoGridFeaturesProps {
  onStartDemo?: () => void;
}

export default function BentoGridFeatures({ onStartDemo }: BentoGridFeaturesProps) {
  return (
    <section id="features" className="py-56 lg:py-64 relative z-20 bg-white border-b-4 border-slate-950">
      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.65 }}
          style={{ willChange: 'transform, opacity' }}
          className="max-w-3xl mx-auto text-center space-y-4 mb-24"
        >
          <span className="text-[10px] font-black tracking-[0.25em] text-slate-950 uppercase leading-none inline-block font-mono">
            Functional Capabilities
          </span>
          <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tight leading-tight uppercase text-black">
            Designed for relationships. <br className="hidden sm:inline" /> Engineered for results.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed max-w-xl mx-auto font-black text-slate-900">
            Floate coordinates gentle reminder pathways. Clear overdue accounts quietly and automatically on WhatsApp, SMS, and courteous telephone outreach.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Bento Card 1: Tech Freelancers (Tall column span 5) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-5 rounded-2xl p-8 transition-all duration-300 flex flex-col justify-between group border-4 border-slate-950 bg-white shadow-[6px_6px_0px_#000000]"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border-2 border-slate-900">01 / AUDIENCE</span>
                <span className="text-[10px] font-mono text-slate-950 font-black">TECH FREELANCERS</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-black font-black text-lg uppercase tracking-tight">African Tech Freelancers</h3>
                <p className="text-[12px] leading-relaxed font-bold text-slate-900">
                  Log contract milestones, project retainer fees, and client contacts. Let Floate deliver professional invoicing nudges over comfortable client channels, acting as your remote billing liaison so you stay on pristine terms with customers globally.
                </p>
              </div>
            </div>
            <div className="mt-8 overflow-hidden rounded-xl p-1.5 border-4 border-slate-950 bg-slate-50">
              <img 
                src={consultingImg} 
                alt="Independent consulting workspace represents service businesses" 
                className="rounded-lg object-cover w-full h-[240px] grayscale-[15%] group-hover:grayscale-0 transition-all duration-500 hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>

          {/* Bento Card 2: Modern SMEs (Wide column span 7) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="lg:col-span-7 rounded-2xl p-8 transition-all duration-300 flex flex-col justify-between group border-4 border-slate-950 bg-white shadow-[6px_6px_0px_#000000]"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border-2 border-slate-900">02 / AUDIENCE</span>
                <span className="text-[10px] font-mono text-slate-950 font-black">MODERN AFRICAN SMES</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-black font-black text-lg uppercase tracking-tight">Modern African SMEs</h3>
                <p className="text-[12px] leading-relaxed font-bold text-slate-900">
                  Log wholesale product deliveries, vendor balance tracking, or business distribution credits. Buyers receive beautiful, interactive paylinks to settle up outstanding items instantly via direct bank transfer or mobile money.
                </p>
              </div>
            </div>
            <div className="mt-8 overflow-hidden rounded-xl p-2 border-4 border-slate-950 bg-slate-50 relative">
              <img 
                src={retailImg} 
                alt="Modern high-end design boutique represents commercial enterprises" 
                className="rounded-lg object-cover w-full h-[240px] grayscale-[15%] group-hover:grayscale-0 transition-all duration-500 hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-5 right-5 bg-slate-950 text-white font-mono text-[8.5px] font-bold tracking-widest px-3 py-1.5 rounded-xs border-2 border-slate-950 shadow-sm">
                BALANCE LEDGER SAVED
              </div>
            </div>
          </motion.div>

          {/* Bento Card 3: Agency Invoices (Full wide bottom card span 12) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="lg:col-span-12 rounded-2xl p-8 lg:p-12 transition-all duration-300 group border-4 border-slate-950 bg-white shadow-[8px_8px_0px_#000000]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border-2 border-slate-900">03 / AUDIENCE</span>
                  <span className="text-[10px] font-mono text-slate-950 font-black">TECH & CREATIVE AGENCIES</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-black font-black text-2xl uppercase tracking-tight leading-none">Tech & Creative Agencies</h3>
                  <p className="text-[12px] leading-relaxed font-bold text-slate-900">
                    Protect high-ticket agency project fees and client retainer balances. Oversee real-time read-receipt reports on invoices, customize nudge scripts to match your brand language perfectly, and trigger multi-channel escalation schedules.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-950 font-mono text-[9px] uppercase tracking-wider text-slate-950 font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-700" />
                    <span>Read Receipts</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-700" />
                    <span>Custom Scripts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-700" />
                    <span>Escalation Rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-700" />
                    <span>Secure Rails</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 overflow-hidden rounded-xl p-2 border-4 border-slate-950 bg-slate-50 relative">
                <img 
                  src={agencyImg} 
                  alt="Sleek branding agency meeting room with whiteboards and tech screens" 
                  className="rounded-lg object-cover w-full h-[280px] lg:h-[320px] grayscale-[15%] group-hover:grayscale-0 transition-all duration-500 hover:scale-[1.01]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-6 left-6 bg-slate-950 text-white font-mono text-[8.5px] font-bold tracking-widest px-4 py-2 rounded-xs shadow-lg border-2 border-slate-950">
                  AUTOMATIC REMINDER ACTIVE
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
