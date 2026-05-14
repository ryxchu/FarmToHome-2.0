import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import { Star, Clock, MapPin, Plus, Filter, MessageSquare, ShoppingBag, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { SocialFeed } from '../components/SocialFeed';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface BuyerHomeProps {
  onProductClick: (id: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
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
    { name: 'Grains', icon: '🌾' },
    { name: 'Herbs & Spices', icon: '🌿' },
    { name: 'Poultry', icon: '🍗' },
    { name: 'Dairy', icon: '🥚' },
    { name: 'Others', icon: '✨' }
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
    const q = activeCategory === 'All' 
      ? query(collection(db, 'products'), where('isPublished', '==', true), limit(24))
      : query(collection(db, 'products'), where('isPublished', '==', true), where('category', '==', activeCategory), limit(24));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      
      // Filter by search query client side for faster feedback
      let filteredProds = searchQuery 
        ? prods.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : prods;

      // Add distance property if userCoords is available
      if (userCoords) {
        filteredProds = filteredProds.map(p => {
          if (p.coordinates) {
            const dist = calculateDistance(userCoords.lat, userCoords.lng, p.coordinates.lat, p.coordinates.lng);
            return { ...p, distance: dist };
          }
          return p;
        });

        // Filter by proximity if nearMeOnly is enabled (e.g., 50km radius)
        if (nearMeOnly) {
          filteredProds = filteredProds.filter(p => (p as any).distance !== undefined && (p as any).distance <= 50);
        }

        // Sort by distance (those with coordinates first)
        filteredProds.sort((a: any, b: any) => {
          if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
          if (a.distance !== undefined) return -1;
          if (b.distance !== undefined) return 1;
          return 0;
        });
      }

      setProducts(filteredProds);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, [activeCategory, viewMode, searchQuery, userCoords, nearMeOnly]);

  // Clientside deduplication in case of database pollution
  const uniqueProducts = Array.from(
    new Map(products.map(item => [item.name, item])).values()
  );

  return (
    <div className="space-y-8">
      {/* View Selector & Header - Hidden on Desktop (moved to sidebar) */}
      <div className="lg:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end p-5 banig-pattern rounded-[2rem] border-2 border-white shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tighter mb-1 font-sans italic">Marketplace</h1>
          <p className="text-secondary font-bold uppercase tracking-[0.2em] text-[8px]">Supporting local farmers.</p>
        </div>

        <div className="bg-accent-light p-1 rounded-[1.5rem] flex items-center border border-primary/5">
          <button 
            onClick={() => onViewModeChange?.('shop')}
            className={`flex items-center gap-2 py-2 px-6 rounded-[1rem] font-bold text-[8px] uppercase tracking-widest transition-all ${viewMode === 'shop' ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}
          >
            <ShoppingBag className="w-3 h-3" /> Shop
          </button>
          <button 
            onClick={() => onViewModeChange?.('community')}
            className={`flex items-center gap-2 py-2 px-6 rounded-[1rem] font-bold text-[8px] uppercase tracking-widest transition-all ${viewMode === 'community' ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-3 h-3" /> Feed
          </button>
        </div>
      </div>

      {viewMode === 'shop' ? (
        <React.Fragment>
          {/* Featured Spotlight Section - More compact and professional */}
          <section className="relative rounded-[2rem] overflow-hidden group shadow-lg border border-slate-100">
            <div className="absolute inset-0 bg-primary/20">
               <img 
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[4000ms] mix-blend-luminosity grayscale-[30%]" 
              />
            </div>
            <div className="relative p-8 md:p-10 text-white max-w-4xl z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-px bg-accent-light" />
                  <span className="text-accent-light text-[9px] font-bold uppercase tracking-[0.4em]">Featured Collection</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tighter leading-tight font-sans">Fresh <span className="italic font-serif">Harvests</span></h2>
                <p className="text-sm text-white/80 mb-8 leading-relaxed font-medium max-w-sm">Directly supporting local agriculture. Pure, unprocessed, and delivered fresh to your door.</p>
                <div className="flex items-center gap-6">
                  <button className="px-8 py-3.5 bg-white text-primary rounded-full font-bold hover:bg-accent-light transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest">Start Exploring</button>
                </div>
              </motion.div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/20 to-transparent pointer-events-none" />
          </section>

          {/* Compact Category Navigation - Mobile Only */}
          <div className="lg:hidden">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all border ${
                    activeCategory === cat.name 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tighter font-sans">
                    {nearMeOnly ? 'Near Your ' : 'Product '}
                    <span className="italic text-primary font-serif">{nearMeOnly ? 'Location' : 'List'}</span>
                  </h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] mt-1">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="aspect-[4/5] bg-accent-light rounded-[3rem] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  <div className="col-span-full py-48 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-accent-light rounded-full flex items-center justify-center mb-8 border border-primary/5">
                      <ShoppingBag className="w-10 h-10 text-primary/20" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">No products found</p>
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
      whileHover={{ y: -12 }}
      className="group flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/5] rounded-[4rem] bg-accent-light mb-8 overflow-hidden transition-all duration-700 border-4 border-white forest-shadow">
        <img 
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=600'} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
        />
        
        {/* Status Badges - Top Row */}
        <div className="absolute top-6 inset-x-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl border border-white shadow-sm pointer-events-auto">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black text-slate-800">{product.rating ? product.rating.toFixed(1) : 'NEW'}</span>
            </div>
            
            {product.isFeatured && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 pointer-events-auto">
                <Sun className="w-3 h-3 animate-spin-slow" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Featured</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 items-end pointer-events-auto">
            <AddToCartButton product={product} />
          </div>
        </div>
        
        {/* Detail Badges - Bottom Row */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="flex items-end justify-between">
            <div className="flex flex-wrap gap-2 max-w-[70%]">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                {product.category}
              </span>
              {product.harvestDate && (
                <span className="px-3 py-1 bg-emerald-500 rounded-lg text-[8px] font-black text-white uppercase tracking-widest shadow-md">
                  {Math.floor((new Date().getTime() - new Date(product.harvestDate).getTime()) / (1000 * 60 * 60 * 24)) === 0 ? 'Fresh Today' : 'Harvested Fresh'}
                </span>
              )}
            </div>
            {distance !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/90 backdrop-blur-md rounded-lg border border-primary/20">
                <MapPin className="w-2.5 h-2.5 text-white" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">
                  {distance < 1 ? '<1KM' : `${distance.toFixed(1)}KM`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-xl font-bold text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors font-sans">{product.name}</h4>
          <div className="text-right">
             <p className="text-xl font-bold text-primary tracking-tighter">₱{product.price}</p>
             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{product.unit}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-light rounded-xl flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden border border-primary/5 shadow-inner">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${product.farmerId}`} alt="Farmer" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Farmer</span>
                <span className="text-[11px] font-bold text-slate-600">Local Farm #4</span>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-primary' : 'bg-secondary'} animate-pulse`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                {product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}
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
      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 ${added ? 'bg-primary text-white border-primary scale-110' : 'bg-white text-primary border-border hover:border-primary hover:scale-110 hover:rotate-6'}`}
      onClick={handleAdd}
    >
      <Plus className={`w-6 h-6 transition-transform ${added ? 'rotate-90 scale-0' : ''}`} />
      <ShoppingBag className={`w-6 h-6 absolute transition-transform ${added ? 'scale-100 rotate-0' : 'scale-0'}`} />
    </button>
  );
};
