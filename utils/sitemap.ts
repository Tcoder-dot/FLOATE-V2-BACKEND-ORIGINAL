import { SEO_HUBS_DATA } from '../data/seoHubs';

export const DOMAIN = 'https://www.floate.xyz';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapXML(merchantSlugs: string[] = [], productIds: string[] = []): string {
  const mainPages = [
    { url: `${DOMAIN}/`, priority: '1.0', changefreq: 'daily' },
    { url: `${DOMAIN}/about`, priority: '0.7', changefreq: 'monthly' },
    { url: `${DOMAIN}/company`, priority: '0.7', changefreq: 'monthly' },
    { url: `${DOMAIN}/vendors`, priority: '0.8', changefreq: 'weekly' },
    { url: `${DOMAIN}/eco-partners`, priority: '0.6', changefreq: 'monthly' },
    { url: `${DOMAIN}/whatsapp-ai`, priority: '0.7', changefreq: 'monthly' },
    { url: `${DOMAIN}/telegram-ai`, priority: '0.7', changefreq: 'monthly' },
    { url: `${DOMAIN}/blog`, priority: '0.7', changefreq: 'monthly' },
    { url: `${DOMAIN}/contact`, priority: '0.5', changefreq: 'yearly' }
  ];

  const vendorPages = [...new Set(merchantSlugs)].map((slug) => ({
    url: `${DOMAIN}/vendor/${encodeURIComponent(slug)}`,
    priority: '0.9',
    changefreq: 'daily'
  }));

  const productPages = [...new Set(productIds)].map((id) => ({
    url: `${DOMAIN}/p/${encodeURIComponent(id)}`,
    priority: '0.8',
    changefreq: 'daily'
  }));

  const hubPages = SEO_HUBS_DATA.map((hub) => ({
    url: `${DOMAIN}/solutions/${hub.slug}`,
    priority: '0.9',
    changefreq: 'weekly'
  }));

  const allUrls = [...mainPages, ...vendorPages, ...productPages, ...hubPages];

  const xmlUrls = allUrls.map((item) => `
  <url>
    <loc>${escapeXml(item.url)}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlUrls}
</urlset>`;
}

export function generateRobotsTxt(): string {
  return `# FLOATE AI Robots.txt — Market Operating System for Africa
User-agent: *
Allow: /
Disallow: /api/

# AI Search & Scraping Bots Allowed
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}
