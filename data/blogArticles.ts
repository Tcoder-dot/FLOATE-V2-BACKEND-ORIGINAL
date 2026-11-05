export interface BlogSection {
  heading?: string;
  level?: 'h2' | 'h3';
  leadParagraph?: string;
  paragraphs?: string[];
  bulletPoints?: string[];
  callout?: {
    title: string;
    text: string;
  };
}

export interface BlogArticle {
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
  readTime: string;
  publishedDate: string;
  modifiedDate: string;
  author: string;
  authorUrl: string;
  publisher: string;
  keywords: string[];
  geoTargeting: {
    country: string;
    regions: string[];
    cities: string[];
    markets: string[];
  };
  excerpt: string;
  sections: BlogSection[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  relatedSlugs: string[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  // 1. CAC Registration in Nigeria
  {
    slug: 'how-to-register-a-business-in-nigeria',
    title: 'How to Register a Business in Nigeria: A Practical CAC Registration Guide',
    metaDescription: "Registering a business with the Corporate Affairs Commission (CAC) is the most searched business query in Nigeria. Learn requirements, Business Name vs Ltd, and how MBó by Floate helps.",
    category: 'Business Registration & Compliance',
    readTime: '5 min read',
    publishedDate: '2026-09-01',
    modifiedDate: '2026-09-06',
    author: 'MBó by Floate & Floate Africa Research',
    authorUrl: 'https://floate.xyz/mbo',
    publisher: 'FLOATE AFRICA LTD',
    keywords: [
      'how to register a business in Nigeria',
      'CAC registration guide Nigeria',
      'CAC business name registration',
      'how to register with CAC online',
      'pre.cac.gov.ng guide',
      'business registration requirements Nigeria',
      'Business Name vs Limited Liability Company Nigeria',
      'MBó by Floate CAC registration help',
      'TIN registration Nigeria',
      'register small business Lagos Abuja Onitsha'
    ],
    geoTargeting: {
      country: 'Nigeria',
      regions: ['Lagos State', 'Federal Capital Territory', 'Anambra State', 'Kano State', 'Oyo State', 'Rivers State', 'Abia State'],
      cities: ['Lagos', 'Abuja', 'Onitsha', 'Kano', 'Ibadan', 'Port Harcourt', 'Aba', 'Enugu'],
      markets: ['Alaba International', 'Computer Village', 'Wuse Market', 'Onitsha Main Market', 'Ariaria Market']
    },
    excerpt: "Registering a business with the Corporate Affairs Commission (CAC) is the single most searched business question in Nigeria, and for good reason. Without proper registration, it's difficult to open a business bank account, apply for loans, or sign contracts with serious clients.",
    sections: [
      {
        leadParagraph: "Registering a business with the Corporate Affairs Commission (CAC) is the single most searched business question in Nigeria, and for good reason. Without proper registration, it's difficult to open a business bank account, apply for loans, sign contracts with serious clients, or build the kind of trust that turns a side hustle into a real company.",
        callout: {
          title: "Direct Answer",
          text: "To register a business in Nigeria, you need to reserve a business name with CAC, complete the registration application with your personal and business details, submit the required documents, and pay the applicable registration fee, either directly through the CAC portal or through a registered agent."
        }
      },
      {
        heading: "What You Actually Need to Register",
        level: 'h2',
        paragraphs: [
          "Before opening the portal or hiring an agent, assemble these five core requirements to prevent costly delays or rejection queries:"
        ],
        bulletPoints: [
          "A proposed business name (and a backup, in case your first choice is taken)",
          "Your valid means of identification (National ID / NIN, international passport, or driver's license)",
          "A passport photograph (clear, recent image on a light background)",
          "Your business address (physical location or designated operating space in Nigeria)",
          "A brief description of what your business does (nature of commercial activity and primary category)"
        ]
      },
      {
        heading: "The Two Main Registration Types",
        level: 'h2',
        paragraphs: [
          "Understanding the distinction between Business Name registration and Company Incorporation saves you unnecessary statutory fees and reporting complexity:",
          "Business Name Registration is the simpler, more common route for sole proprietors and small partnerships. It's faster and cheaper, and it's what most informal traders, freelancers, and small service providers choose when formalizing.",
          "Limited Liability Company (Ltd) Registration is more involved, but it separates your personal assets from your business liabilities, and it's typically required if you plan to raise funding, sign larger contracts, or open certain types of business bank accounts."
        ]
      },
      {
        heading: "Why Registration Matters More Than It Might Seem",
        level: 'h2',
        paragraphs: [
          "A registered business name signals something real to the people you deal with. Customers take you more seriously. Suppliers extend better terms. Banks and payment providers require it before they'll open certain accounts or process business transactions.",
          "In an economy where trust is often the hardest thing to establish, registration is one of the few things that's verifiable, not just claimed."
        ]
      },
      {
        heading: "Where This Gets Complicated",
        level: 'h2',
        paragraphs: [
          "The CAC portal itself is not always straightforward to navigate, especially for a first time business owner, juggling the actual running of their business at the same time. Name reservations can be rejected without clear explanation, document requirements shift, and the process can stretch out longer than expected if any step is filled in incorrectly.",
          "This is exactly the kind of process MBó by Floate was built to help with. Rather than navigating CAC registration alone, MBó offers hands on registration assistance, guiding you through document preparation and submission so the process moves correctly the first time, at a fraction of what many agencies charge for the same service."
        ]
      },
      {
        heading: "The Bottom Line",
        level: 'h2',
        paragraphs: [
          "Registering your business isn't just paperwork, it's the foundation that everything else, banking, credibility, growth, gets built on. Whether you handle it yourself through the CAC portal or get help getting it right, it's worth doing properly and early, not as an afterthought once your business has already outgrown its informal beginnings."
        ]
      }
    ],
    faqs: [
      {
        question: "How long does CAC business name registration take in Nigeria?",
        answer: "When filing through the CAC portal with complete documentation and an approved name reservation, Business Name registration typically completes within 3 to 7 working days, after which your digital certificate and status report are available for download."
      },
      {
        question: "Can I register my business with CAC by myself without a lawyer?",
        answer: "Yes. For Business Name registration, sole proprietors and small business owners can file directly online via pre.cac.gov.ng using their NIN. However, accredited services like MBó by Floate assist businesses to avoid name rejections, portal queries, and unnecessary delays."
      },
      {
        question: "What is the difference between Business Name and Limited Company?",
        answer: "A Business Name is a sole proprietorship or partnership where liability is not separated from the owner. A Limited Liability Company (Ltd) forms a distinct legal corporate entity that protects personal assets and is required for corporate tenders and equity investment."
      }
    ],
    relatedSlugs: [
      'from-invisible-to-in-demand-nigerian-businesses-online-presence',
      'building-market-operating-system-africa-informal-economy',
      'how-nigerian-businesses-get-found-without-ads'
    ]
  },

  // 2. Building the Market Operating System for Africa's Informal Economy
  {
    slug: 'building-market-operating-system-africa-informal-economy',
    title: "Building the Market Operating System for Africa's Informal Economy",
    metaDescription: "Informal trade accounts for the majority of urban employment in Africa. Learn why Floate Africa exists to bridge the gap through Floate AI and MBó by Floate.",
    category: 'Economy & Infrastructure',
    readTime: '6 min read',
    publishedDate: '2026-09-02',
    modifiedDate: '2026-09-06',
    author: 'Floate Africa Leadership & Strategy',
    authorUrl: 'https://floate.xyz/about',
    publisher: 'FLOATE AFRICA LTD',
    keywords: [
      "market operating system Africa",
      "Africa informal economy digital tools",
      "Floate Africa Ltd mission",
      "Floate AI WhatsApp commerce",
      "MBó by Floate foundation",
      "digitizing informal merchants Nigeria",
      "conversational commerce Africa",
      "Lagos Onitsha Kano trade digitization"
    ],
    geoTargeting: {
      country: 'Nigeria',
      regions: ['West Africa', 'Lagos State', 'Anambra State', 'Kano State', 'FCT Abuja'],
      cities: ['Lagos', 'Onitsha', 'Kano', 'Abuja', 'Ibadan', 'Port Harcourt', 'Aba'],
      markets: ['Computer Village', 'Balogun Market', 'Wuse Market', 'Kano Textile Market', 'Onitsha Main Market']
    },
    excerpt: "Africa's informal economy accounts for the large majority of urban employment across the continent, real businesses, real livelihoods, real economic activity, operating largely outside the digital systems most of the world now takes for granted. Floate Africa Ltd exists to close that gap.",
    sections: [
      {
        leadParagraph: "Africa's informal economy accounts for the large majority of urban employment across the continent, real businesses, real livelihoods, real economic activity, operating largely outside the digital systems most of the world now takes for granted. No easy way to be found online. No streamlined way to register formally. No built in way to transact safely with a stranger.",
        callout: {
          title: "The Mandate",
          text: "Floate Africa Ltd exists to close that gap. Informal commerce isn't a smaller, less serious version of formal business, it's the version most people across Nigeria and much of Africa actually rely on every single day."
        }
      },
      {
        heading: "Why This Problem Is Worth Solving",
        level: 'h2',
        paragraphs: [
          "Informal commerce isn't a smaller, less serious version of formal business, it's the version most people across Nigeria and much of Africa actually rely on every day. The market trader, the home based tailor, the independent mechanic, the small logistics operator, these businesses are the backbone of local economies, yet they've been almost entirely left out of the digital tools built for formal, structured enterprises.",
          "The result is a real, persistent friction: buyers struggle to find trustworthy sellers beyond their existing network, and sellers struggle to reach buyers beyond word of mouth and foot traffic, no matter how good their product or service actually is."
        ]
      },
      {
        heading: "What Floate Africa Is Building",
        level: 'h2',
        paragraphs: [
          "Floate Africa's mission is direct: to build the market operating system for Africa's informal economy, starting in Nigeria. This isn't a single app or a single feature, it's a connected set of tools addressing the real, practical barriers informal businesses face at every stage:",
          "Floate AI, the company's first product, connects buyers to real, verified businesses through natural conversation on WhatsApp, no app, no directory, just a message describing what you need.",
          "MBó by Floate helps businesses build the foundation that makes them discoverable and credible in the first place, Google Business Profile setup, CAC registration, and a real web presence, without requiring a marketing budget or technical skill.",
          "Together, these products address both halves of the same problem: becoming visible, and becoming reachable."
        ]
      },
      {
        heading: "A Different Starting Point",
        level: 'h2',
        paragraphs: [
          "Most digital tools for small businesses are built with a formal, resourced business in mind, and then adapted downward for smaller users. Floate Africa starts from the opposite direction: built specifically for the realities of informal commerce, a business owner working from a phone, communicating in natural language or a voice note, without time or budget for complicated software."
        ]
      },
      {
        heading: "What This Means Going Forward",
        level: 'h2',
        paragraphs: [
          "Floate Africa is still early in building toward this larger vision, and that's said plainly, not as a caveat, but as an honest description of where things stand. Real businesses are already using Floate AI to connect with real buyers today. Real businesses are already building their foundation through MBó.",
          "The bigger picture, a genuine operating system underpinning how Africa's informal economy discovers, connects, and transacts, is being built one real, working piece at a time."
        ]
      }
    ],
    faqs: [
      {
        question: "What is Floate Africa Ltd?",
        answer: "Floate Africa Ltd (RC: 9365804) is a technology infrastructure company building the market operating system for Africa's informal economy, operating conversational AI discovery via Floate AI and foundation services via MBó by Floate."
      },
      {
        question: "How does Floate AI work on WhatsApp?",
        answer: "Floate AI operates as a conversational bot on WhatsApp. Buyers type natural requests or send voice notes in everyday English, Pidgin, or local languages, and Floate instantly matches them to verified nearby merchants."
      }
    ],
    relatedSlugs: [
      'from-invisible-to-in-demand-nigerian-businesses-online-presence',
      'how-nigerian-businesses-get-found-without-ads',
      'how-to-register-a-business-in-nigeria'
    ]
  },

  // 3. From Invisible to In Demand: How Nigerian Businesses Can Build a Real Online Presence
  {
    slug: 'from-invisible-to-in-demand-nigerian-businesses-online-presence',
    title: 'From Invisible to In Demand, How Nigerian Businesses Can Build a Real Online Presence',
    metaDescription: "Learn how Nigerian businesses can bridge the gap from invisible to discoverable by combining MBó by Floate foundation services with Floate AI conversational discovery.",
    category: 'Online Presence & Strategy',
    readTime: '5 min read',
    publishedDate: '2026-09-03',
    modifiedDate: '2026-09-06',
    author: 'MBó by Floate Foundation Team',
    authorUrl: 'https://floate.xyz/mbo',
    publisher: 'FLOATE AFRICA LTD',
    keywords: [
      'Nigerian businesses online presence',
      'Google Business Profile Nigeria',
      'how small businesses get found in Nigeria',
      'MBó by Floate online visibility',
      'Floate AI buyer matching',
      'CAC registration online presence',
      'digitizing informal businesses Lagos Onitsha',
      'business website builder Nigeria'
    ],
    geoTargeting: {
      country: 'Nigeria',
      regions: ['Lagos State', 'Anambra State', 'Enugu State', 'Kano State', 'Abuja FCT'],
      cities: ['Lagos', 'Onitsha', 'Abuja', 'Enugu', 'Kano', 'Ibadan'],
      markets: ['Surulere', 'Ikeja', 'Wuse 2', 'Ogbete', 'Garki']
    },
    excerpt: "Most small and informal businesses in Nigeria face the same two part problem: customers can't find them online, and even if they could, there's often no real, credible presence to find. Discover how MBó and Floate AI solve both halves.",
    sections: [
      {
        leadParagraph: "Most small and informal businesses in Nigeria face the same two part problem: customers can't find them online, and even if they could, there's often no real, credible presence to find, no Google listing, no registered business name, nothing beyond word of mouth.",
        callout: {
          title: "The Core Solution",
          text: "Solving this properly means addressing both halves of the problem: being visible in the first place, and being genuinely discoverable when someone's actively looking. This is where Floate Africa's two products, MBó and Floate AI, work together."
        }
      },
      {
        heading: "Step One: Building a Real Foundation, MBó by Floate",
        level: 'h2',
        paragraphs: [
          "Before a business can be found, it needs something to be found as. MBó by Floate helps businesses build that foundation, a properly set up Google Business Profile, CAC business registration, and a professional web presence, all handled directly, without the cost or complexity of hiring a full agency or building everything from scratch.",
          "For many business owners, this is the missing first step. A shop with no Google listing is invisible to anyone searching nearby. A business with no registration struggles to open the right bank accounts or be taken seriously by bigger clients. MBó exists to close that gap, at a genuine discount compared to typical freelancer or agency rates."
        ]
      },
      {
        heading: "Step Two: Getting Found by Real Buyers, Floate AI",
        level: 'h2',
        paragraphs: [
          "Once a business has a real foundation, the next question is: how do actual buyers find it? Floate AI connects buyers to businesses through natural, everyday conversation on WhatsApp. A buyer describes what they need, in their own words or a voice note, and Floate matches them to real, relevant sellers, no browsing, no directories, no ads required.",
          "Registering on Floate AI is free, and it means a business becomes reachable to buyers actively searching for exactly what they offer, right at the moment of need."
        ]
      },
      {
        heading: "Why Both Matter Together",
        level: 'h2',
        paragraphs: [
          "A business with a great Floate AI presence but no registration or Google listing still looks less credible the moment a serious buyer looks deeper. A business with a polished Google listing but no way for buyers to easily reach out and transact still misses the buyers who are searching conversationally, not browsing.",
          "Together, MBó and Floate AI cover the full arc: become visible, then become findable."
        ]
      },
      {
        heading: "The Honest Starting Point",
        level: 'h2',
        paragraphs: [
          "Neither of these fixes years of being invisible overnight. But they represent a real, practical path, one that doesn't require a marketing budget, a technical team, or months of guesswork, for any business ready to stop relying on word of mouth alone and start being genuinely discoverable, both to search engines and to the buyers already looking for what they sell."
        ]
      }
    ],
    faqs: [
      {
        question: "Why do Nigerian small businesses struggle to be found on Google?",
        answer: "Most informal businesses lack verified Google Business Profiles, properly categorized addresses on Google Maps, and mobile friendly websites with clean metadata. Without these, search algorithms default to large directories or formal franchises."
      },
      {
        question: "How does conversational search differ from standard web search?",
        answer: "Conversational search allows buyers to state their real time need in natural language or voice notes ('I need a bespoke tailor near Surulere') on WhatsApp, which Floate AI matches directly with relevant, vetted local merchants."
      }
    ],
    relatedSlugs: [
      'how-nigerian-businesses-get-found-without-ads',
      'how-to-register-a-business-in-nigeria',
      'building-market-operating-system-africa-informal-economy'
    ]
  },

  // 4. How Nigerian Businesses Can Get Found by More Customers Without Spending on Ads
  {
    slug: 'how-nigerian-businesses-get-found-without-ads',
    title: 'How Nigerian Businesses Can Get Found by More Customers Without Spending on Ads',
    metaDescription: "Discover how small Nigerian merchants can break free from word of mouth limits, and reach active buyers searching conversationally on WhatsApp, without spending a Naira on ads.",
    category: 'Customer Acquisition & Growth',
    readTime: '5 min read',
    publishedDate: '2026-09-04',
    modifiedDate: '2026-09-06',
    author: 'Floate AI Growth Team',
    authorUrl: 'https://floate.xyz',
    publisher: 'FLOATE AFRICA LTD',
    keywords: [
      'get customers without spending on ads Nigeria',
      'small business customer acquisition Nigeria',
      'WhatsApp commerce Nigeria',
      'how to get found by customers Nigeria',
      'Floate AI merchant registration',
      'zero ad spend small business sales',
      'conversational search WhatsApp Nigeria',
      'Lagos Abuja Onitsha market vendors'
    ],
    geoTargeting: {
      country: 'Nigeria',
      regions: ['Lagos', 'Abuja FCT', 'Enugu', 'Anambra', 'Kano'],
      cities: ['Surulere', 'Ikeja', 'Enugu', 'Onitsha', 'Abuja', 'Kano'],
      markets: ['Local high streets', 'Neighbourhood shopping plazas', 'Open air markets']
    },
    excerpt: "If you run a small or informal business in Nigeria, chances are your customers find you through referrals or foot traffic. Learn how buyers actually search today, and how Floate AI connects you without paying for ads.",
    sections: [
      {
        leadParagraph: "If you run a small or informal business in Nigeria, chances are your customers find you one of three ways: they already know you, someone referred them, or they happened to walk past your shop. That's worked for a long time, but it also means your growth is capped by how far word of mouth can travel.",
        callout: {
          title: "The Key Question",
          text: "How do buyers actually search for businesses like yours today, and are you actually reachable when they do?"
        }
      },
      {
        heading: "The Shift That's Already Happening",
        level: 'h2',
        paragraphs: [
          "More buyers now search for what they need the way they'd ask a person, in plain language, over WhatsApp, rather than browsing directories or scrolling ads. \"I need a tailor in Surulere,\" \"where can I get affordable phone repairs in Enugu\", these are real, everyday messages, not formal search queries.",
          "Businesses that aren't reachable in this way are invisible to an entire, growing category of buyers."
        ]
      },
      {
        heading: "Where Floate AI Fits",
        level: 'h2',
        paragraphs: [
          "Floate AI is a conversational commerce platform that connects buyers to real, verified businesses across Nigeria through WhatsApp. A buyer simply describes what they need, in text or a voice note, and Floate matches them to businesses that can actually help, no app to download, no directory to browse.",
          "For a business, this means being discoverable to buyers actively looking for exactly what you sell or offer, at the moment they're looking, without paying for ads or building a following first."
        ]
      },
      {
        heading: "What Makes This Different From Just \"Being Online\"",
        level: 'h2',
        paragraphs: [
          "Having a Google listing or a social media page helps, but it depends on a buyer already knowing to look for you specifically, or stumbling across a post. Floate AI works differently: it matches buyers to sellers based on what the buyer actually says they need, which means a business with no existing online following can still be found by someone searching for their exact product or service, right now."
        ]
      },
      {
        heading: "Getting Started Costs Nothing",
        level: 'h2',
        paragraphs: [
          "Registering a business on Floate AI is free. You describe what you sell, where you're located, and how buyers can reach you, in your own words, by voice note if that's easier than typing. From there, when a buyer's search matches what you offer, Floate connects you directly."
        ]
      },
      {
        heading: "The Bigger Picture",
        level: 'h2',
        paragraphs: [
          "Informal and small businesses across Nigeria have always been resourceful about finding customers. Floate AI isn't replacing that resourcefulness, it's giving it a new, wider reach, meeting buyers exactly where they're already looking: a simple conversation, on a platform they already use every day."
        ]
      }
    ],
    faqs: [
      {
        question: "Does it cost money to register a business on Floate AI?",
        answer: "No. Registering your business, cataloging your products, and being indexed on Floate AI is completely free. Merchants receive starter credits and pay only nominal fees per qualified customer connection."
      },
      {
        question: "How do buyers contact my store when Floate AI recommends me?",
        answer: "Floate AI facilitates direct connections by opening a WhatsApp chat between the buyer and your registered business phone number, allowing you to finalize orders and payments directly."
      }
    ],
    relatedSlugs: [
      'from-invisible-to-in-demand-nigerian-businesses-online-presence',
      'building-market-operating-system-africa-informal-economy',
      'how-to-register-a-business-in-nigeria'
    ]
  },

  // 5. Existing WhatsApp merchant guide for full backward compatibility
  {
    slug: 'how-to-get-buying-customers-for-your-whatsapp-business',
    title: 'How to Get Buying Customers for Your WhatsApp Business in Africa',
    metaDescription: "Step by step merchant growth guide, for WhatsApp and Telegram vendors in Lagos, Abuja, Onitsha, and Kano using FLOATE AI automated discovery.",
    category: 'WhatsApp Commerce & Growth',
    readTime: '6 min read',
    publishedDate: '2026-08-01',
    modifiedDate: '2026-08-08',
    author: 'FLOATE AI Growth Team',
    authorUrl: 'https://floate.xyz',
    publisher: 'FLOATE AFRICA LTD',
    keywords: [
      'WhatsApp business customers Africa',
      'how to get customers on WhatsApp Nigeria',
      'Lagos WhatsApp vendors',
      'Telegram bot shopping Nigeria',
      'Computer Village phone vendors WhatsApp',
      'Onitsha market traders WhatsApp bot'
    ],
    geoTargeting: {
      country: 'Nigeria',
      regions: ['Lagos State', 'Anambra State', 'FCT Abuja', 'Kano State'],
      cities: ['Lagos', 'Onitsha', 'Abuja', 'Kano'],
      markets: ['Computer Village', 'Wuse Market', 'Ariaria Market', 'Balogun Market']
    },
    excerpt: "If you run a WhatsApp business, student hustle, or market stall in Computer Village, Wuse Market, or Ariaria Market, your biggest bottleneck isn't inventory, it's getting verified buyers without spending millions on Instagram ads.",
    sections: [
      {
        leadParagraph: "If you run a WhatsApp business, student hustle, or market stall in Computer Village, Wuse Market, or Ariaria Market, your biggest bottleneck isn't inventory, it's getting verified buyers without spending millions on Instagram ads. Here is how FLOATE AI indexes your store automatically.",
        callout: {
          title: "The Reality of African Social Commerce",
          text: "WhatsApp is Africa's unofficial shopping mall, but customer discovery has been broken. FLOATE AI connects active buyers to nearby merchants in real time."
        }
      },
      {
        heading: "The Dilemma: Why Social Ads Fail Most African Micro-Merchants",
        level: 'h2',
        paragraphs: [
          "Most Nigerian and African micro-merchants rely on Instagram and TikTok ads to reach customers. But rising exchange rates make ad spend prohibitive, and most clicks turn into cold DMs that never convert.",
          "Informal commerce thrives on trust, proximity, and instant conversational negotiation. That is where FLOATE AI's conversational engine steps in."
        ]
      },
      {
        heading: "How FLOATE AI Indexes Your Inventory for Instant Search",
        level: 'h2',
        paragraphs: [
          "Unlike traditional ecommerce platforms that require uploading hundreds of product photos and descriptions into rigid forms, FLOATE AI lets merchants register by voice note or text message directly on WhatsApp or Telegram.",
          "When a buyer nearby types or speaks a request, like 'where can I find iPhone 13 screen replacement in Ikeja', FLOATE matches them with verified merchants in seconds."
        ]
      }
    ],
    faqs: [
      {
        question: "How do I list my WhatsApp store on FLOATE AI?",
        answer: "Simply start a conversation with the official FLOATE bot on WhatsApp or Telegram, send your business name, location, and the categories of products you sell."
      }
    ],
    relatedSlugs: [
      'how-nigerian-businesses-get-found-without-ads',
      'from-invisible-to-in-demand-nigerian-businesses-online-presence',
      'how-to-register-a-business-in-nigeria'
    ]
  }
];

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  const cleanSlug = slug.toLowerCase().trim();
  return BLOG_ARTICLES.find(
    article => article.slug.toLowerCase() === cleanSlug
  );
}

export function getAllBlogArticles(): BlogArticle[] {
  return BLOG_ARTICLES;
}

export function formatBlogDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${monthName} ${parseInt(day, 10)}, ${year}`;
  } catch {
    return dateStr;
  }
}
