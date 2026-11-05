import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getBlogArticleBySlug, getAllBlogArticles, BlogArticle, formatBlogDate } from '../data/blogArticles';

interface BlogArticlePageProps {
  slug?: string;
  onNavigateHome: () => void;
  onNavigateSlug?: (slug: string) => void;
  onNavigateIndex?: () => void;
  onNavigateMbo?: () => void;
}

export default function BlogArticlePage({ 
  slug = 'how-to-register-a-business-in-nigeria', 
  onNavigateHome,
  onNavigateSlug,
  onNavigateIndex,
  onNavigateMbo
}: BlogArticlePageProps) {
  const article: BlogArticle = getBlogArticleBySlug(slug) || getBlogArticleBySlug('how-to-register-a-business-in-nigeria')!;
  const allArticles = getAllBlogArticles();
  const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/DA8AWq2SKtW5UmknNHO43X';
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';

  // Dynamic SEO & Structured Data Management
  useEffect(() => {
    // 1. Page Title & Document Meta
    const fullTitle = `${article.title} | FLOATE AI Guides`;
    document.title = fullTitle;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const previousDesc = metaDesc.content;
    metaDesc.content = article.metaDescription;

    // Meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    const previousKeywords = metaKeywords.content;
    metaKeywords.content = article.keywords.join(', ');

    // Canonical link
    const canonicalHref = `https://www.floate.xyz/blog/${article.slug}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    const previousCanonical = canonicalLink.href;
    canonicalLink.href = canonicalHref;

    // Open Graph Title & Description
    let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = fullTitle;
    let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) ogDesc.content = article.metaDescription;
    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (ogUrl) ogUrl.content = canonicalHref;

    // 2. Injected JSON-LD Schema: Article + Breadcrumb + FAQ
    const schemaEntities: any[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.metaDescription,
        "image": "https://i.postimg.cc/nzQ7WvPK/20260807-223513.jpg",
        "author": {
          "@type": "Organization",
          "name": article.author,
          "url": article.authorUrl
        },
        "publisher": {
          "@type": "Organization",
          "name": "FLOATE AFRICA LTD",
          "logo": {
            "@type": "ImageObject",
            "url": "https://i.postimg.cc/nzQ7WvPK/20260807-223513.jpg"
          }
        },
        "datePublished": article.publishedDate,
        "dateModified": article.modifiedDate,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalHref
        },
        "keywords": article.keywords.join(', '),
        "articleSection": article.category,
        "inLanguage": "en-NG"
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.floate.xyz/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Guides & Blog",
            "item": "https://www.floate.xyz/blog"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": article.title,
            "item": canonicalHref
          }
        ]
      }
    ];

    if (article.faqs && article.faqs.length > 0) {
      schemaEntities.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": article.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `json-ld-article-${article.slug}`;
    script.text = JSON.stringify(schemaEntities);
    document.head.appendChild(script);

    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      if (metaDesc) metaDesc.content = previousDesc;
      if (metaKeywords) metaKeywords.content = previousKeywords;
      if (canonicalLink) canonicalLink.href = previousCanonical;
      const existingScript = document.getElementById(`json-ld-article-${article.slug}`);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [article]);

  const relatedArticles = allArticles.filter(a => a.slug !== article.slug).slice(0, 3);

  const handleSelectRelated = (targetSlug: string) => {
    if (onNavigateSlug) {
      onNavigateSlug(targetSlug);
    } else {
      window.history.pushState({}, '', `/blog/${targetSlug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const isMboRelated = article.slug.includes('cac') || article.slug.includes('register') || article.slug.includes('presence');
  const mentionsFloateAi = /FLOATE AI|Floate AI/i.test(
    article.title + ' ' + article.excerpt + ' ' + article.metaDescription + ' ' + JSON.stringify(article.sections)
  );

  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#681A9E]/20 selection:text-[#681A9E]">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleGoHome}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to FLOATE</span>
            </button>

            {onNavigateIndex && (
              <button
                onClick={onNavigateIndex}
                className="hidden sm:inline-block px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition text-xs font-semibold cursor-pointer"
              >
                All Guides
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isMboRelated && onNavigateMbo && (
              <button
                onClick={onNavigateMbo}
                className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                MBó by Floate
              </button>
            )}
            <a 
              href={WHATSAPP_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1B5E20] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2E7D32] transition cursor-pointer"
            >
              Chat with FLOATE AI
            </a>
          </div>
        </div>
      </header>

      {/* ARTICLE WRAPPER */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10 text-left">
        
        {/* Breadcrumb Bar */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <button onClick={handleGoHome} className="hover:text-slate-900 cursor-pointer">Home</button>
          <span>/</span>
          <button 
            onClick={() => {
              if (onNavigateIndex) {
                onNavigateIndex();
              } else {
                window.history.pushState({}, '', '/blog');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }} 
            className="hover:text-slate-900 cursor-pointer"
          >
            Guides
          </button>
          <span>/</span>
          <span className="text-slate-900 truncate max-w-[200px] sm:max-w-xs">{article.category}</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] bg-[#E8F5E9] px-3 py-1 rounded-full border border-[#1B5E20]/20">
              {article.category}
            </span>
            <span className="text-xs text-slate-400 font-medium">• {article.readTime}</span>
            <span className="text-xs text-slate-400 font-medium">• Nigeria Commercial Guide</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-snug">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800">{article.author}</span>
            <span>•</span>
            <span>Published {formatBlogDate(article.publishedDate)}</span>
            <span>•</span>
            <span>Updated {formatBlogDate(article.modifiedDate)}</span>
          </div>

          {/* Geo Targeting Tagline */}
          <div className="pt-2 text-xs text-slate-500 flex flex-wrap gap-1.5 items-center">
            <span className="font-semibold text-slate-700">Target Regions:</span>
            {article.geoTargeting.cities.map((city, idx) => (
              <span key={city} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {city}{idx < article.geoTargeting.cities.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </header>

        {/* Article Body Sections */}
        <article className="space-y-8 text-slate-800 leading-relaxed text-base sm:text-lg">
          {article.sections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              {section.heading && (
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight pt-4">
                  {section.heading}
                </h2>
              )}

              {section.leadParagraph && (
                <p className="text-slate-700 leading-relaxed font-normal">
                  {section.leadParagraph}
                </p>
              )}

              {section.callout && (
                <div className="bg-white border-l-4 border-[#1B5E20] p-5 rounded-r-xl border border-slate-200 shadow-2xs space-y-1.5 my-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] block">
                    {section.callout.title}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-950 leading-relaxed">
                    {section.callout.text}
                  </p>
                </div>
              )}

              {section.paragraphs && section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-slate-700 leading-relaxed">
                  {p}
                </p>
              ))}

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="space-y-2.5 my-4 pl-2">
                  {section.bulletPoints.map((point, bIdx) => (
                    <li key={bIdx} className="text-sm sm:text-base text-slate-700 flex items-start gap-3">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1B5E20] mt-2.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        {/* Dedicated FLOATE AI WhatsApp CTA for articles mentioning FLOATE AI */}
        {mentionsFloateAi && (
          <section className="bg-gradient-to-br from-[#1B5E20] to-[#123F16] text-white rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm text-left">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFC107] block">
                Instant Customer Acquisition
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-snug">
                Get Your Business Found on WhatsApp
              </h3>
              <p className="text-sm text-[#E3F0E3] leading-relaxed">
                Connect directly with buyers actively searching for your products right now in your city. Start chatting with FLOATE AI on WhatsApp to list your store or find verified local vendors without paying for ads.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a 
                href={WHATSAPP_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 bg-[#FFC107] hover:bg-[#ffcd38] text-[#123F16] font-bold text-xs uppercase tracking-wider rounded-xl transition text-center shadow-xs cursor-pointer"
              >
                Chat with FLOATE AI on WhatsApp
              </a>
              <span className="text-xs text-[#CFE3CF]">
                Free to list • Instant response on WhatsApp
              </span>
            </div>
          </section>
        )}

        {/* Dedicated Local Q&A (FAQ) for GEO Search Queries */}
        {article.faqs && article.faqs.length > 0 && (
          <section className="border-t border-slate-200 pt-8 space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-950">
              Questions &amp; Direct Answers
            </h3>
            <div className="space-y-3">
              {article.faqs.map((faq, fIdx) => (
                <div key={fIdx} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-950 text-sm sm:text-base">
                    {faq.question}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Callout Box */}
        {mentionsFloateAi ? (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 text-center sm:text-left">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] block">
                FLOATE Africa Ecosystem
              </span>
              <h3 className="text-xl font-bold text-slate-950">
                Take the Next Step for Your Business
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Start receiving buyer inquiries on WhatsApp through FLOATE AI, or formalize your business with CAC registration and Google Business Profile setup through MBó by Floate.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a 
                href={WHATSAPP_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-[#1B5E20] hover:bg-[#2E7D32] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition text-center cursor-pointer shadow-xs"
              >
                Chat with FLOATE AI on WhatsApp
              </a>

              {onNavigateMbo && (
                <button
                  onClick={onNavigateMbo}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition text-center cursor-pointer"
                >
                  MBó by Floate Services
                </button>
              )}

              <a 
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-4"
              >
                Join Merchant Community
              </a>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 text-center sm:text-left">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] block">
                MBó by Floate Business Foundation
              </span>
              <h3 className="text-xl font-bold text-slate-950">
                Get Hands on Help with Your CAC Registration
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                MBó by Floate guides Nigerian merchants through name reservation, document preparation, and submission so your CAC registration succeeds without costly agency markups.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {onNavigateMbo && (
                <button
                  onClick={onNavigateMbo}
                  className="w-full sm:w-auto px-6 py-3 bg-[#1B5E20] hover:bg-[#2E7D32] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition text-center cursor-pointer shadow-xs"
                >
                  Explore MBó CAC Services
                </button>
              )}

              <a 
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition text-center cursor-pointer"
              >
                Join WhatsApp Community
              </a>

              <a 
                href="mailto:contact@floate.xyz?subject=CAC%20Registration%20Inquiry"
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-4"
              >
                contact@floate.xyz
              </a>
            </div>
          </section>
        )}

        {/* Related Guides */}
        {relatedArticles.length > 0 && (
          <section className="border-t border-slate-200 pt-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-slate-950">
                Related Guides &amp; Articles
              </h3>
              <button
                onClick={() => {
                  if (onNavigateIndex) {
                    onNavigateIndex();
                  } else {
                    window.history.pushState({}, '', '/blog');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <div 
                  key={rel.slug}
                  onClick={() => handleSelectRelated(rel.slug)}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-[#1B5E20]/50 transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-2xs"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5E20] block">
                      {rel.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-950 group-hover:text-[#1B5E20] transition leading-snug line-clamp-2">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {rel.excerpt}
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <span>Read Guide</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 mt-16 text-xs text-slate-500 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <p>© 2026 FLOATE AFRICA LTD. All rights reserved. 26, Abagana street, fegge onitsha, Anambra State.</p>
          <div className="flex justify-center gap-4 font-semibold text-slate-600">
            <button onClick={handleGoHome} className="hover:text-slate-900 cursor-pointer">Home</button>
            <span>•</span>
            <button 
              onClick={() => {
                if (onNavigateIndex) onNavigateIndex();
                else {
                  window.history.pushState({}, '', '/blog');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }} 
              className="hover:text-slate-900 cursor-pointer"
            >
              All Articles
            </button>
            {onNavigateMbo && (
              <>
                <span>•</span>
                <button onClick={onNavigateMbo} className="hover:text-slate-900 cursor-pointer">MBó by Floate</button>
              </>
            )}
            <span>•</span>
            <a href="mailto:contact@floate.xyz" className="hover:text-slate-900">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
