import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, CheckCircle2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFirstBuyer, setIsFirstBuyer] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState(false);

  useEffect(() => {
    const checkFirstBuyer = async () => {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', auth.currentUser.uid),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setIsFirstBuyer(true);
        // Automatically apply for first time
        setVoucherApplied(true);
      }
    };

    if (isOpen) {
      checkFirstBuyer();
    }
  }, [isOpen]);

  const discount = voucherApplied ? Math.floor(subtotal * 0.2) : 0;
  const finalTotal = subtotal + 50 - discount;

  const handleCheckout = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // For simplicity, we create one order per farmer in the cart
      const farmerId = items[0].farmerId; 
      
      const orderRef = doc(collection(db, 'orders'));
      const orderData = {
        id: orderRef.id,
        buyerId: auth.currentUser.uid,
        farmerId,
        items: items.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        total: finalTotal,
        discount: discount,
        discountType: voucherApplied ? 'FIRST_BUYER_20' : null,
        status: 'pending',
        deliveryAddress: 'Home Address (Default)',
        contactNumber: '09123456789',
        paymentMethod: 'Cash on Delivery',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(orderRef, orderData);

      // Create notification for farmer
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: farmerId,
        title: 'New Order Received',
        message: `You have received a new order for ${items.length} items. Total: ₱${finalTotal}`,
        type: 'order',
        relatedId: orderRef.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      clearCart();
      setIsCheckingOut(true);
      setTimeout(() => {
        onClose();
        setIsCheckingOut(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="w-full max-w-lg bg-background h-full shadow-2xl flex flex-col border-l-4 border-white"
      >
        <div className="p-10 banig-pattern border-b-4 border-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl border-2 border-primary/10">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.4em] mb-1">Your Cart</p>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tighter font-serif italic">Farm To Home</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white hover:border-primary/20 rounded-full transition-all text-slate-400 hover:text-primary shadow-sm border border-slate-100 hover:scale-110 active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar amakan-pattern">
          <AnimatePresence mode="popLayout">
            {isCheckingOut ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl forest-shadow border-4 border-white">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tighter font-serif italic">Order Confirmed!</h3>
                <p className="text-slate-500 font-medium max-w-[240px] text-base leading-relaxed">Your order has been placed. We've notified the farmers.</p>
              </motion.div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex gap-4 p-4 bg-white rounded-3xl border-4 border-white shadow-lg clay-shadow group relative overflow-hidden"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500 shrink-0">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-base tracking-tight group-hover:text-primary transition-colors font-serif italic leading-tight line-clamp-1">{item.name}</h4>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-secondary hover:scale-110 active:scale-90 transition-all p-1.5"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-primary font-black text-lg tracking-tighter">₱{item.price * item.quantity}</p>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">₱{item.price}/{item.unit}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-100 p-1 w-fit mt-1 shadow-inner">
                      <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-primary rounded-lg text-slate-500 transition-all font-bold shadow-sm active:scale-90"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-serif font-black w-4 text-center text-slate-800 italic">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-primary rounded-lg text-slate-500 transition-all font-bold shadow-sm active:scale-90"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center mb-10 opacity-50 grayscale">
                  <ShoppingBag className="w-12 h-12 text-slate-400" />
                </div>
                <p className="font-serif text-3xl italic text-slate-400 leading-tight">Your cart is currently empty.</p>
                <button onClick={onClose} className="mt-10 text-[10px] font-bold text-primary uppercase tracking-[0.4em] underline underline-offset-8">Shop Now</button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {items.length > 0 && !isCheckingOut && (
          <div className="p-6 banig-pattern border-t-4 border-white space-y-6 shadow-2xl relative z-10">
            {isFirstBuyer && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center justify-between group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg text-emerald-500">
                    <Ticket className="w-5 h-5 rotate-45" />
                  </div>
                  <div>
                    <h4 className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.1em] mb-0.5">First Purchase</h4>
                    <p className="text-xs font-bold text-slate-800 font-serif italic">20% Discount ✨</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-[8px] font-bold text-emerald-400 uppercase mb-0.5">Saved</p>
                  <p className="text-base font-black text-emerald-600 tracking-tighter">-₱{discount}</p>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-800 font-serif italic">₱{subtotal}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Delivery</span>
                <span className="text-slate-800 font-serif italic">₱50</span>
              </div>
              {voucherApplied && (
                <div className="flex justify-between text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <span>Discount</span>
                  <span className="font-serif italic">-₱{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-slate-800 pt-3 border-t-2 border-white/30 items-end">
                <span className="font-serif italic text-sm text-slate-400 uppercase tracking-widest mb-1">Total</span>
                <span className="text-primary tracking-tighter text-3xl">₱{finalTotal}</span>
              </div>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 border-2 border-white/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Place Order
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-3 italic">
              <CreditCard className="w-4 h-4 text-secondary" /> Securely connected to local farm routes
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const CheckIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
