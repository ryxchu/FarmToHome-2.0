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

        <div className="flex-grow overflow-y-auto p-10 space-y-8 no-scrollbar amakan-pattern">
          <AnimatePresence mode="popLayout">
            {isCheckingOut ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl forest-shadow border-4 border-white outline outline-4 outline-primary/10">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Order Confirmed!</h3>
                <p className="text-slate-500 font-medium max-w-[280px] text-lg leading-relaxed">Your order has been placed. We've notified the farmers.</p>
              </motion.div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex gap-6 p-6 bg-white rounded-[2.5rem] border-4 border-white shadow-xl clay-shadow group relative overflow-hidden"
                >
                  <img src={item.images?.[0]} className="w-28 h-28 rounded-3xl object-cover shadow-inner group-hover:scale-105 transition-transform duration-500" />
                  <div className="flex-grow flex flex-col py-2">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-primary transition-colors font-serif italic leading-tight">{item.name}</h4>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-secondary hover:scale-110 active:scale-90 transition-all p-2 bg-slate-50 rounded-xl hover:bg-secondary/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <p className="text-primary font-bold text-lg mb-4 tracking-tighter">₱{item.price * item.quantity}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl border border-slate-100 p-1.5 shadow-inner">
                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-primary rounded-xl text-slate-500 transition-all font-bold shadow-sm active:scale-90"><Minus className="w-4 h-4" /></button>
                        <span className="text-base font-serif font-black w-6 text-center text-slate-800 italic">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:text-primary rounded-xl text-slate-500 transition-all font-bold shadow-sm active:scale-90"><Plus className="w-4 h-4" /></button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">₱{item.price}/{item.unit}</span>
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
          <div className="p-10 banig-pattern border-t-4 border-white space-y-8 shadow-2xl relative z-10">
            {isFirstBuyer && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex items-center justify-between group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-emerald-500">
                    <Ticket className="w-6 h-6 rotate-45" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">First Purchase Reward</h4>
                    <p className="text-sm font-bold text-slate-800 font-serif italic">20% Discount Applied! ✨</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Saved</p>
                  <p className="text-lg font-black text-emerald-600 tracking-tighter">-₱{discount}</p>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-800">₱{subtotal}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Delivery Fee</span>
                <span className="text-slate-800">₱50</span>
              </div>
              {voucherApplied && (
                <div className="flex justify-between text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  <span>First Timer Discount (20%)</span>
                  <span>-₱{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-3xl font-bold text-slate-800 pt-6 border-t-2 border-white/50">
                <span className="font-serif italic">Order Total</span>
                <span className="text-primary tracking-tighter">₱{finalTotal}</span>
              </div>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-6 bg-primary text-white rounded-[2rem] font-bold text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 border-2 border-white/20"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Place Order
                  <ArrowRight className="w-5 h-5" />
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
