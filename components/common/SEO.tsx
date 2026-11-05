import React, { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "store" | "profile";
  schemaData?: object | object[];
  robots?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = "FLOATE — WhatsApp-Native Market Discovery",
  description = "Direct city catalog search and verified vendor discovery for Africa's informal economy.",
  image = "https://i.postimg.cc/nzQ7WvPK/20260807-223513.jpg",
  url = typeof window !== "undefined" ? window.location.href : "https://www.floate.xyz/",
  type = "website",
  schemaData,
  robots = typeof window !== "undefined" &&
    /^\/(?:admin|merchant\/dashboard|login|register|buy|checkout|cart|wishlist|favourites|verify|v)(?:\/|$)/.test(window.location.pathname)
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large"
}) => {
  useEffect(() => {
    // 1. Update Title
    const fullTitle = title.includes("FLOATE") ? title : `${title} | FLOATE`;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const rawUrl = url || (typeof window !== "undefined" ? window.location.href : "https://www.floate.xyz/");
    const canonicalUrl = new URL(rawUrl, "https://www.floate.xyz/");
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = "www.floate.xyz";
    canonicalUrl.search = "";
    canonicalUrl.hash = "";
    const currentUrl = canonicalUrl.toString();

    // 2. Standard Meta
    setMetaTag('meta[name="description"]', "name", "description", description);
    setMetaTag('meta[name="robots"]', "name", "robots", robots);

    // 3. OpenGraph Tags for Social Previews (WhatsApp, iMessage, Twitter, LinkedIn, Facebook)
    setMetaTag('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:image"]', "property", "og:image", image);
    setMetaTag('meta[property="og:image:secure_url"]', "property", "og:image:secure_url", image);
    setMetaTag('meta[property="og:image:alt"]', "property", "og:image:alt", fullTitle);
    setMetaTag('meta[property="og:url"]', "property", "og:url", currentUrl);
    setMetaTag('meta[property="og:type"]', "property", "og:type", type === "product" ? "product" : (type === "profile" || type === "store" ? "profile" : "website"));
    setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "FLOATE");

    // 4. Twitter Cards
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", image);

    // 5. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", currentUrl);

    // 6. Schema.org JSON-LD Structured Data
    if (schemaData) {
      let script = document.getElementById("floate-schema-jsonld") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "floate-schema-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schemaData, null, 2);
    } else {
      const script = document.getElementById("floate-schema-jsonld");
      if (script) {
        script.remove();
      }
    }
  }, [title, description, image, url, type, schemaData, robots]);

  return null;
};
