import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, getDoc, setDoc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Product, UserProfile, Order, Review } from '../types';
import { Star, Clock, MapPin, ShieldCheck, ChevronLeft, Minus, Plus, ShoppingBag, Share2, Heart, Check, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

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

    // Core product listener
    const unsubscribeProduct = onSnapshot(doc(db, 'products', productId), (snapshot) => {
      if (snapshot.exists()) {
        const prodData = { ...snapshot.data(), id: snapshot.id } as Product;
        if (isMounted) setProduct(prodData);
        
        // Fetch farmer once product is known
        getDoc(doc(db, 'users', prodData.farmerId)).then((fSnap) => {
          if (fSnap.exists() && isMounted) {
            setFarmer({ ...fSnap.data(), uid: fSnap.id } as UserProfile);
            setDataReady(true);
            setLoading(false);
          }
        }).catch((error) => handleFirestoreError(error, OperationType.GET, `users/${prodData.farmerId}`));
      } else {
        if (isMounted) setLoading(false);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `products/${productId}`));

    // Fetch reviews
    const qReviews = query(collection(db, 'reviews'), where('productId', '==', productId));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      if (isMounted) {
        setReviews(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review)));
      }
    });

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
      unsubscribeProduct();
      unsubscribeReviews();
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
      <div className="flex justify-between items-center mb-12">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
        {/* Gallery */}
        <div className="space-y-8">
          <div className="aspect-square rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100 shadow-xl relative">
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
          {product.images && product.images.length > 0 && (
            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
              {product.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-20 rounded-2xl bg-white overflow-hidden cursor-pointer transition-all border-4 flex-shrink-0 ${activeImageIdx === idx ? 'border-primary shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Product thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col py-4">
          <div className="mb-8">
            <span className="inline-block py-1 px-3 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-md mb-4 uppercase tracking-widest border border-emerald-100">{product.category}</span>
            <h1 className="text-5xl font-bold text-slate-800 tracking-tighter leading-none mb-4">{product.name}</h1>
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_ , i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />
              ))}
              <span className="font-bold text-slate-400 text-sm ml-2">({product.reviewCount || 0} reviews)</span>
            </div>
          </div>

          <div className="mb-10">
            <p className="text-4xl font-bold text-slate-800 tracking-tighter">₱{product.price}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">per {product.unit}</p>
          </div>

          <div className="space-y-6 mb-12">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</h4>
            <p className="text-slate-500 text-base leading-relaxed opacity-80">
              {product.description || "Freshly harvested produce directly from the heart of our community farms. Grown with generational love and sustainable practices to ensure you get the most nutrient-dense food for your collective."}
            </p>
          </div>

          {/* Provenance Card */}
          <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100 mb-12 flex flex-col sm:flex-row items-center gap-8 group">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Provenance Verified</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 font-serif italic mb-4">{freshnessStatus}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>Harvested: {new Date(product.harvestDate).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Origin: {farmer?.farmName || 'Local Community Farm'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-2xl shadow-xl shadow-emerald-900/5 group-hover:scale-110 transition-transform duration-500">
              <QRCodeSVG 
                value={window.location.href} 
                size={80}
                level="M"
                includeMargin={false}
              />
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center mt-3">Scan to Trace</p>
            </div>
          </div>

          <div className="mt-auto space-y-10">
            <div className="flex flex-col sm:flex-row items-stretch gap-6">
              <div className="flex items-center p-2 bg-slate-50 rounded-2xl border border-slate-100 w-full sm:w-auto h-16 relative">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="aspect-square h-full bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center text-slate-500 active:scale-95"><Minus className="w-4 h-4" /></button>
                <span className="flex-grow sm:w-20 font-bold text-xl text-slate-800 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="aspect-square h-full bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center text-slate-500 active:scale-95"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="flex-grow flex gap-4 h-16">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className={`flex-1 h-full rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${added ? 'bg-emerald-500 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'}`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      {product.stock <= 0 ? 'Sold' : 'Add to Cart'}
                    </>
                  )}
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={product.stock <= 0}
                  className="flex-1 h-full bg-slate-800 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-slate-900 shadow-xl shadow-slate-900/10 disabled:opacity-50"
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Farmer Card Minimal */}
            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xl italic">
                  {farmer?.farmName?.[0] || 'F'}
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-1">Local Farm</p>
                   <p className="font-bold text-slate-700 tracking-tight">{farmer?.farmName || "The Organic Homestead"}</p>
                </div>
              </div>
              <button 
                onClick={() => farmer && onFarmerClick(farmer.uid)}
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
              >
                View Profile
              </button>
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
