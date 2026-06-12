import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isQuotaError, isOfflineError, safeSetItem } from '../lib/firebase';
import { Product } from '../types';
import { Star, Clock, MapPin, Plus, Filter, MessageSquare, ShoppingBag, Sun, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { SocialFeed } from '../components/SocialFeed';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductHighlights } from '../lib/utils';

interface BuyerHomeProps {
  onProductClick: (id: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  userCoords?: { lat: number; lng: number } | null;
  nearMeOnly?: boolean;
  viewMode?: 'shop' | 'community';
  onViewModeChange?: (mode: 'shop' | 'community') => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = ({ 
  onProductClick, 
  category = 'All', 
  onCategoryChange, 
  searchQuery = '',
  onSearch,
  userCoords = null,
  nearMeOnly = false,
  viewMode = 'shop',
  onViewModeChange
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState(category);
  const [loading, setLoading] = useState(true);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const categories = [
    { name: 'All', icon: '🌳' },
    { name: 'Vegetables', icon: '🥬' },
    { name: 'Fruits', icon: '🍎' },
    { name: 'Root Crops', icon: '🍠' },
    { name: 'Herbs & Spices', icon: '🌿' },
    { name: 'Grains', icon: '🌾' }
  ];

  const VerifiedBadge = () => (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-lg shadow-amber-500/20 group/badge">
      <div className="relative">
        <Sun className="w-4 h-4 text-white animate-[spin_5s_linear_infinite]" />
        <div className="absolute inset-0 bg-white blur-md opacity-20" />
      </div>
      <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap">Verified Local</span>
    </div>
  );

  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    onCategoryChange?.(cat);
  };

  useEffect(() => {
    if (viewMode !== 'shop') return;

    let unsubscribe: (() => void) | null = null;

    // Use a timeout to debounce reads when the user types in the search bar
    const timer = setTimeout(() => {
      // Try cache only for 'All' category without search
      if (activeCategory === 'All' && !searchQuery) {
        const cached = localStorage.getItem('shop_products_all');
        if (cached) {
          try {
            setProducts(JSON.parse(cached));
            setLoading(false);
          } catch (e) {
            localStorage.removeItem('shop_products_all');
          }
        }
      }

      try {
        setLoading(true);
        const q = activeCategory === 'All' 
          ? query(collection(db, 'products'), where('isPublished', '==', true), limit(32))
          : query(collection(db, 'products'), where('isPublished', '==', true), where('category', '==', activeCategory), limit(32));
    
        unsubscribe = onSnapshot(q, (snapshot) => {
          const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
          
          // Cache if it's the 'All' landing
          if (activeCategory === 'All' && !searchQuery) {
            safeSetItem('shop_products_all', JSON.stringify(prods));
          }

          processProducts(prods);
          setLoading(false);
        }, (error) => {
          if (!isQuotaError(error) && !isOfflineError(error)) {
            handleFirestoreError(error, OperationType.LIST, 'products');
          } else {
            console.warn("Using cached products due to quota limit or offline status");
          }
          setLoading(false);
        });

      } catch (error) {
        if (!isQuotaError(error) && !isOfflineError(error)) {
          handleFirestoreError(error, OperationType.LIST, 'products');
        } else {
          console.warn("Using cached products due to quota limit or offline status");
        }
        setLoading(false);
      }
    }, 400); // 400ms debounce

    const processProducts = (prods: Product[]) => {
      let filteredProds = searchQuery 
        ? prods.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : prods;

      if (userCoords) {
        filteredProds = filteredProds.map(p => {
          if (p.coordinates) {
            const dist = calculateDistance(userCoords.lat, userCoords.lng, p.coordinates.lat, p.coordinates.lng);
            return { ...p, distance: dist };
          }
          return p;
        });

        if (nearMeOnly) {
          filteredProds = filteredProds.filter(p => (p as any).distance !== undefined && (p as any).distance <= 50);
        }

        filteredProds.sort((a: any, b: any) => {
          if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
          if (a.distance !== undefined) return -1;
          if (b.distance !== undefined) return 1;
          return 0;
        });
      }

      setProducts(filteredProds);
    };

    return () => {
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeCategory, viewMode, searchQuery, userCoords, nearMeOnly]);

  // Clientside deduplication in case of database pollution
  const uniqueProducts = Array.from(
    new Map(products.map(item => [item.name, item])).values()
  );

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Sticky Top Header with Search & Horizontally Scrollable Pills on Mobile */}
      {viewMode === 'shop' ? (
        <div className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md z-30 py-2.5 px-4 -mx-4 -mt-4 border-b border-slate-100 flex flex-col gap-2 shadow-sm animate-fade-in">
          {/* Header & Mode Switcher combined */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base font-extrabold text-primary tracking-tighter font-sans italic">Marketplace</h1>
              <p className="text-secondary font-semibold uppercase tracking-[0.2em] text-[6.5px]">Sourced directly from local farms</p>
            </div>
            
            <div className="bg-accent-light p-0.5 rounded-full flex items-center border border-primary/5 scale-90 origin-right">
              <button 
                onClick={() => onViewModeChange?.('shop')}
                className="flex items-center gap-1 py-0.5 px-2.5 rounded-full font-bold text-[8px] uppercase tracking-widest transition-all bg-primary text-white shadow-sm"
              >
                <ShoppingBag className="w-2.5 h-2.5" /> Shop
              </button>
              <button 
                onClick={() => onViewModeChange?.('community')}
                className="flex items-center gap-1 py-0.5 px-2.5 rounded-full font-bold text-[8px] uppercase tracking-widest transition-all text-slate-400"
              >
                <MessageSquare className="w-2.5 h-2.5" /> Feed
              </button>
            </div>
          </div>

          {/* Shopee-style Search bar */}
          {onSearch && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => onSearch?.(e.target.value)}
                placeholder="Search fresh crops..." 
                className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/10 transition-all font-medium text-slate-800"
              />
            </div>
          )}

          {/* Horizontally scrollable Pills layout */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap pt-0.5">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8.5px] font-bold uppercase tracking-wider transition-all border ${
                  activeCategory === cat.name 
                    ? 'bg-primary text-white border-primary shadow-sm animate-pulse-once' 
                    : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Original selector for when looking at dynamic Feed on mobile */
        <div className="lg:hidden flex justify-between items-center p-5 banig-pattern rounded-[2rem] border-2 border-white shadow-md">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tighter font-sans italic">Community Feed</h1>
            <p className="text-secondary font-bold uppercase tracking-[0.2em] text-[7px]">Ask and share with the neighborhood</p>
          </div>
          <div className="bg-accent-light p-0.5 rounded-full flex items-center border border-primary/5">
            <button 
              onClick={() => onViewModeChange?.('shop')}
              className="flex items-center gap-1.5 py-1 px-3 rounded-full font-bold text-[8px] uppercase tracking-widest transition-all text-slate-400"
            >
              <ShoppingBag className="w-2.5 h-2.5" /> Shop
            </button>
            <button 
              onClick={() => onViewModeChange?.('community')}
              className="flex items-center gap-1.5 py-1 px-3 rounded-full font-bold text-[8px] uppercase tracking-widest transition-all bg-primary text-white shadow-sm"
            >
              <MessageSquare className="w-2.5 h-2.5" /> Feed
            </button>
          </div>
        </div>
      )}

      {viewMode === 'shop' ? (
        <React.Fragment>
          {/* Featured Spotlight Section - More compact on mobile */}
          <section className="relative rounded-[2rem] overflow-hidden group shadow-lg border border-slate-100">
            <div className="absolute inset-0 bg-primary/20">
               <img 
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[4000ms] mix-blend-luminosity grayscale-[30%]" 
              />
            </div>
            <div className="relative p-6 md:p-10 text-white max-w-4xl z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <span className="w-6 md:w-8 h-px bg-accent-light" />
                  <span className="text-accent-light text-[8px] md:text-[9px] font-bold uppercase tracking-[0.4em]">Featured Collection</span>
                </div>
                <h2 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4 tracking-tighter leading-tight font-sans">Fresh <span className="italic font-serif">Harvests</span></h2>
                <p className="text-xs md:text-sm text-white/80 mb-4 md:mb-8 leading-relaxed font-medium max-w-sm">Directly supporting local agriculture. Pure, unprocessed, and delivered fresh to your door.</p>
                <div className="flex items-center gap-6">
                  <button className="px-6 py-2.5 md:px-8 md:py-3.5 bg-white text-primary rounded-full font-bold hover:bg-accent-light transition-all shadow-md active:scale-95 text-[9px] md:text-[10px] uppercase tracking-widest">Start Exploring</button>
                </div>
              </motion.div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/20 to-transparent pointer-events-none" />
          </section>

          <div className="pt-2 md:pt-4 space-y-6 md:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter font-sans">
                    {nearMeOnly ? 'Near Your ' : 'Product '}
                    <span className="italic text-primary font-serif">{nearMeOnly ? 'Location' : 'List'}</span>
                  </h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[7px] md:text-[8px] mt-0.5">
                    {activeCategory === 'All' ? 'Showing all categories' : `Filtering by ${activeCategory}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {nearMeOnly ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">50KM Range</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Updated Now</span>
                    </div>
                  )}
                </div>
              </div>
             
            {loading ? (
              /* Shopee-style interactive 2-column skeleton loaders grid */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 animate-pulse">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="flex flex-col bg-white rounded-2xl border border-slate-100 p-2 sm:p-3 shadow-sm h-[280px] sm:h-auto">
                    <div className="aspect-[1/1] sm:aspect-[4/5] bg-slate-200/60 rounded-xl mb-3 w-full" />
                    <div className="h-3 bg-slate-200 rounded w-11/12 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3 mb-4" />
                    <div className="mt-auto pt-2 border-t border-slate-100/50 flex justify-between items-center">
                      <div className="h-3 bg-slate-200 rounded w-5/12" />
                      <div className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {uniqueProducts.length > 0 ? (
                  uniqueProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onClick={() => onProductClick(product.id)}
                      distance={(product as any).distance}
                    />
                  ))
                ) : (
                  /* Center-positioned empty 'kaing' harvest basket state */
                  <div className="col-span-full py-16 px-4 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6 relative overflow-hidden border border-accent/20">
                      <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 8l2 11a2 2 0 002 2h8a2 2 0 002-2l2-11M4 8L3 5h18l-1 3M9 5h6M7 11h10M6 15h12" />
                      </svg>
                      <div className="absolute inset-0 bg-primary/5 blur-lg" />
                    </div>
                    <p className="text-slate-800 font-bold text-base font-sans tracking-tight">No Fresh Harvests Found</p>
                    <p className="text-slate-400 font-medium text-xs mt-2 max-w-xs leading-relaxed">No fresh harvests match this criteria yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </React.Fragment>
      ) : (
        <SocialFeed />
      )}
    </div>
  );
};

const ProductCard: React.FC<{ product: Product; onClick: () => void; distance?: number }> = ({ product, onClick, distance }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm p-2 sm:p-4 cursor-pointer hover:border-primary/25 transition-all"
      onClick={onClick}
    >
      <div className="relative aspect-[1/1] rounded-xl bg-accent-light mb-3 overflow-hidden border border-slate-50">
        <img 
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=600'} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
        />
        
        {/* Status Badges - Top Row */}
        <div className="absolute top-1.5 inset-x-1.5 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/95 backdrop-blur-md rounded-lg border border-white shadow-sm pointer-events-auto">
              <Star className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-amber-500 fill-amber-500" />
              <span className="text-[7.5px] sm:text-[9px] font-black text-slate-800">{product.rating ? product.rating.toFixed(1) : 'NEW'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end pointer-events-auto scale-75 sm:scale-90 origin-top-right">
            <AddToCartButton product={product} />
          </div>
        </div>
        
        {/* Detail Badges - Bottom Row */}
        <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-3 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
          <div className="flex items-end justify-between gap-1">
            <div className="flex flex-wrap gap-1 max-w-[70%]">
              <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-[6.5px] sm:text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                {product.category}
              </span>
            </div>
            {distance !== undefined && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/95 backdrop-blur-md rounded-md border border-primary/20 shrink-0">
                <MapPin className="w-2 h-2 text-white" />
                <span className="text-[6.5px] sm:text-[8px] font-black text-white uppercase tracking-widest">
                  {distance < 1 ? '<1KM' : `${distance.toFixed(1)}KM`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs sm:text-base font-bold text-slate-800 tracking-tight leading-snug group-hover:text-primary transition-colors font-sans line-clamp-2 h-[2rem] sm:h-[2.5rem] overflow-hidden">
            {product.name}
          </h4>
          
          {/* Dynamic "Short Info" badges based on product description */}
          <div className="flex flex-wrap gap-1 mt-1 mb-1.5 shrink-0">
            {getProductHighlights(product.description, product.category).map((tag, tIdx) => (
              <span key={tIdx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7.5px] sm:text-[8.5px] font-extrabold uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>

          {product.description && (
            <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1 mt-1 font-medium italic">
              {product.description}
            </p>
          )}
          
          <div className="flex items-baseline gap-1 mt-1 sm:mt-2">
            <span className="text-sm sm:text-lg font-black text-primary tracking-tight">₱{product.price}</span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">/ {product.unit}</span>
          </div>
        </div>
        
        {/* Unified Non-Redundant Stock Indicator */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
          <span className="text-[8.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
            Stock Level
          </span>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? (product.stock <= 10 ? 'bg-amber-500 animate-pulse' : 'bg-primary animate-pulse') : 'bg-rose-500'}`} />
            <span className={`text-[9px] sm:text-[11px] font-black tracking-tight ${product.stock > 0 ? (product.stock <= 10 ? 'text-amber-500' : 'text-slate-700') : 'text-rose-500'}`}>
              {product.stock > 0 ? `${product.stock} ${product.unit}${product.stock > 1 && product.unit !== 'kg' ? 's' : ''} left` : 'Sold Out'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AddToCartButton: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();
  const { user, openAuth } = useAuth();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    if (product.stock <= 0) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button 
      disabled={product.stock <= 0}
      className={`w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 select-none pointer-events-auto ${added ? 'bg-primary text-white border-primary scale-110' : 'bg-white text-primary border-border hover:border-primary hover:scale-110 hover:rotate-6'}`}
      onClick={handleAdd}
    >
      <Plus className={`w-4 h-4 sm:w-6 sm:h-6 transition-transform ${added ? 'rotate-90 scale-0' : ''}`} />
      <ShoppingBag className={`w-4 h-4 sm:w-6 sm:h-6 absolute transition-transform ${added ? 'scale-100 rotate-0' : 'scale-0'}`} />
    </button>
  );
};
