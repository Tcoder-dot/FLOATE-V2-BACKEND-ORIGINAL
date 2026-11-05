import React, { useState } from 'react';
import { LandingHeader } from './common/LandingHeader';
import { PageHero } from './common/PageHero';
import { ClosingCtaBand } from './common/ClosingCtaBand';
import { Footer } from './common/Footer';
import { SEO } from './common/SEO';
import { 
  Newspaper, Calendar, Clock, User, ArrowRight, ArrowLeft, ThumbsUp, Tag, Share2
} from 'lucide-react';

interface BlogPageProps {
  onBack?: () => void;
  onNavigateHome?: () => void;
  onNavigatePage?: (page: any) => void;
  onExploreStalls?: () => void;
}

interface BlogPost {
  id: number;
  title: string;
  category: 'Market Guides' | 'Tech & AI' | 'Merchant Stories';
  date: string;
  readTime: string;
  author: string;
  excerpt: string;
  content: string[];
  splashIcon: string;
  tags: string[];
}

export default function BlogPage({ onBack, onNavigateHome, onNavigatePage, onExploreStalls }: BlogPageProps) {
  const handleHome = onNavigateHome || onBack || (() => {});
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const posts: BlogPost[] = [
    {
      id: 1,
      title: "The Future of Physical Trade Markets in Africa: Voice Commerce & Direct Messaging",
      category: "Market Guides",
      date: "May 28, 2026",
      readTime: "5 min read",
      author: "Chukwuemeka Rich (TELMAN)",
      excerpt: "Why African physical trade hubs are adopting AI voice notes and direct WhatsApp channels over complex e-commerce websites.",
      splashIcon: "🏪",
      tags: ["Physical Commerce", "Voice AI", "African Markets"],
      content: [
        "In major physical trade hubs across Africa—from Balogun in Lagos and Otigba Computer Village to Onitsha Main Market and Agbani Enugu—real commerce moves at lightning speed.",
        "Traditional e-commerce platforms forced merchants to build complex websites, manage technical inventory, and pay high commission fees. But physical market stall owners don't have time for web code; they need direct sales with minimal friction.",
        "Voice notes on WhatsApp have emerged as the dominant tool for market communication. Merchants record a 5-second voice note listing wholesale prices or confirming stock in Pidgin or English, and FLOATE AI parses that query to match buyers instantly.",
        "By eliminating middleman commissions and bringing live market stall inventory into automated messaging threads, FLOATE is powering the next decade of African physical commerce."
      ]
    },
    {
      id: 2,
      title: "How Voice AI Parses Pidgin & Local Dialects for Instant Product Discovery",
      category: "Tech & AI",
      date: "June 2, 2026",
      readTime: "6 min read",
      author: "Engineering Team",
      excerpt: "An inside look at our NLP speech pipeline designed specifically for natural market phrases and price negotiations.",
      splashIcon: "🎙️",
      tags: ["Voice AI", "NLP", "Speech Recognition"],
      content: [
        "Standard global speech recognition models frequently fail when confronted with colloquial African market phrasing like 'Wetin be last price for Tokunbo iPhone 13 Pro?'.",
        "At FLOATE, we trained custom acoustic NLP parsers that understand local cadence, brand nicknames, and market line terminology.",
        "When a buyer records a voice note, our pipeline extracts the product type, budget constraints, preferred market hub, and condition (e.g. Tokunbo vs brand new).",
        "The result is a 3-second response returning direct WhatsApp links to verified physical stall owners who currently have that exact stock in their line."
      ]
    },
    {
      id: 3,
      title: "Zero-Commission Commerce: How Stall Merchants Keep 100% of Their Profit",
      category: "Merchant Stories",
      date: "June 5, 2026",
      readTime: "4 min read",
      author: "Chukwuemeka Rich (TELMAN)",
      excerpt: "Why charging physical market sellers listing fees or commissions destroys trade margins, and how FLOATE keeps listing 100% free.",
      splashIcon: "💡",
      tags: ["Merchant Growth", "Zero Fees", "Direct Sales"],
      content: [
        "Physical market stall owners operate on tight margins. Forcing them to hand over 10% to 15% in platform commissions forces them to raise prices for buyers or abandon digital listing altogether.",
        "FLOATE operates on a zero-commission model for physical merchants. Sellers list their stall catalogs for free via WhatsApp, receive direct buyer messages, and handle payments directly through bank transfer, cash pickup, or waybill escrow.",
        "This direct connection builds long-term merchant-buyer relationships that extend far beyond a single transaction."
      ]
    }
  ];

  const categories = ['All', 'Market Guides', 'Tech & AI', 'Merchant Stories'];

  const filteredPosts = posts.filter(p => selectedCategory === 'All' || p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title={selectedPost ? `${selectedPost.title} | FLOATE Insights` : "Blog & Market Insights | FLOATE AFRICA LTD"}
        description="Insights on African informal commerce, AI search, market operating systems, and WhatsApp trade routing."
        url={selectedPost ? `https://www.floate.xyz/blog#${selectedPost.id}` : "https://www.floate.xyz/blog"}
        type="article"
      />

      <LandingHeader
        onNavigateHome={handleHome}
        onNavigatePage={onNavigatePage || (() => {})}
        onExploreStalls={onExploreStalls}
        currentPage="BLOG"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="FLOATE INSIGHTS & BLOG"
        titleLine1={selectedPost ? selectedPost.category : "Market Insights."}
        titleLine2={selectedPost ? "Article & Analysis" : "Digitizing Africa's Commerce Engine"}
        subtitle={selectedPost ? `By ${selectedPost.author} · ${selectedPost.date}` : "Research and practical guides on African physical commerce, voice search, and market operating systems."}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-12">
        
        {selectedPost ? (
          /* Single Article View (760px column) */
          <div className="max-w-[760px] mx-auto space-y-8">
            <button
              onClick={() => setSelectedPost(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#123F16] hover:text-[#2E7D32] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all articles</span>
            </button>

            <article className="bg-white border border-[#123F16]/10 rounded-2xl p-8 sm:p-12 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-xs text-[#123F16]/60 font-semibold">
                <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-bold uppercase">{selectedPost.category}</span>
                <span>·</span>
                <span>{selectedPost.date}</span>
                <span>·</span>
                <span>{selectedPost.readTime}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#123F16] leading-tight">
                {selectedPost.title}
              </h1>

              <div className="pt-2 pb-4 border-b border-[#123F16]/10 flex items-center justify-between text-xs text-[#123F16]/70">
                <span>By <strong>{selectedPost.author}</strong></span>
                <span className="text-lg">{selectedPost.splashIcon}</span>
              </div>

              <div className="space-y-5 text-sm sm:text-base text-[#123F16]/80 leading-relaxed font-normal pt-2">
                {selectedPost.content.map((paragraph, idx) => (
                  <p key={idx} className={idx === 0 ? "font-medium text-base sm:text-lg text-[#123F16]" : ""}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="pt-6 border-t border-[#123F16]/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {selectedPost.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-[#F7F7F2] text-[11px] font-bold text-[#123F16]/70">
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-xs font-bold text-[#2E7D32] hover:underline"
                >
                  Return to Blog Index →
                </button>
              </div>
            </article>
          </div>
        ) : (
          /* Blog Index View */
          <div className="space-y-10">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-[#123F16] text-[#FFC107] shadow-xs' 
                      : 'bg-white text-[#123F16]/70 hover:bg-[#E8F5E9] hover:text-[#123F16] border border-[#123F16]/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white border border-[#123F16]/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold uppercase">
                        {post.category}
                      </span>
                      <span className="text-xl">{post.splashIcon}</span>
                    </div>

                    <h3 className="text-lg font-bold text-[#123F16] group-hover:text-[#2E7D32] transition-colors leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-xs text-[#123F16]/70 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#123F16]/10 flex items-center justify-between text-xs text-[#123F16]/60">
                    <span>{post.readTime}</span>
                    <span className="text-[#2E7D32] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read Post <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={handleHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
