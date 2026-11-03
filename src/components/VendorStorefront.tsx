import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  ShieldCheck,
  MapPin,
  MessageCircle,
  Sparkles,
  Clock,
  Share2,
  ArrowLeft,
  ExternalLink,
  Package,
  Plus,
  X,
  Upload,
  Camera,
  Check,
  Award,
  Download,
  Printer,
  QrCode,
  FileText
} from 'lucide-react';
import { FloateVerifiedSeal } from './credentials/FloateBadgeCard';
import { FloateVerifiedCertificate } from './credentials/FloateVerifiedCertificate';
import { FloateBadgeCard } from './credentials/FloateBadgeCard';
import { FloateMarketFlyer } from './credentials/FloateMarketFlyer';
import { FloateSquareBoost } from './credentials/FloateSquareBoost';
import {
  FloateCredential,
  createCredentialForMerchant,
  getCityCode
} from '../bot/services/credentialService';

interface Product {
  id: string;
  name?: string;
  product?: string;
  price?: number | string;
  numericPrice?: number;
  discountPrice?: string;
  numericDiscountPrice?: number;
  category?: string;
  description?: string;
  specs?: string;
  imageUrl?: string;
  photoUrl?: string;
  vendorPhone?: string;
  whatsapp?: string;
  vendorName?: string;
  businessName?: string;
  state?: string;
  city?: string;
  isVerified?: boolean;
  createdAt?: string;
}

interface StatusStory {
  id: string;
  vendorPhone: string;
  vendorName?: string;
  caption: string;
  imageUrl?: string;
  createdAt: string;
  expiresAt: string;
}

interface Merchant {
  id?: string;
  businessName: string;
  ownerFullName?: string;
  whatsapp: string;
  state?: string;
  city?: string;
  category?: string;
  isVerified?: boolean;
  verifiedStatus?: string;
}

export function VendorStorefront() {
  const [vendorPhone, setVendorPhone] = useState<string>('08031112222');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<StatusStory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeStoryModal, setActiveStoryModal] = useState<StatusStory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPhotoBase64, setNewProdPhotoBase64] = useState('');
  const [newProdPreview, setNewProdPreview] = useState<string | null>(null);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [productSuccessMessage, setProductSuccessMessage] = useState('');
  const [productError, setProductError] = useState('');

  // Floate Base Kit Modal State
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isBuyerVerifyModalOpen, setIsBuyerVerifyModalOpen] = useState(false);
  const [activeKitTab, setActiveKitTab] = useState<'certificate' | 'badge' | 'flyer' | 'square'>('certificate');
  const [copiedBio, setCopiedBio] = useState(false);

  // Dynamic Merchant Location & Base-Kit Credential Binding
  const merchantLocation = useMemo(() => {
    if (merchant?.city && merchant?.state) {
      return `${merchant.city}, ${merchant.state}`;
    }
    if (merchant?.city) return `${merchant.city}, Nigeria`;
    if (merchant?.state) return `${merchant.state}, Nigeria`;
    return 'Lagos Island, Lagos';
  }, [merchant]);

  const dynamicCredential: FloateCredential = useMemo(() => {
    const rawName = merchant?.ownerFullName || merchant?.businessName || 'Verified Merchant';
    const bizName = merchant?.businessName || 'Verified Merchant Store';
    const cleanPhone = (vendorPhone || '08031112222').replace(/\D/g, '');
    const cityCode = getCityCode(merchantLocation);
    const suffix = cleanPhone.slice(-4) || '0142';
    const fid = `FLT-${cityCode}-00${suffix.padStart(3, '0')}`;

    return createCredentialForMerchant({
      merchantId: merchant?.id || `m-${cleanPhone}`,
      name: rawName,
      biz: bizName,
      loc: merchantLocation,
      phone: cleanPhone,
      isPlus: true,
      customFid: fid
    });
  }, [merchant, merchantLocation, vendorPhone]);

  // Check URL path on mount or param changes
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);

    if (params.get('action') === 'add-product' || params.get('add') === 'true' || params.get('add-product') === 'true') {
      setIsAddProductOpen(true);
    }

    let identifier = '';
    if (path.includes('/merchant/')) {
      identifier = path.split('/merchant/')[1];
    } else if (path.includes('/vendor/')) {
      identifier = path.split('/vendor/')[1];
    } else if (path.includes('/store/')) {
      identifier = path.split('/store/')[1];
    } else if (path.includes('/catalog/')) {
      identifier = path.split('/catalog/')[1];
    } else if (path.startsWith('/@')) {
      identifier = path.slice(2);
    } else if (params.get('merchant')) {
      identifier = params.get('merchant') || '';
    } else if (params.get('phone')) {
      identifier = params.get('phone') || '';
    } else if (params.get('vendor')) {
      identifier = params.get('vendor') || '';
    } else if (params.get('prod')) {
      identifier = params.get('prod') || '';
    } else if (path !== '/' && path.length > 1) {
      identifier = path.replace(/^\/+/, '');
    }

    if (identifier) {
      // Clean identifier from query strings or nested paths
      const cleanIdentifier = decodeURIComponent(identifier.split('?')[0].split('/')[0].trim());
      if (path.includes('/catalog/') && (cleanIdentifier.startsWith('prod_') || cleanIdentifier.startsWith('FLT-'))) {
        setSelectedProductId(cleanIdentifier);
        fetchProductDetails(cleanIdentifier);
      } else {
        setVendorPhone(cleanIdentifier);
        fetchVendorProfile(cleanIdentifier);
      }
    } else {
      fetchVendorProfile(vendorPhone);
    }
  }, []);

  const fetchVendorProfile = async (phoneOrSlug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/vendor/${encodeURIComponent(phoneOrSlug)}`);
      const data = await res.json();
      if (data.success && data.merchant) {
        setMerchant(data.merchant);
        setProducts(data.products || []);
        setStatuses(data.statuses || []);
        if (data.merchant.whatsapp || data.vendorPhone) {
          setVendorPhone(data.merchant.whatsapp || data.vendorPhone);
        }
      }
    } catch (err) {
      console.warn('Failed to load vendor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetails = async (prodId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/product/${encodeURIComponent(prodId)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProduct(data.product);
        if (data.merchant) setMerchant(data.merchant);
        if (data.product?.vendorPhone || data.product?.whatsapp) {
          const phone = data.product.vendorPhone || data.product.whatsapp;
          setVendorPhone(phone);
          // Also load vendor's other products and active statuses
          const vRes = await fetch(`/api/catalog/vendor/${encodeURIComponent(phone)}`);
          const vData = await vRes.json();
          if (vData.success) {
            setProducts(vData.products || []);
            setStatuses(vData.statuses || []);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p?: number | string) => {
    if (!p) return 'Contact for Price';
    if (typeof p === 'number') return `₦${p.toLocaleString()}`;
    if (String(p).startsWith('₦')) return String(p);
    const num = parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? String(p) : `₦${num.toLocaleString()}`;
  };

  const handleWhatsAppContact = (item?: string, price?: number | string) => {
    const bizName = merchant?.businessName || 'Verified Merchant';
    const targetPhone = (merchant?.whatsapp || vendorPhone || '').replace(/\D/g, '');
    const cleanPhone = targetPhone.startsWith('0') ? `234${targetPhone.slice(1)}` : targetPhone;
    
    const priceText = price ? ` (${formatPrice(price)})` : '';
    const inquiryText = `Hello ${bizName}, I saw your product "${item || 'item'}"${priceText} on your Floate web catalogue. Is this available?`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(inquiryText)}`, '_blank');
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProductError('Image file must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setNewProdPhotoBase64(base64);
        setNewProdPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setProductError('Product name is required.');
      return;
    }
    setSubmittingProduct(true);
    setProductError('');
    setProductSuccessMessage('');

    try {
      const payload = {
        phone: vendorPhone || merchant?.whatsapp,
        businessName: merchant?.businessName || 'Verified Merchant',
        product: newProdName.trim(),
        price: newProdPrice.trim() || '₦25,000',
        category: newProdCategory.trim() || merchant?.category || 'General',
        specs: newProdDesc.trim(),
        description: newProdDesc.trim(),
        photoBase64: newProdPhotoBase64 || undefined,
      };

      const res = await fetch('/api/catalog/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add product.');
      }

      if (data.product) {
        setProducts((prev) => [data.product, ...prev]);
      } else {
        fetchVendorProfile(vendorPhone);
      }

      setProductSuccessMessage(`"${newProdName.trim()}" successfully added to your store!`);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdCategory('');
      setNewProdDesc('');
      setNewProdPhotoBase64('');
      setNewProdPreview(null);

      setTimeout(() => {
        setIsAddProductOpen(false);
        setProductSuccessMessage('');
      }, 1500);
    } catch (err: any) {
      setProductError(err?.message || 'Failed to upload product.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const copyShareLink = () => {
    let cleanUrl = window.location.href;
    if (merchant?.businessName) {
      const slug = merchant.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slug) {
        cleanUrl = `${window.location.origin}/merchant/${slug}`;
      }
    }
    navigator.clipboard.writeText(cleanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* Top Bar Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedProductId ? (
              <button
                onClick={() => {
                  setSelectedProductId(null);
                  setSelectedProduct(null);
                  fetchVendorProfile(vendorPhone);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Store
              </button>
            ) : (
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-slate-100 tracking-tight">Floate Storefront</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-bold text-slate-950 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
            <button
              onClick={copyShareLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              {copiedLink ? 'Link Copied!' : 'Share Web Link'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        
        {/* Vendor Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              {/* Official Floate Verified Scalloped Seal from Base Kit */}
              <button
                onClick={() => setIsBuyerVerifyModalOpen(true)}
                title="Click to view Official Floate Certificate & Trust Verification"
                className="group relative cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0 p-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 hover:border-amber-400/50 shadow-lg"
              >
                <FloateVerifiedSeal size={62} />
              </button>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <button
                    onClick={() => setIsBuyerVerifyModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 transition-colors text-[11px] font-bold shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ✓ FLOATE VERIFIED MERCHANT
                  </button>
                  <span className="font-mono text-amber-300/90 text-[11px] bg-slate-950 px-2.5 py-0.5 rounded border border-amber-500/30 font-bold">
                    FID: {dynamicCredential.fid}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active Online
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {merchant?.businessName || 'Verified Merchant Store'}
                </h1>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {merchantLocation}
                  </span>
                  <span>·</span>
                  <span>{merchant?.category || 'Commercial Retail'}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-300">+{vendorPhone}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setIsKitModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-emerald-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Award className="w-4 h-4 fill-emerald-950" />
                🛡️ Verified Kit & Assets
              </button>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Product
              </button>
              <button
                onClick={() => handleWhatsAppContact('General Storefront Inquiry')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                Chat on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* SINGLE PRODUCT DETAIL VIEW (When Viewing /catalog/:id) */}
        {selectedProduct ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Product Media Gallery */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-4/3 relative">
                {selectedProduct.imageUrl || selectedProduct.photoUrl ? (
                  <img
                    src={selectedProduct.imageUrl || selectedProduct.photoUrl}
                    alt={selectedProduct.name || selectedProduct.product}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2 p-6 text-center">
                    <Package className="w-12 h-12 text-slate-700" />
                    <span className="text-xs">High-Res Product Photo</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur">
                  🟢 Live Stock
                </span>
              </div>

              {/* Product Specifications & Order Module */}
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {selectedProduct.category || merchant?.category || 'General Product'}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {selectedProduct.name || selectedProduct.product}
                  </h2>
                  <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-3">
                    {formatPrice(selectedProduct.price || selectedProduct.numericPrice)}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Product Details & Specs</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {selectedProduct.description || selectedProduct.specs || 'Verified product listing directly from vendor stock.'}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Vendor Location: <strong>{merchant?.city ? `${merchant.city}, ${merchant.state}` : (merchant?.state || 'Nigeria')}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verified Store: <strong>{merchant?.businessName}</strong> (+{vendorPhone})</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleWhatsAppContact(selectedProduct.name || selectedProduct.product, selectedProduct.price)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5 fill-slate-950" />
                    Order Directly via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PERMANENT PRODUCT CATALOGUE GRID VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Product Catalogue
                  <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                    {products.length} items
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Real-time inventory uploaded via WhatsApp by {merchant?.businessName}</p>
              </div>

              <button
                onClick={() => setIsAddProductOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-64 animate-pulse"></div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <Package className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">Catalogue Updating</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This merchant hasn't published products yet. You can add the first item now or chat directly on WhatsApp.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsAddProductOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    + Add First Product
                  </button>
                  <button
                    onClick={() => handleWhatsAppContact('General Inquiry')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Message Vendor
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden group transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-4/3 bg-slate-950 relative overflow-hidden">
                        {p.imageUrl || p.photoUrl ? (
                          <img
                            src={p.imageUrl || p.photoUrl}
                            alt={p.name || p.product}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 p-4 text-center">
                            <Package className="w-8 h-8 mb-1" />
                            <span className="text-[10px]">Product Media</span>
                          </div>
                        )}
                        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                          {p.discountPrice ? (
                            <>
                              <span className="bg-emerald-500 text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-md shadow-md">
                                PROMO {formatPrice(p.discountPrice)}
                              </span>
                              <span className="bg-slate-950/90 text-slate-400 line-through text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur">
                                {formatPrice(p.price || p.numericPrice)}
                              </span>
                            </>
                          ) : (
                            <span className="bg-slate-950/80 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur">
                              {formatPrice(p.price || p.numericPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {p.category || 'In Stock'}
                        </div>
                        <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                          {p.name || p.product}
                        </h3>
                        {p.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {p.description || p.specs}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0 space-y-2">
                      <button
                        onClick={() => handleWhatsAppContact(p.name || p.product, p.price || p.numericPrice)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Inquire via WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 24-Hour Status Story Modal */}
      {activeStoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setActiveStoryModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">24h Active Status Story</span>
            </div>

            {activeStoryModal.imageUrl && (
              <div className="aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                <img src={activeStoryModal.imageUrl} alt="Status" className="w-full h-full object-cover" />
              </div>
            )}

            <p className="text-sm text-slate-200 font-medium leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              "{activeStoryModal.caption}"
            </p>

            <button
              onClick={() => {
                setActiveStoryModal(null);
                handleWhatsAppContact(activeStoryModal.caption);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Reply to Status on WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative shadow-2xl my-8">
            <button
              onClick={() => {
                setIsAddProductOpen(false);
                setProductError('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Plus className="w-4 h-4" />
                Store Inventory Manager
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Add Product to Storefront</h3>
              <p className="text-xs text-slate-400">
                Item will immediately appear on your web store and be matched with buyers searching on WhatsApp.
              </p>
            </div>

            {productError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {productError}
              </div>
            )}

            {productSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                {productSuccessMessage}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike Air Jordan 4 Retro Size 43"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Price (₦) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 45,000 or ₦45,000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shoes, Gadgets, Fashion"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description & Specs
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Clean quality, original box included, available for delivery"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Product Image
                </label>
                <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden">
                  {newProdPreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden">
                      <img src={newProdPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewProdPreview(null);
                          setNewProdPhotoBase64('');
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/90 text-rose-400 text-xs font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 space-y-2">
                      <Upload className="w-6 h-6 text-emerald-400 mx-auto" />
                      <p className="text-xs text-slate-400">Snap with camera or choose photo from gallery</p>
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 cursor-pointer transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        Select Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingProduct ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Publish to Storefront
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floate Base Kit v2 Merchant Marketing & Credential Modal */}
      {isKitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsKitModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5 border-b border-slate-800 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-0.5 rounded-full">
                  Floate Base Kit v2 Marketing Suite
                </span>
                <span className="font-mono text-emerald-300 text-xs bg-slate-950 px-2 py-0.5 rounded border border-emerald-800">
                  {dynamicCredential.fid}
                </span>
                <span className="text-slate-400 text-xs">· Dynamic City: <strong className="text-white">{dynamicCredential.city}</strong></span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Official Merchant Credentials & Market Assets
              </h2>
              <p className="text-xs text-slate-400">
                Laminated stall flyers, social badges, certificates, and WhatsApp status promos branded with your store name and exact local market.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
              <button
                onClick={() => setActiveKitTab('certificate')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeKitTab === 'certificate'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Certificate (1080×1920)
              </button>
              <button
                onClick={() => setActiveKitTab('badge')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeKitTab === 'badge'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Badge Card (1080×1080)
              </button>
              <button
                onClick={() => setActiveKitTab('flyer')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeKitTab === 'flyer'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                A5 Market Flyer (Stall)
              </button>
              <button
                onClick={() => setActiveKitTab('square')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeKitTab === 'square'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Square Boost (1080×1080)
              </button>
            </div>

            {/* Quick Share / Bio helper */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Public Verification Link:</span>
                <span className="font-mono text-emerald-400 font-bold break-all">
                  {window.location.origin}/v/{dynamicCredential.fid}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/v/${dynamicCredential.fid}`);
                    setCopiedBio(true);
                    setTimeout(() => setCopiedBio(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold transition-colors flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copiedBio ? 'Copied Link!' : 'Copy Verify Link'}
                </button>
                <a
                  href={`/v/${dynamicCredential.fid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors flex items-center gap-1 border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Live
                </a>
              </div>
            </div>

            {/* Active Asset View Component */}
            <div className="py-2 flex justify-center">
              {activeKitTab === 'certificate' && (
                <FloateVerifiedCertificate credential={dynamicCredential} scale={0.75} />
              )}
              {activeKitTab === 'badge' && (
                <FloateBadgeCard credential={dynamicCredential} />
              )}
              {activeKitTab === 'flyer' && (
                <FloateMarketFlyer credential={dynamicCredential} />
              )}
              {activeKitTab === 'square' && (
                <FloateSquareBoost credential={dynamicCredential} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buyer Verification & Trust Modal */}
      {isBuyerVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsBuyerVerifyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto flex justify-center pb-1">
                <FloateVerifiedSeal size={72} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Authentic Verified Merchant
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Verified by FLOATE as a genuine merchant with physical presence and verified WhatsApp order fulfillment.
              </p>
            </div>

            {/* Verification Attributes */}
            <div className="bg-slate-950 border border-emerald-900/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Floate ID (FID)</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  {dynamicCredential.fid}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Business Name</span>
                <span className="font-bold text-white">{merchant?.businessName || dynamicCredential.biz}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Stall / Location</span>
                <span className="font-medium text-slate-200">{merchantLocation}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Verification Tier</span>
                <span className="font-bold text-emerald-400">Verified Plus Merchant</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Direct WhatsApp</span>
                <span className="font-mono text-slate-300">+{vendorPhone}</span>
              </div>
            </div>

            {/* Trust Checks Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Real Stall Inspected</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Contact Confirmed</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Direct WhatsApp Chat</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Founding Merchant</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setIsBuyerVerifyModalOpen(false);
                  setIsKitModalOpen(true);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-amber-500/30"
              >
                <Award className="w-4 h-4" />
                View Full Certificate
              </button>
              <button
                onClick={() => {
                  setIsBuyerVerifyModalOpen(false);
                  handleWhatsAppContact('Verified Storefront Inquiry');
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                Chat Vendor on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
