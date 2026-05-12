import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, UserProfile } from '../types';
import { Star, Clock, MapPin, ShieldCheck, ChevronLeft, Minus, Plus, ShoppingBag, Share2, Heart, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../context/CartContext';
import { QRCodeSVG } from 'qrcode.react';

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
  onFarmerClick: (farmerId: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onBack, onFarmerClick }) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const unsubscribeProduct = onSnapshot(doc(db, 'products', productId), (snapshot) => {
      if (snapshot.exists()) {
        const prodData = { ...snapshot.data(), id: snapshot.id } as Product;
        setProduct(prodData);
        
        // Fetch farmer
        onSnapshot(doc(db, 'users', prodData.farmerId), (fSnap) => {
          if (fSnap.exists()) {
            setFarmer({ ...fSnap.data(), uid: fSnap.id } as UserProfile);
          }
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${prodData.farmerId}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `products/${productId}`));

    return () => unsubscribeProduct();
  }, [productId]);

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400">Loading...</p>
    </div>
  );
  if (!product) return (
    <div className="h-96 flex flex-col items-center justify-center gap-6">
      <p className="text-2xl font-bold font-serif italic text-slate-800">Product details not found.</p>
      <button onClick={onBack} className="px-8 py-3 bg-primary text-white rounded-full font-bold uppercase tracking-widest text-[10px]">Go Back</button>
    </div>
  );

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const harvestDate = product.harvestDate ? new Date(product.harvestDate) : new Date();
  const harvestDiff = Math.floor((new Date().getTime() - harvestDate.getTime()) / (1000 * 60 * 60 * 24));
  const freshnessStatus = harvestDiff === 0 ? 'Freshly Harvested' : harvestDiff === 1 ? 'Yesterday\'s Harvest' : `Harvested ${harvestDiff} days ago`;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pb-20 max-w-6xl mx-auto"
    >
      <button onClick={onBack} className="flex items-center gap-4 text-slate-400 hover:text-primary mb-12 font-bold transition-all text-[10px] uppercase tracking-[0.4em] group">
        <div className="p-2 rounded-full border border-slate-100 group-hover:border-primary/20 transition-colors">
          <ChevronLeft className="w-5 h-5" /> 
        </div>
        Back to Market
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
        {/* Gallery */}
        <div className="space-y-8">
          <div className="aspect-square rounded-[4rem] overflow-hidden border-4 border-white shadow-2xl relative forest-shadow">
            <img 
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=1200'} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-8 right-8">
               <button className="p-5 bg-white/90 backdrop-blur-2xl rounded-[1.5rem] shadow-2xl hover:scale-110 transition-all text-secondary border border-primary/5 active:scale-95">
                 <Heart className="w-6 h-6" />
               </button>
            </div>
          </div>
          <div className="flex gap-6 justify-center">
            {[1,2,3].map(i => (
              <div key={i} className="w-24 h-24 rounded-[2rem] bg-accent-light overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all border border-primary/5 shadow-inner">
                <img src={product.images?.[0]} className="w-full h-full object-cover opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col py-4">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="inline-block py-2 px-6 bg-accent-light text-primary text-[10px] font-bold rounded-full mb-6 uppercase tracking-[0.3em] border border-primary/5 shadow-sm">{product.category}</span>
              <h1 className="text-6xl font-bold text-slate-800 tracking-tighter leading-none font-serif italic">{product.name}</h1>
            </div>
            <div className="flex gap-4">
              <button className="p-4 bg-accent-light rounded-2xl hover:bg-white transition-all text-primary border border-primary/5 shadow-inner active:scale-95"><Share2 className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-10 mb-12">
            <div>
              <p className="text-6xl font-bold text-primary font-serif tracking-tighter">₱{product.price}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2 italic">per {product.unit}</p>
            </div>
            <div className="h-20 w-[1px] bg-slate-100" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                {[...Array(5)].map((_ , i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? 'text-secondary fill-secondary' : 'text-slate-100'}`} />
                ))}
                <span className="font-bold text-slate-800 text-lg ml-2 font-serif italic">{product.rating || 'No Rating'}</span>
              </div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">{product.reviewCount || 0} Customer Reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="p-8 bg-background rounded-[2.5rem] border border-border shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform duration-1000 group-hover:scale-150" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Freshness</span>
              </div>
              <p className="font-bold text-slate-800 text-base mb-4 font-serif italic">{freshnessStatus}</p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: harvestDiff === 0 ? '100%' : harvestDiff === 1 ? '75%' : '50%' }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(45,66,45,0.3)]"
                />
              </div>
            </div>
            <div className="p-8 bg-background rounded-[2.5rem] border border-border shadow-inner flex items-center justify-between group">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-secondary/10 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Verify Product</span>
                </div>
                <p className="font-bold text-slate-800 text-base italic font-serif">Farm Origin</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-border shadow-2xl group-hover:scale-105 transition-transform duration-500">
                <QRCodeSVG value={`https://farmtohome.run/product/${product.id}`} size={48} fgColor="#2d422d" />
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-xl leading-relaxed mb-12 font-medium font-serif italic text-justify opacity-80 decoration-primary/10 underline underline-offset-8 decoration-dotted">
            {product.description || "Freshly harvested produce directly from the heart of our community farms. Grown with generational love and sustainable practices to ensure you get the most nutrient-dense food for your collective."}
          </p>

          <div className="mt-auto space-y-10">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex items-center p-3 bg-accent-light rounded-3xl border border-primary/5 shadow-inner w-full sm:w-auto">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-14 h-14 bg-white rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center text-primary active:scale-95 border border-primary/5"><Minus className="w-5 h-5" /></button>
                <span className="px-10 font-bold text-2xl text-slate-800 font-serif italic uppercase tracking-widest">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-14 h-14 bg-white rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center text-primary active:scale-95 border border-primary/5"><Plus className="w-5 h-5" /></button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={`flex-grow w-full sm:w-auto py-7 rounded-[2.5rem] font-bold font-serif text-xl flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-[0.98] relative overflow-hidden group ${added ? 'bg-secondary text-white shadow-secondary/40' : 'bg-primary text-white shadow-primary/30 hover:scale-[1.02]'}`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {added ? (
                  <>
                    <Check className="w-7 h-7" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-7 h-7" />
                    {product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
                  </>
                )}
              </button>
            </div>

            {/* Farmer Card */}
            <div className="p-10 bg-accent-light rounded-[3.5rem] border border-primary/10 flex flex-col sm:flex-row items-center justify-between shadow-2xl shadow-primary/5 border-l-8 border-l-primary group">
              <div className="flex items-center gap-8 mb-6 sm:mb-0">
                <div className="w-24 h-24 bg-white rounded-[2rem] border border-primary/10 flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-700">
                   <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-bold font-serif italic text-3xl shadow-inner">
                    {farmer?.farmName?.[0] || 'F'}
                   </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] leading-none mb-3 opacity-60">Produced by</p>
                  <p className="text-3xl font-bold text-slate-800 tracking-tighter font-serif italic">{farmer?.farmName || "Local Farm"}</p>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                    <MapPin className="w-4 h-4 text-primary opacity-60" />
                    <span>{farmer?.farmAddress || "Local Farm Location"}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => farmer && onFarmerClick(farmer.uid)}
                className="w-full sm:w-auto px-10 py-5 bg-white text-primary text-[10px] font-bold rounded-2xl border-2 border-primary/5 shadow-xl hover:bg-primary hover:text-white transition-all uppercase tracking-[0.3em] active:scale-95"
              >
                View Farm
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
