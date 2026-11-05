import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getAllBlogArticles, BlogArticle, formatBlogDate } from '../data/blogArticles';

interface BlogIndexPageProps {
  onNavigateHome: () => void;
  onSelectArticle: (slug: string) => void;
  onNavigateMbo?: () => void;
}

export default function BlogIndexPage({
  onNavigateHome,
  onSelectArticle,
  onNavigateMbo
}: BlogIndexPageProps) {
  const articles = getAllBlogArticles();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    document.title = "Guides, Case Studies & Practical SEO Articles | FLOATE AI";

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const previousDesc = metaDesc.content;
    metaDesc.content = "Explore practical business registration guides, Google Business Profile optimization, and small business customer acquisition strategies for African informal commerce.";

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    const previousCanonical = canonicalLink.href;
    canonicalLink.href = 'https://www.floate.xyz/blog';

    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      if (metaDesc) metaDesc.content = previousDesc;
      if (canonicalLink) canonicalLink.href = previousCanonical;
    };
  }, []);

  const categories = ['ALL', ...Array.from(new Set(articles.map(a => a.category)))];

  const filteredArticles = selectedCategory === 'ALL'
    ? articles
    : articles.filter(a => a.category === selectedCategory);

  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#FFC107]/20 selection:text-[#123F16]">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button 
            type="button"
            onClick={handleGoHome}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to FLOATE</span>
          </button>

          <div className="flex items-center gap-2">
            {onNavigateMbo && (
              <button
                onClick={onNavigateMbo}
                className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                MBó by Floate
              </button>
            )}
            <a 
              href="https://wa.me/message/YYWEZAZZIXBRF1"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1B5E20] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2E7D32] transition cursor-pointer"
            >
              Chat with FLOATE AI
            </a>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <div className="bg-white border-b border-slate-200 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-3 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] block">
            FLOATE AI Knowledge Hub &amp; Commerce Guides
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
            Practical Business Guides for Nigerian Merchants
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Direct, factual guides covering CAC registration, online visibility, WhatsApp conversational sales, and building verified businesses across Nigeria and Africa's informal economy.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1B5E20] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Articles' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ARTICLE GRID */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => (
            <article
              key={article.slug}
              onClick={() => onSelectArticle(article.slug)}
              className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 hover:border-[#1B5E20] transition cursor-pointer flex flex-col justify-between space-y-4 group shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="text-[#1B5E20] font-bold uppercase tracking-wider text-[11px] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full border border-[#1B5E20]/20">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-950 group-hover:text-[#1B5E20] transition leading-snug">
                  {article.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{formatBlogDate(article.publishedDate)}</span>
                <span className="font-bold text-[#1B5E20] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Engaging FLOATE AI WhatsApp CTA */}
        <section className="bg-gradient-to-br from-[#1B5E20] to-[#123F16] text-white rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm text-left mt-12">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFC107] block">
              Conversational Commerce Engine
            </span>
            <h3 className="text-xl sm:text-2xl font-bold leading-snug">
              Get Your Store Discovered on WhatsApp with FLOATE AI
            </h3>
            <p className="text-sm text-[#E3F0E3] leading-relaxed">
              Connect directly with customers searching for your products right now across Lagos, Onitsha, Kano, and Abuja. No ad spend required.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <a 
              href="https://wa.me/message/YYWEZAZZIXBRF1"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-[#FFC107] hover:bg-[#ffcd38] text-[#123F16] font-bold text-xs uppercase tracking-wider rounded-xl transition text-center shadow-xs cursor-pointer"
            >
              Chat with FLOATE AI on WhatsApp
            </a>
            <span className="text-xs text-[#CFE3CF]">
              Free to list • Instant automated response
            </span>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 mt-16 text-xs text-slate-500 text-center">
        <div className="max-w-5xl mx-auto space-y-2">
          <p>© 2026 FLOATE AFRICA LTD. All rights reserved. 26, Abagana street, fegge onitsha, Anambra State.</p>
          <div className="flex justify-center gap-4 font-semibold text-slate-600 pt-2">
            <button type="button" onClick={handleGoHome} className="hover:text-slate-900 cursor-pointer">Home</button>
            {onNavigateMbo && (
              <>
                <span>•</span>
                <button onClick={onNavigateMbo} className="hover:text-slate-900 cursor-pointer">MBó by Floate</button>
              </>
            )}
            <span>•</span>
            <a href="mailto:contact@floate.xyz" className="hover:text-slate-900">contact@floate.xyz</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
