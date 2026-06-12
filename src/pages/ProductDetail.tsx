import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, getDoc, setDoc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Product, UserProfile, Order, Review } from '../types';
import { Star, Clock, MapPin, ShieldCheck, ChevronLeft, Minus, Plus, ShoppingBag, Share2, Heart, Check, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { getProductHighlights } from '../lib/utils';

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
  onFarmerClick: (farmerId: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onBack, onFarmerClick }) => {
  const { addToCart, setIsOpen } = useCart();
  const { user, profile, openAuth } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [added, setAdded] = useState(false);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isEligibleToReview, setIsEligibleToReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch product
        const productSnap = await getDoc(doc(db, 'products', productId));
        if (productSnap.exists()) {
          const prodData = { ...productSnap.data(), id: productSnap.id } as Product;
          if (isMounted) setProduct(prodData);
          
          // Fetch farmer
          const farmerSnap = await getDoc(doc(db, 'users', prodData.farmerId));
          if (farmerSnap.exists() && isMounted) {
            setFarmer({ ...farmerSnap.data(), uid: farmerSnap.id } as UserProfile);
            setDataReady(true);
          }
        }
        
        // Fetch reviews
        const qReviews = query(collection(db, 'reviews'), where('productId', '==', productId), limit(100));
        const reviewsSnap = await getDocs(qReviews);
        if (isMounted) {
          setReviews(reviewsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `product_detail_${productId}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // Check eligibility in background
    const checkEligibility = async () => {
      if (!auth.currentUser) return;
      try {
        const qOrders = query(
          collection(db, 'orders'), 
          where('buyerId', '==', auth.currentUser.uid),
          where('status', '==', 'delivered'),
          limit(20) // Limit check to most recent orders for performance
        );
        const orderDocs = await getDocs(qOrders);
        const isEligible = orderDocs.docs.some(doc => {
          const order = doc.data() as Order;
          return order.items.some(item => item.productId === productId);
        });
        if (isMounted) setIsEligibleToReview(isEligible);
      } catch (err) {
        console.error("Eligibility check error:", err);
      }
    };

    checkEligibility();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !product || !comment.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewData = {
        productId,
        buyerId: auth.currentUser.uid,
        farmerId: product.farmerId,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };

      const reviewRef = doc(collection(db, 'reviews'));
      await addDoc(collection(db, 'reviews'), { ...reviewData, id: reviewRef.id });

      // Send notification to farmer
      const notificationDocRef = doc(collection(db, 'notifications'));
      await setDoc(notificationDocRef, {
        id: notificationDocRef.id,
        userId: product.farmerId,
        title: 'New Review Received',
        message: `A buyer left a ${rating}-star review for ${product.name}.`,
        type: 'system',
        relatedId: productId,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Update product rating
      const newReviewCount = (product.reviewCount || 0) + 1;
      const newRating = ((product.rating || 0) * (product.reviewCount || 0) + rating) / newReviewCount;

      await updateDoc(doc(db, 'products', productId), {
        rating: newRating,
        reviewCount: newReviewCount
      });

      setComment('');
      setShowReviewForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    } finally {
      setSubmittingReview(false);
    }
  };

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
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    if (product) {
      addToCart(product, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    if (product) {
      addToCart(product, quantity);
      setIsOpen(true);
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
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <button onClick={onBack} className="flex items-center gap-4 text-slate-400 hover:text-primary font-bold transition-all text-[10px] uppercase tracking-[0.4em] group">
          <ChevronLeft className="w-5 h-5" /> 
          Back to Market
        </button>
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
             <Heart className="w-5 h-5 fill-current" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="h-44 sm:h-64 md:h-auto md:aspect-square w-full rounded-2xl md:rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100 shadow-md relative mx-auto">
            <AnimatePresence mode="wait">
              <motion.img 
                key={activeImageIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={product.images?.[activeImageIdx] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=1200'} 
                className="w-full h-full object-cover" 
              />
            </AnimatePresence>
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center md:justify-start">
              {product.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-10 h-10 rounded-lg bg-white overflow-hidden cursor-pointer transition-all border flex-shrink-0 ${activeImageIdx === idx ? 'border-primary shadow-sm scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Product thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col py-2">
          <div className="mb-3">
            <div className="flex flex-wrap gap-2 items-center mb-1.5">
              <span className="inline-block py-0.5 px-2 bg-emerald-50 text-emerald-600 text-[8.5px] font-bold rounded-md uppercase tracking-widest border border-emerald-100">{product.category}</span>
              {/* Dynamic Highlights from Description */}
              {getProductHighlights(product.description || '', product.category).map((tag, idx) => (
                <span key={idx} className="inline-block py-0.5 px-2 bg-slate-50 text-slate-600 text-[8.5px] font-bold rounded-md uppercase tracking-widest border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
            
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tighter leading-tight mb-1">{product.name}</h1>
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_ , i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />
              ))}
              <span className="font-bold text-slate-400 text-[10px] ml-0.5">({product.reviewCount || 0} reviews)</span>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-slate-800 tracking-tighter">₱{product.price}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">per {product.unit}</p>
            </div>
            
            {/* Unified Available Stock Banner on Detail Page */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? (product.stock <= 10 ? 'bg-amber-500 animate-pulse' : 'bg-primary animate-pulse') : 'bg-rose-500'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${product.stock > 0 ? (product.stock <= 10 ? 'text-amber-600 font-black' : 'text-slate-500') : 'text-rose-500 font-black'}`}>
                {product.stock > 0 ? `${product.stock} ${product.unit}${product.stock > 1 && product.unit !== 'kg' ? 's' : ''} left` : 'Sold Out'}
              </span>
            </div>
          </div>

          {/* Action Row - Placed directly under price for immediate checkout! */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/60 mb-4 space-y-2">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Select Quantity & Order</p>
            <div className="flex flex-row items-center gap-2">
              <div className="flex items-center p-1 bg-white rounded-lg border border-slate-200 w-24 shrink-0 h-10 relative">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="aspect-square h-full bg-slate-50 rounded-md hover:bg-slate-100 transition-all flex items-center justify-center text-slate-500 active:scale-95"><Minus className="w-2.5 h-2.5" /></button>
                <span className="flex-grow font-semibold text-xs text-slate-800 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="aspect-square h-full bg-slate-50 rounded-md hover:bg-slate-100 transition-all flex items-center justify-center text-slate-500 active:scale-95"><Plus className="w-2.5 h-2.5" /></button>
              </div>
              <div className="flex-grow flex gap-2 h-10">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`flex-1 h-full rounded-lg font-bold text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${added ? 'bg-emerald-500 text-white border-transparent' : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm'}`}
                >
                  {added ? (
                    <>
                      <Check className="w-3 h-3" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3 h-3" />
                      {product.stock <= 0 ? 'Sold' : 'Add'}
                    </>
                  )}
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={product.stock <= 0}
                  className="flex-1 h-full bg-slate-800 text-white rounded-lg font-bold text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] hover:bg-slate-900 shadow-sm disabled:opacity-50"
                >
                  Checkout
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Farmer Card Minimal */}
          <div className="py-2.5 border-t border-b border-slate-100 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 border-none">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-sm italic border border-emerald-100">
                {farmer?.farmName?.[0] || 'F'}
              </div>
              <div>
                 <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Local Farm Partner</p>
                 <p className="font-bold text-slate-700 text-xs tracking-tight">{farmer?.farmName || "The Organic Homestead"}</p>
              </div>
            </div>
            <button 
              onClick={() => farmer && onFarmerClick(farmer.uid)}
              className="text-[8px] font-bold text-primary uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
            >
              View Profile
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1 mb-4">
            <h4 className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Description</h4>
            <p className="text-slate-500 text-xs leading-relaxed opacity-90">
              {product.description || "Freshly harvested produce directly from the heart of our community farms. Grown with sustainable practices to ensure you get the most nutrient-dense food."}
            </p>
          </div>

          {/* Provenance Card - styled more compact */}
          <div className="bg-emerald-50/45 rounded-xl p-3 border border-emerald-100/60 flex items-center justify-between gap-3 group">
            <div className="flex-grow">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Provenance Verified</span>
              </div>
              <h3 className="text-xs font-bold text-slate-800 font-serif italic mb-1.5">{freshnessStatus}</h3>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Harvested: {new Date(product.harvestDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-[150px]">Origin: {farmer?.farmName || 'Local Farm'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <QRCodeSVG 
                value={window.location.href} 
                size={44}
                level="M"
                includeMargin={false}
              />
              <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest text-center mt-0.5">Trace</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-32 space-y-16">
        <div className="flex items-end justify-between border-b border-border pb-10">
          <div>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tighter mb-4 font-serif italic">Customer <span className="text-primary">Reviews</span></h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">What fellow buyers are saying.</p>
          </div>
          {isEligibleToReview && !showReviewForm && (
            <button 
              onClick={() => setShowReviewForm(true)}
              className="px-10 py-5 bg-accent-light text-primary rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95"
            >
              Write a Review
            </button>
          )}
        </div>

        <AnimatePresence>
          {showReviewForm && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-12 rounded-[3.5rem] border-4 border-accent-light shadow-2xl"
            >
              <form onSubmit={handleSubmitReview} className="space-y-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-slate-800 font-serif italic">Share your experience</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-8 h-8 ${star <= rating ? 'text-secondary fill-secondary' : 'text-slate-100'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the freshness and quality..."
                  className="w-full h-40 p-8 bg-background border-2 border-border rounded-[2rem] focus:outline-none focus:border-primary/20 transition-all font-medium italic text-lg"
                  required
                />
                <div className="flex justify-end gap-6">
                  <button 
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-8 py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingReview}
                    className="px-12 py-5 bg-primary text-white rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    {submittingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {reviews.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-background rounded-[4rem] border-2 border-dashed border-slate-200">
              <MessageSquare className="w-12 h-12 text-slate-100 mx-auto mb-6" />
              <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">No reviews yet</p>
            </div>
          ) : (
            reviews.map(review => (
              <motion.div 
                key={review.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent-light/50 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-secondary fill-secondary' : 'text-slate-100'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 font-medium italic text-lg leading-relaxed mb-6">"{review.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center overflow-hidden border border-primary/5">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.buyerId}`} className="w-full h-full" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Buyer</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
