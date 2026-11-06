// Search Query & Category Matcher Engine for Nigerian Markets & Local Commerce

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  // Phones & Electronics
  phones: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
  iphone: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
  gadgets: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
  gadget: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
  laptops: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
  laptop: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  cctv: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80",
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
  electronics: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",

  // Fashion, Jerseys, Shoes & Bags
  jersey: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=800&q=80",
  jerseys: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=800&q=80",
  football: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=800&q=80",
  fashion: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80",
  cloth: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
  bag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
  footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
  shoe: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
  sneakers: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
  jewelry: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",

  // Beauty & Cosmetics
  beauty: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
  hair: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
  cosmetics: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",

  // Home, Kitchen & Appliances
  home: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  appliances: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",

  // Food & Groceries
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",

  // Automobiles & Parts
  automotive: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  autoparts: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
  auto: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",

  // Solar, Inverter & Power
  solar: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
  inverter: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
  power: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80"
};

export function getSpotlightImage(business: { category?: string; name?: string; product?: string; image?: string; businessName?: string; description?: string }): string {
  if (business.image && business.image.startsWith("http")) return business.image;
  
  const text = `${business.category || ""} ${business.product || ""} ${business.name || ""} ${business.businessName || ""} ${business.description || ""}`.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (text.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80"; // Premium retail fallback
}

export interface CategorySpec {
  id: string;
  name: string;
  aliases: string[];
  keywords: string[];
}

export const CATEGORY_DEFINITIONS: CategorySpec[] = [
  {
    id: 'phones-laptops',
    name: 'Phones & Laptops',
    aliases: [
      'Phones & Laptops',
      'Mobile Phones & Laptops',
      'Laptops & Accessories',
      'Electronics & Gadgets',
      'Phones & Tablets',
      'Computers & Tech',
      'Gadgets',
      'Electronics'
    ],
    keywords: [
      'phone', 'phones', 'iphone', 'samsung', 'apple', 'macbook', 'laptop', 'laptops',
      'smartphone', 'smartphones', 'android', 'ipad', 'ipads', 'tablet', 'tablets',
      'screen', 'screens', 'charger', 'chargers', 'airpod', 'airpods', 'earbud', 'earbuds',
      'gadget', 'gadgets', 'computer', 'computers', 'pc', 'dell', 'hp', 'lenovo', 'asus',
      'smartwatch', 'smartwatches', 'watch', 'watches', 'console', 'playstation', 'ps4', 'ps5',
      'xbox', 'camera', 'cameras', 'audio', 'speaker', 'speakers', 'bluetooth', 'powerbank',
      'powerbanks', 'generator', 'generators', 'inverter', 'inverters', 'solar', 'solar panel',
      'panel', 'panels', 'ups', 'battery', 'batteries', 'printer', 'printers', 'scanner',
      'hard drive', 'ssd', 'ram', 'gpu', 'tech', 'device', 'devices', 'electronics', 'headphone',
      'headphones', 'earphone', 'earphones', 'mic', 'microphone', 'monitor', 'tv', 'television'
    ]
  },
  {
    id: 'fashion-fabrics',
    name: 'Fashion & Fabrics',
    aliases: [
      'Fashion & Fabrics',
      'Bespoke Fashion & Fabrics',
      'Fashion & Apparel',
      'Clothing & Textiles',
      'Fashion & Clothing',
      'Fabrics',
      'Bespoke Tailoring',
      'Clothing'
    ],
    keywords: [
      'fabric', 'fabrics', 'lace', 'laces', 'french lace', 'swiss lace', 'ankara', 'senator',
      'brocade', 'getzner', 'cloth', 'clothes', 'clothing', 'dress', 'dresses', 'suit', 'suits',
      'tailor', 'tailors', 'tailoring', 'sewing', 'fashion', 'shirt', 'shirts', 'trouser',
      'trousers', 'pant', 'pants', 'jean', 'jeans', 'gown', 'gowns', 'attire', 'material',
      'materials', 'agbada', 'kaftan', 'hoodie', 'hoodies', 'jacket', 'jackets', 'tshirt',
      'tshirts', 'tee', 'tees', 'boutique', 'wear', 'wears', 'traditional', 'aso ebi',
      'textile', 'textiles', 'silk', 'cotton', 'chiffon', 'linen', 'vintage', 'native',
      'abaye', 'abaya', 'jalabiya', 'blouse', 'skirt', 'skirts', 'wrapper', 'wrappers'
    ]
  },
  {
    id: 'footwear-leather',
    name: 'Footwear & Leather',
    aliases: [
      'Footwear & Leather',
      'Shoes & Footwear',
      'Bags & Leather Goods',
      'Shoes & Bags',
      'Footwear',
      'Shoes',
      'Bags'
    ],
    keywords: [
      'shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'heel', 'heels', 'sandal',
      'sandals', 'leather', 'bag', 'bags', 'handbag', 'handbags', 'backpack', 'backpacks',
      'tote', 'totes', 'purse', 'purses', 'wallet', 'wallets', 'belt', 'belts', 'slide',
      'slides', 'slipper', 'slippers', 'footwear', 'loafer', 'loafers', 'oxford', 'oxfords',
      'crocs', 'clog', 'clogs', 'mule', 'mules', 'canvas', 'kicks', 'jordan', 'jordans',
      'nike', 'adidas', 'heel shoe', 'corporate shoes', 'palms', 'leather bag', 'clutch'
    ]
  },
  {
    id: 'beauty-cosmetics',
    name: 'Beauty & Cosmetics',
    aliases: [
      'Beauty & Cosmetics',
      'Hair & Extensions',
      'Health & Beauty',
      'Skincare & Cosmetics',
      'Cosmetics & Beauty',
      'Hair & Wigs',
      'Beauty'
    ],
    keywords: [
      'hair', 'wig', 'wigs', 'frontal', 'frontals', 'closure', 'closures', 'human hair',
      'raw donor', 'vietnamese hair', 'bone straight', 'braid', 'braids', 'attachment',
      'attachments', 'cosmetic', 'cosmetics', 'makeup', 'make up', 'foundation', 'concealer',
      'lipstick', 'lipgloss', 'mascara', 'perfume', 'perfumes', 'fragrance', 'fragrances',
      'scent', 'scents', 'cologne', 'colognes', 'skincare', 'lotion', 'lotions', 'cream',
      'creams', 'body wash', 'soap', 'soaps', 'serum', 'serums', 'beauty', 'nail', 'nails',
      'spa', 'salon', 'barber', 'haircut', 'lash', 'lashes', 'eyelash', 'eyelashes',
      'shampoo', 'conditioner', 'oil', 'oils', 'sunscreen', 'deodorant', 'body spray'
    ]
  },
  {
    id: 'groceries-spices',
    name: 'Groceries & Spices',
    aliases: [
      'Groceries & Spices',
      'Food & Groceries',
      'Restaurant & Catering',
      'Food & Beverages',
      'Catering & Pastries',
      'Groceries',
      'Foodstuff',
      'Food'
    ],
    keywords: [
      'food', 'foodstuff', 'grocery', 'groceries', 'spice', 'spices', 'meat', 'beef',
      'chicken', 'fish', 'catfish', 'crayfish', 'rice', 'beans', 'yam', 'plantain',
      'palm oil', 'vegetable oil', 'groundnut oil', 'soup', 'soup ingredients', 'catering',
      'caterer', 'restaurant', 'cake', 'cakes', 'pastry', 'pastries', 'bread', 'snack',
      'snacks', 'drink', 'drinks', 'juice', 'juices', 'beverage', 'beverages', 'wine',
      'pepper', 'garri', 'tomato', 'tomatoes', 'onion', 'onions', 'provision', 'provisions',
      'supermarket', 'fruit', 'fruits', 'vegetable', 'vegetables', 'pasta', 'spaghetti',
      'egusi', 'ogbono', 'seafood', 'baking', 'flour', 'sugar', 'egg', 'eggs'
    ]
  },
  {
    id: 'home-furniture',
    name: 'Home & Furniture',
    aliases: [
      'Home & Furniture',
      'Furniture & Woodwork',
      'Home Appliances & Decor',
      'Home & Living',
      'Interior Decor',
      'Furniture'
    ],
    keywords: [
      'furniture', 'chair', 'chairs', 'table', 'tables', 'bed', 'beds', 'mattress',
      'mattresses', 'sofa', 'sofas', 'couch', 'couches', 'cushion', 'cushions', 'curtain',
      'curtains', 'rug', 'rugs', 'carpet', 'carpets', 'kitchen', 'kitchenware', 'pot',
      'pots', 'pan', 'pans', 'decor', 'interior', 'appliance', 'appliances', 'fridge',
      'refrigerator', 'freezer', 'cooker', 'gas cooker', 'microwave', 'oven', 'blender',
      'woodwork', 'wardrobe', 'wardrobes', 'cabinet', 'cabinets', 'shelf', 'shelves',
      'lighting', 'chandelier', 'pillow', 'pillows', 'bedsheet', 'bedsheets', 'dining'
    ]
  },
  {
    id: 'automobile-parts',
    name: 'Automobile Parts',
    aliases: [
      'Automobile Parts',
      'Auto Spare Parts',
      'Automotive Services',
      'Car Parts & Accessories',
      'Auto Parts',
      'Automotive'
    ],
    keywords: [
      'car', 'cars', 'auto', 'automobile', 'automobiles', 'vehicle', 'vehicles',
      'spare parts', 'part', 'parts', 'tyre', 'tyres', 'tire', 'tires', 'rim', 'rims',
      'brake', 'brakes', 'brake pad', 'brake pads', 'engine', 'engine oil', 'transmission',
      'gearbox', 'motor', 'mechanic', 'toyota', 'honda', 'lexus', 'mercedes', 'benz',
      'bmw', 'hyundai', 'kia', 'windscreen', 'windshield', 'bumper', 'bumpers', 'headlight',
      'headlights', 'shock absorber', 'shocks', 'car battery', 'wiper', 'wipers', 'exhaust'
    ]
  },
  {
    id: 'services-repairs',
    name: 'Services & Repairs',
    aliases: [
      'Services & Repairs',
      'Logistics & Delivery',
      'Real Estate & Housing',
      'Professional Services',
      'Repairs & Maintenance',
      'Services'
    ],
    keywords: [
      'repair', 'repairs', 'fix', 'fixing', 'technician', 'technicians', 'maintenance',
      'installation', 'plumber', 'plumbing', 'electrician', 'electrical', 'painter',
      'carpenter', 'logistics', 'delivery', 'dispatch', 'errand', 'courier', 'apartment',
      'apartments', 'flat', 'flats', 'house', 'houses', 'rent', 'lease', 'land', 'lands',
      'estate', 'property', 'properties', 'real estate', 'agent', 'agents', 'realtor'
    ]
  }
];

// Common Nigerian Market & City location tokens
export const LOCATION_TOKENS = new Set([
  'lagos', 'ikeja', 'computer village', 'balogun', 'alaba', 'yaba', 'lekki', 'vi',
  'victoria island', 'surulere', 'oshodi', 'idumu', 'trade fair', 'festac', 'ogba',
  'abuja', 'wuse', 'banex', 'garki', 'utc', 'kado', 'maitama', 'asokoro', 'kubwa',
  'port harcourt', 'oil mill', 'mile 1', 'trans amadi', 'kano', 'kurmi', 'sabongari',
  'enugu', 'ogbete', 'kenyatta', 'ibadan', 'bodija', 'dugba', 'aba', 'ariaria',
  'onitsha', 'main market', 'bridge head', 'nigeria', 'market', 'plaza', 'mall'
]);

// Stop words and fillers to ignore when isolating intent
export const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'where', 'can', 'get', 'buy', 'find', 'who', 'sells', 'looking', 'look',
  'for', 'in', 'inside', 'at', 'near', 'around', 'please', 'want', 'need',
  'how', 'much', 'is', 'are', 'a', 'an', 'the', 'and', 'or', 'to', 'from',
  'with', 'of', 'on', 'fit', 'original', 'legit', 'best', 'cheap', 'affordable',
  'good', 'new', 'used', 'uk', 'tokunbo', 'contact', 'number', 'whatsapp',
  'telegram', 'bot', 'store', 'shop', 'vendor', 'seller', 'merchant', 'price',
  'buy', 'sell', 'service', 'deliver', 'delivery'
]);

export interface ParsedSearchQuery {
  rawQuery: string;
  productKeywords: string[];
  locationKeywords: string[];
  matchedCategories: CategorySpec[];
  inferredCategoryNames: string[];
}

/**
 * Parses a user query, extracting core product keywords, locations, and matching business categories.
 */
export function parseSearchQuery(queryText: string): ParsedSearchQuery {
  if (!queryText) {
    return {
      rawQuery: '',
      productKeywords: [],
      locationKeywords: [],
      matchedCategories: [],
      inferredCategoryNames: []
    };
  }

  const rawLower = queryText.toLowerCase().trim();
  // Split into tokens removing punctuation
  const tokens = rawLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  const locationKeywords: string[] = [];
  const productKeywords: string[] = [];
  const matchedCategoriesSet = new Set<CategorySpec>();

  // Check multi-word phrase matching against categories (e.g. "air pods", "solar panel", "french lace")
  CATEGORY_DEFINITIONS.forEach((cat) => {
    // Check if category name/aliases match the query
    const catNameMatches = [cat.name, ...cat.aliases].some(alias => 
      rawLower.includes(alias.toLowerCase())
    );
    if (catNameMatches) {
      matchedCategoriesSet.add(cat);
    }

    // Check if any keyword in this category matches the query
    for (const kw of cat.keywords) {
      if (kw.includes(' ')) {
        if (rawLower.includes(kw)) {
          matchedCategoriesSet.add(cat);
          productKeywords.push(kw);
        }
      }
    }
  });

  // Process individual tokens
  tokens.forEach((token) => {
    if (LOCATION_TOKENS.has(token)) {
      locationKeywords.push(token);
      return;
    }

    if (STOP_WORDS.has(token)) {
      return;
    }

    productKeywords.push(token);

    // Match token against category keywords
    CATEGORY_DEFINITIONS.forEach((cat) => {
      if (cat.keywords.includes(token)) {
        matchedCategoriesSet.add(cat);
      }
    });
  });

  const matchedCategories = Array.from(matchedCategoriesSet);
  const inferredCategoryNames = matchedCategories.map((c) => c.name);

  return {
    rawQuery: queryText,
    productKeywords: Array.from(new Set(productKeywords)),
    locationKeywords: Array.from(new Set(locationKeywords)),
    matchedCategories,
    inferredCategoryNames
  };
}

/**
 * Tests if a business entity matches the parsed search query and/or selected category filter.
 * Ensures strict category and keyword boundaries so irrelevant categories are NEVER returned.
 */
export function isBusinessMatchingQuery(
  business: {
    businessName: string;
    category: string;
    product?: string;
    description?: string;
    items?: string[];
    location?: string;
    city?: string;
    market?: string;
  },
  parsedQuery: ParsedSearchQuery,
  selectedCategory: string = 'All Categories',
  selectedCity: string = 'All Cities'
): boolean {
  const bizCatLower = (business.category || '').toLowerCase();
  const bizNameLower = (business.businessName || '').toLowerCase();
  const bizProdLower = (business.product || '').toLowerCase();
  const bizDescLower = (business.description || '').toLowerCase();
  const bizLocLower = `${business.location || ''} ${business.city || ''} ${business.market || ''}`.toLowerCase();
  const bizItems = (business.items || []).map((i) => i.toLowerCase());

  // 1. Explicit Category Filter Check
  if (selectedCategory !== 'All Categories') {
    const selectedCatLower = selectedCategory.toLowerCase();
    const matchesExplicitCategory = bizCatLower.includes(selectedCatLower) ||
      CATEGORY_DEFINITIONS.some(def => 
        (def.name.toLowerCase() === selectedCatLower || def.aliases.some(a => a.toLowerCase() === selectedCatLower)) &&
        (def.name.toLowerCase() === bizCatLower || def.aliases.some(a => a.toLowerCase() === bizCatLower))
      );

    if (!matchesExplicitCategory) {
      return false;
    }
  }

  // 2. Explicit City Filter Check
  if (selectedCity !== 'All Cities') {
    const selectedCityLower = selectedCity.toLowerCase();
    if (!bizLocLower.includes(selectedCityLower)) {
      return false;
    }
  }

  // If no search query was entered, return true (passed category/city filters)
  if (!parsedQuery.rawQuery.trim()) {
    return true;
  }

  const { productKeywords, locationKeywords, matchedCategories } = parsedQuery;
  const rawLower = parsedQuery.rawQuery.toLowerCase().trim();

  // Check direct exact/partial business name match
  const isDirectBusinessNameMatch = 
    (bizNameLower.length > 0 && rawLower.includes(bizNameLower)) ||
    (rawLower.length > 0 && bizNameLower.includes(rawLower)) ||
    productKeywords.some(kw => kw.length > 2 && (bizNameLower.includes(kw) || kw.includes(bizNameLower)));

  if (isDirectBusinessNameMatch) {
    return true;
  }

  // 3. Location Keyword Validation
  // If the user typed a specific city/market in the search bar, prioritize matching businesses in that location.
  if (locationKeywords.length > 0) {
    const hasLocationMatch = locationKeywords.some((loc) => bizLocLower.includes(loc));
    const majorLocations = ['lagos', 'abuja', 'kano', 'enugu', 'ibadan', 'aba', 'onitsha', 'port harcourt'];
    // If user explicitly specified a city and the business is in a different major city, exclude
    if (!hasLocationMatch && locationKeywords.some(l => majorLocations.includes(l)) && majorLocations.some(m => bizLocLower.includes(m))) {
      return false;
    }
  }

  // 4. Strict Category & Keyword Match Validation
  // If we identified category intent from the user query
  if (matchedCategories.length > 0) {
    const isMatchingCategory = matchedCategories.some((catDef) => {
      // Check if business category matches any category alias
      const catMatch = [catDef.name, ...catDef.aliases].some(alias => 
        bizCatLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(bizCatLower)
      );
      if (catMatch) return true;

      // Check if any category keywords match business items, product, or description
      return catDef.keywords.some(kw => 
        bizProdLower.includes(kw) ||
        bizItems.some(item => item.includes(kw)) ||
        bizDescLower.includes(kw) ||
        bizNameLower.includes(kw)
      );
    });

    if (!isMatchingCategory && !isDirectBusinessNameMatch) {
      // Strictly reject businesses outside the matched category
      return false;
    }
  }

  // 5. Product/Service Keywords Match Verification
  if (productKeywords.length > 0) {
    const hasProductMatch = productKeywords.some((kw) => {
      return (
        bizNameLower.includes(kw) ||
        bizCatLower.includes(kw) ||
        bizProdLower.includes(kw) ||
        bizDescLower.includes(kw) ||
        bizItems.some((item) => item.includes(kw))
      );
    });

    if (!hasProductMatch && !isDirectBusinessNameMatch) {
      return false;
    }
  }

  return true;
}
