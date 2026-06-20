import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, CheckCircle2, Ticket, MapPin, Truck, MessageSquare, ChevronLeft, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, getDoc, query, where, limit, getDocs } from 'firebase/firestore';
import { GCashSandboxModal } from './GCashSandboxModal';
import { PayMongoRedirectModal } from './PayMongoRedirectModal';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
  const { user, profile, openAuth } = useAuth();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGCashSandbox, setShowGCashSandbox] = useState(false);
  const [paymongoCheckoutUrl, setPaymongoCheckoutUrl] = useState<string | null>(null);
  
  // Interactive checkout details
  const [deliveryAddress, setDeliveryAddress] = useState('Central Heights, Tower B, Manila, Philippines 1000');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [contactNumber, setContactNumber] = useState('0917-888-2936');
  const [isEditingContact, setIsEditingContact] = useState(false);
  
  const [buyerMessage, setBuyerMessage] = useState('');
  const [paymentOption, setPaymentOption] = useState<'cod' | 'gcash' | 'card'>('cod');
  const [shippingType, setShippingType] = useState<'standard' | 'express'>('standard');
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  
  // Checkbox select items state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>('FIRSTBUYER20');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);
  const [hasExistingOrders, setHasExistingOrders] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasExistingOrders(null);
      return;
    }
    const checkExistingOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('buyerId', '==', user.uid),
          limit(1)
        );
        const snapshot = await getDocs(q);
        const hasOrders = !snapshot.empty;
        setHasExistingOrders(hasOrders);
        if (hasOrders && appliedPromo === 'FIRSTBUYER20') {
          setAppliedPromo(null);
          setPromoError('FIRSTBUYER20 code was automatically removed because it is only for first-time buyers.');
        }
      } catch (err) {
        console.error("Error checking existing orders: ", err);
        setHasExistingOrders(false);
      }
    };
    checkExistingOrders();
  }, [user, appliedPromo]);

  const handleApplyPromo = () => {
    setPromoError(null);
    setPromoSuccessMsg(null);
    const code = promoCode.trim().toUpperCase();

    if (!code) {
      setPromoError('Please enter a voucher or promo code.');
      return;
    }

    if (code === 'FIRSTBUYER20' || code === 'FIRST_BUYER_20') {
      if (hasExistingOrders === true) {
        setPromoError('This voucher code is exclusively for first-time buyers.');
        return;
      }
      setAppliedPromo('FIRSTBUYER20');
      setPromoSuccessMsg('Success! 20% FIRSTBUYER discounts applied!');
      setPromoCode('');
    } else if (code === 'FRESHCROP10') {
      setAppliedPromo('FRESHCROP10');
      setPromoSuccessMsg('Success! 10% Fresh Crops promo applied!');
      setPromoCode('');
    } else if (code === 'HARVEST15') {
      setAppliedPromo('HARVEST15');
      setPromoSuccessMsg('Success! 15% Seasonal Harvest promo applied!');
      setPromoCode('');
    } else if (code === 'COOP50') {
      setAppliedPromo('COOP50');
      setPromoSuccessMsg('Success! ₱50 cooperative discount applied!');
      setPromoCode('');
    } else {
      setPromoError('Invalid voucher or promo code. Try codes like FRESHCROP10, HARVEST15, or COOP50!');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoSuccessMsg(null);
  };

  // Sync selectedItems when the cart items load
  useEffect(() => {
    if (items.length > 0) {
      setSelectedItemIds(items.map(i => i.id));
    }
  }, [items]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map(i => i.id));
    }
  };

  // Calculations for selected items only
  const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
  const selectedSubtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const coinsDeduction = redeemCoins ? 35 : 0;
  const deliveryFee = selectedItems.length > 0 ? (shippingType === 'express' ? 95 : 50) : 0;
  
  let discount = 0;
  if (selectedItems.length > 0 && appliedPromo) {
    if (appliedPromo === 'FIRSTBUYER20') {
      discount = Math.floor(selectedSubtotal * 0.2);
    } else if (appliedPromo === 'FRESHCROP10') {
      discount = Math.floor(selectedSubtotal * 0.1);
    } else if (appliedPromo === 'HARVEST15') {
      discount = Math.floor(selectedSubtotal * 0.15);
    } else if (appliedPromo === 'COOP50') {
      discount = Math.min(selectedSubtotal, 50);
    }
  }

  const finalTotal = Math.max(0, selectedSubtotal + deliveryFee - discount - coinsDeduction);

  const handleNextStage = () => {
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    if (selectedItems.length === 0) return;
    setStage('checkout');
  };

  const executeOrderSubmission = async (
    paymentIsCompleted: boolean, 
    paymentStatusValue: string,
    clearCartFromItems: boolean = true
  ) => {
    // Group selected items by their respective farmerId
    const itemsByFarmer = new Map<string, typeof selectedItems>();
    selectedItems.forEach(item => {
      const fId = item.farmerId || 'unknown_farmer';
      if (!itemsByFarmer.has(fId)) {
        itemsByFarmer.set(fId, []);
      }
      itemsByFarmer.get(fId)!.push(item);
    });

    const totalSubtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Loop through each farmer group to create separate orders
    for (const [farmerId, farmerItems] of itemsByFarmer.entries()) {
      const farmerSubtotal = farmerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Compute proportional discount for this farmer's subtotal
      const ratio = totalSubtotal > 0 ? (farmerSubtotal / totalSubtotal) : 0;
      const farmerDiscount = Math.round(discount * ratio);
      const farmerTotal = Math.max(0, farmerSubtotal - farmerDiscount);

      const orderRef = doc(collection(db, 'orders'));
      const orderData = {
        id: orderRef.id,
        buyerId: user!.uid,
        farmerId,
        items: farmerItems.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.images?.[0] || ""
        })),
        total: farmerTotal,
        discount: farmerDiscount,
        discountType: appliedPromo || null,
        status: 'pending',
        deliveryAddress,
        contactNumber,
        buyerMessage: buyerMessage || null,
        paymentMethod: paymentOption === 'cod' ? 'Cash on Delivery' : paymentOption === 'gcash' ? 'GCash Fast Transfer' : 'Credit or Debit Card',
        paymentStatus: paymentStatusValue,
        isPaid: paymentIsCompleted,
        shippingMethod: shippingType === 'express' ? 'Express Dispatch' : 'Standard Farm Route',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(orderRef, orderData);

      // Deduct stock in real-time for each purchased crop
      for (const item of farmerItems) {
        try {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(productRef, { stock: newStock });
            console.log(`Deducted stock for ${item.id}: current=${currentStock}, new=${newStock}`);
          }
        } catch (stockErr) {
          console.error(`Failed to deduct stock for product ${item.id}`, stockErr);
        }
      }

      // Create notification for farmer
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: farmerId,
        title: 'New Order Sourced',
        message: `You've received a fresh crop order of ${farmerItems.length} crops. Sourced Total: ₱${farmerTotal}. Status: ${paymentStatusValue}`,
        type: 'order',
        relatedId: orderRef.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    // Flush local caches to ensure immediate frontend reactivity
    localStorage.removeItem('shop_products_all');
    localStorage.removeItem('featured_products');

    if (clearCartFromItems) {
      // Remove selected items from cart
      selectedItemIds.forEach(id => removeFromCart(id));
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    setLoading(true);
    try {
      if (paymentOption === 'cod') {
        await executeOrderSubmission(false, 'Pending Cash Settlement');
        setIsCheckingOut(true);
      } else {
        console.log('[Payment System] Contacting backend to compile checkout session...');
        const res = await fetch('/api/payment/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: selectedItems,
            totalAmount: finalTotal,
            shippingFee: deliveryFee,
            discount: discount,
            customerName: profile?.fullName || user.displayName || 'Farmer Customer',
            customerEmail: user.email || 'customer@farmtohome.ph',
            customerPhone: contactNumber,
            deliveryAddress: deliveryAddress
          })
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || 'Failed to initialize payment gateway.');
        }

        if (result.mode === 'sandbox') {
           // Open localized high fidelity GCash secure simulator modal
           setShowGCashSandbox(true);
         } else if (result.mode === 'live' && result.checkoutUrl) {
           // Create the order traces beforehand as unpaid pending payment
           await executeOrderSubmission(false, 'Waiting for Gateway Settlement', false);
           // Launch the Secure Redirect Modal to open payment window cleanly in new tab
           setPaymongoCheckoutUrl(result.checkoutUrl);
         }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Payment Processing Alert: ${err.message || 'The checkout service is currently compiling lines.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxSuccess = async () => {
    try {
      setLoading(true);
      await executeOrderSubmission(true, 'GCash Payment Cleared');
      setIsCheckingOut(true);
    } catch (err) {
      console.error('Failed to complete sandbox payment order writes:', err);
      alert('Failed to authorize transaction state.');
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
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-[#FAF9F5] h-full shadow-2xl flex flex-col border-l border-stone-200"
      >
        {/* Navigation Indicator & Header */}
        <div className="p-6 bg-white border-b border-stone-150 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            {stage === 'checkout' && !isCheckingOut && (
              <button 
                onClick={() => setStage('cart')} 
                className="p-2 bg-stone-50 hover:bg-stone-100 rounded-xl transition-all text-slate-500 mr-1"
                title="Back to Cart list"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${stage === 'cart' ? 'bg-accent-light text-accent border border-border' : 'bg-[#e2f0e8] text-[#2d4f1e]'}`}>
                  {stage === 'cart' ? 'Stage 1: Shopping Cart' : 'Stage 2: Checkout'}
                </span>
                {stage === 'cart' && items.length > 0 && (
                  <span className="text-[9px] font-bold text-slate-400">({selectedItemIds.length} checked)</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-850 font-serif italic tracking-tight focus:outline-none">
                {stage === 'cart' ? 'Review Sourced Basket' : 'Confirm Order Details'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-stone-50 hover:bg-stone-100/80 rounded-full transition-all text-slate-400 hover:text-slate-850 border border-stone-150">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Stream Area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
          <AnimatePresence mode="wait">
            {isCheckingOut ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-xl shadow-emerald-500/10 border-4 border-white animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-850 font-serif italic">Mabuhay! Order Confirmed</h3>
                  <p className="text-slate-500 text-xs font-semibold max-w-xs leading-relaxed text-balance">
                    Your fresh farm yields have been successfully reserved! We have alerted the local agricultural hub.
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 w-full max-w-xs text-left mb-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <span>Recipient</span>
                    <span className="text-slate-700">{contactNumber}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    <span>Courier Route</span>
                    <span className="text-slate-700">{shippingType === 'express' ? 'Express Dispatch' : 'Standard Hub Carrier'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsCheckingOut(false);
                    setStage('cart');
                  }}
                  className="w-full max-w-xs py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-lg shadow-emerald-600/15 transition-all text-center cursor-pointer mt-4"
                >
                  Continue Shopping
                </button>
              </motion.div>
            ) : stage === 'cart' ? (
              /* STAGE: EDIT SHOPPING CART LIST (INSPIRATION: 3RD SCREEN) */
              <motion.div 
                key="cart-items"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                {/* SELECT ALL PANEL */}
                {items.length > 0 && (
                  <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-stone-200/80 shadow-sm">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedItemIds.length === items.length && items.length > 0} 
                        onChange={toggleSelectAll}
                        className="w-4.5 h-4.5 text-accent border-stone-300 rounded focus:ring-accent focus:ring-2 focus:ring-offset-2 accent-accent"
                      />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Select All Crops ({items.length})</span>
                    </label>
                    <button 
                      onClick={() => setSelectedItemIds([])} 
                      className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                )}

                {/* CROPS LIST */}
                <div className="space-y-2.5">
                  {items.length > 0 ? (
                    items.map((item) => {
                      const isChecked = selectedItemIds.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center gap-2.5 p-2.5 bg-white rounded-2xl border transition-all relative group overflow-hidden ${
                            isChecked ? 'border-accent/30 shadow-md shadow-accent/5 bg-white' : 'border-stone-200 opacity-80'
                          }`}
                        >
                          {/* Item Custom Checkbox */}
                          <div className="pl-1 shrink-0 flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 text-accent border-stone-300 rounded focus:ring-accent accent-accent cursor-pointer"
                            />
                          </div>

                          {/* Crop Thumbnail */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0 relative">
                            <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=300'} className="w-full h-full object-cover" />
                            {!isChecked && <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px]" />}
                          </div>

                          {/* Details and Controller */}
                          <div className="flex-grow flex flex-col justify-between py-0.5 min-w-0 h-16 sm:h-20">
                            <div>
                              <div className="flex justify-between items-start gap-1.5">
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm font-serif italic tracking-tight leading-snug line-clamp-1">{item.name}</h4>
                                <button 
                                  onClick={() => removeFromCart(item.id)} 
                                  className="text-stone-300 hover:text-stone-600 transition-colors shrink-0 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">₱{item.price} / {item.unit}</span>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs sm:text-sm font-black text-slate-800">₱{item.price * item.quantity}</p>
                              
                              {/* Inline Quantity Stepper */}
                              <div className="flex items-center gap-1 bg-stone-50 rounded-lg border border-stone-150 p-0.5">
                                <button 
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="w-5.5 h-5.5 flex items-center justify-center bg-white hover:bg-stone-100 rounded text-slate-500 hover:text-slate-850 shadow-xs border border-stone-200 transition-all active:scale-95"
                                >
                                  <Minus className="w-2 h-2" />
                                </button>
                                <span className="text-[11px] font-black font-serif italic text-center w-4 text-slate-800">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-5.5 h-5.5 flex items-center justify-center bg-white hover:bg-stone-100 rounded text-slate-500 hover:text-slate-850 shadow-xs border border-stone-200 transition-all active:scale-95"
                                >
                                  <Plus className="w-2 h-2" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-24 space-y-4">
                      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-slate-300 border border-stone-200">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-serif text-lg italic font-bold text-slate-400">Basket feels empty</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1">Add items from the marketplace first</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* AMBIENT SHOPEE-STYLING COIN REDEEM (INSPIRATION: 3RD SCREEN) */}
                {items.length > 0 && (
                  <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm flex items-center justify-between hover:border-stone-300 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 font-extrabold text-base select-none">
                        ₱
                      </div>
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Apply Farm Coins</h4>
                        <p className="text-xs text-slate-700 font-bold font-serif italic">Redeem ₱35 Farm Rewards Coins</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={redeemCoins} 
                        onChange={() => setRedeemCoins(!redeemCoins)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                    </label>
                  </div>
                )}
              </motion.div>
            ) : (
              /* STAGE: DETAILED CHECKOUT (INSPIRATION: 4TH SCREEN) */
              <motion.div 
                key="checkout-details"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                {/* DELIVERY ADDRESS PANEL */}
                <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Delivery Address</span>
                    </div>
                    <button 
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline"
                    >
                      {isEditingAddress ? 'Confirm' : 'Edit Info'}
                    </button>
                  </div>

                  {isEditingAddress ? (
                    <div className="space-y-2">
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full text-xs font-semibold p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        rows={3}
                        placeholder="Type detailed shipping address..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">{deliveryAddress}</p>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider inline-block">Default Hub Route</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Mobile</span>
                    {isEditingContact ? (
                      <input 
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        onBlur={() => setIsEditingContact(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingContact(false)}
                        autoFocus
                        className="text-right text-xs font-bold text-slate-800 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:border-accent outline-none"
                      />
                    ) : (
                      <span 
                        onClick={() => setIsEditingContact(true)}
                        className="text-xs font-bold text-slate-800 hover:text-accent cursor-pointer"
                        title="Click to change phone number"
                      >
                        {contactNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* ORDERED ITEMS RECAP LIST */}
                <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ordered Crops ({selectedItems.length})</span>
                  <div className="divide-y divide-stone-100 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {selectedItems.map((item, index) => (
                      <div key={item.id} className={`flex items-center gap-3 py-2.5 ${index === 0 ? 'pt-0' : ''}`}>
                        <img src={item.images?.[0]} className="w-10 h-10 rounded-lg object-cover border border-stone-100" />
                        <div className="flex-grow min-w-0">
                          <h5 className="text-xs font-bold text-slate-800 truncate leading-snug">{item.name}</h5>
                          <span className="text-[9px] text-[#362511]/50 font-bold uppercase tracking-widest">₱{item.price} x {item.quantity}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 shrink-0">₱{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SHIPPING METHOD PANEL */}
                <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-1">
                    <Truck className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Select Logistics Sauté</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShippingType('standard')}
                      className={`p-3 text-left border rounded-2xl transition-all ${
                        shippingType === 'standard' 
                          ? 'border-accent bg-accent-light text-slate-850 shadow-sm' 
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-slate-500'
                      }`}
                    >
                      <h4 className="text-xs font-extrabold uppercase tracking-wider mb-1">Standard</h4>
                      <p className="text-[10px] font-bold text-slate-700">₱50 • 3-5 Days</p>
                      <span className="text-[8px] text-slate-400 leading-none mt-1.5 block">Default cooperative fleet</span>
                    </button>
                    <button 
                      onClick={() => setShippingType('express')}
                      className={`p-3 text-left border rounded-2xl transition-all ${
                        shippingType === 'express' 
                          ? 'border-accent bg-accent-light text-slate-850 shadow-sm' 
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-slate-500'
                      }`}
                    >
                      <h4 className="text-xs font-extrabold uppercase tracking-wider mb-1">Express Dispatch</h4>
                      <p className="text-[10px] font-bold text-slate-700">₱95 • 1-3 Days</p>
                      <span className="text-[8px] text-emerald-600 font-bold leading-none mt-1.5 block">Sourced express van</span>
                    </button>
                  </div>
                </div>

                {/* BUYER MESSAGE / SPECIAL REQUEST */}
                <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 pb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message For Chef / Farmer</span>
                  </div>
                  <input 
                    type="text" 
                    value={buyerMessage}
                    onChange={(e) => setBuyerMessage(e.target.value)}
                    placeholder="Leave instructions (e.g. please choose big green leaves...)"
                    className="w-full text-xs font-medium p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                 {/* PAYMENT OPTIONS SELECTION PANEL */}
                 <div className="bg-white p-4 rounded-2.5xl border border-stone-200 shadow-sm space-y-3">
                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Payment Method</span>
                   <div className="space-y-2">
                     {[
                       { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Pay directly on arrival at your address' },
                       { id: 'gcash', label: 'GCash Fast Transfer', desc: 'Settle instantly to cooperative wallet' },
                       { id: 'card', label: 'Credit or Debit Card', desc: 'Secure online payment processing' }
                     ].map(payment => (
                       <label 
                         key={payment.id}
                         className={`flex items-start gap-3 p-3 border rounded-2xl cursor-pointer transition-all ${
                           paymentOption === payment.id
                             ? 'border-accent bg-accent-light'
                             : 'border-stone-200 bg-white hover:bg-stone-50'
                         }`}
                       >
                         <input 
                           type="radio" 
                           name="payment" 
                           value={payment.id} 
                           checked={paymentOption === payment.id}
                           onChange={() => setPaymentOption(payment.id as any)}
                           className="mt-1 text-accent border-stone-300 focus:ring-accent accent-accent"
                         />
                         <div>
                           <p className="text-xs font-black text-slate-800">{payment.label}</p>
                           <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{payment.desc}</p>
                         </div>
                       </label>
                     ))}
                   </div>

                   {/* Dynamic What's Next? instruction panel */}
                   <div className="mt-4 p-4.5 bg-amber-50/60 border border-amber-200/50 rounded-2xl text-[11px] leading-relaxed">
                     <p className="font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 ms-1">
                       <HelpCircle className="w-3.5 h-3.5 text-amber-700 animate-pulse" /> What's Next?
                     </p>
                     {paymentOption === 'cod' && (
                       <p className="text-amber-800 font-medium">
                         No upfront payment is required! Simply prepare <span className="font-black text-amber-950">Exact Cash</span> for the cooperative courier upon cargo arrival. You can track your rider's logistics timeline live under your <span className="font-bold">My Orders</span> page.
                       </p>
                     )}
                     {paymentOption === 'gcash' && (
                       <p className="text-amber-800 font-medium">
                         Send GCash transfer of the exact total to <span className="font-black text-amber-950">0917-888-FARM (FarmToHome Co-op)</span>. Note your Order ID in the transaction note, and upload the receipt screenshot in <span className="font-bold">Seller Chats</span> or present it to the delivery courier.
                       </p>
                     )}
                     {paymentOption === 'card' && (
                       <p className="text-amber-800 font-medium">
                         Upon clicking <span className="font-bold text-amber-950">Complete Order</span>, you will be redirected to our accredited secure bank gateway. Complete your 3D-Secure mobile OTP validation to process the payment instantly and safely.
                       </p>
                     )}
                   </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM ACTION BAR & SUBSTANTIATIVE TOTALS BREAKDOWN */}
        {items.length > 0 && !isCheckingOut && (
          <div className="p-4 sm:p-5 bg-white border-t border-stone-150 space-y-3.5 shadow-2xl relative z-20">
            {/* VOUCHER / PROMO SINGLE-LINE ENTRY POINT */}
            {stage === 'cart' && selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPromoCode('');
                  setPromoError(null);
                  setPromoSuccessMsg(null);
                  setShowVoucherModal(true);
                }}
                className="w-full flex items-center justify-between p-3.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-700">
                    {appliedPromo ? `FARM VOUCHER: ${appliedPromo}` : 'FARM VOUCHER & PROMO CODES (+)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {appliedPromo ? (
                    <span className="bg-emerald-55 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-250 shrink-0">
                      -{appliedPromo === 'COOP50' ? '₱50' : appliedPromo === 'FIRSTBUYER20' ? '20%' : appliedPromo === 'FRESHCROP10' ? '10%' : '15%'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Select</span>
                  )}
                  <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-slate-400 shrink-0" />
                </div>
              </button>
            )}

            {/* TOTAL PAYMENTS LINE CALCULATION */}
            <div className="space-y-1.5 px-0.5">
              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <span>Selected Items Subtotal</span>
                <span className="text-slate-800 font-sans font-bold">₱{selectedSubtotal}</span>
              </div>
              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <span>Freight Logistics Shipping</span>
                <span className="text-slate-800 font-sans font-bold">
                  {selectedItems.length > 0 ? `₱${deliveryFee}` : '₱0'}
                </span>
              </div>
              {appliedPromo && selectedItems.length > 0 && (
                <div className="flex justify-between text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                  <span>Sourced Promo Save ({appliedPromo})</span>
                  <span className="font-sans font-bold">-₱{discount}</span>
                </div>
              )}
              {redeemCoins && selectedItems.length > 0 && (
                <div className="flex justify-between text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">
                  <span>Farm Coins Deduct</span>
                  <span className="font-sans font-bold">-₱{coinsDeduction}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-slate-850 pt-2.5 border-t border-stone-150 items-end">
                <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Total Payment</span>
                <span className="text-primary tracking-tighter text-3xl font-sans font-black">₱{selectedItems.length > 0 ? finalTotal : 0}</span>
              </div>
            </div>

            {/* ACTION TRIGGERS */}
            {stage === 'cart' ? (
              <button
                onClick={handleNextStage}
                disabled={selectedItems.length === 0}
                className="w-full py-4 bg-primary hover:bg-primary/95 disabled:bg-stone-205 disabled:text-stone-400 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/10 cursor-pointer"
              >
                CHECKOUT ({selectedItemIds.length} {selectedItemIds.length === 1 ? 'ITEM' : 'ITEMS'})
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={loading || selectedItems.length === 0}
                className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/10 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    PLACE ORDER (₱{finalTotal})
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            )}

            <p className="text-[7.5px] sm:text-[8px] text-center text-stone-400 font-extrabold uppercase tracking-[0.1em] select-none pt-0.5 leading-relaxed">
              CONNECTING COMMUNITY KITCHENS DIRECTLY TO UPLAND AGRICULTURAL FARMS
            </p>
          </div>
        )}
      </motion.div>

      {/* Shopee-style Voucher Bottom-Sheet Modal Overlay */}
      <AnimatePresence>
        {showVoucherModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoucherModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110]"
            />
            {/* Bottom Sheet sliding panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-0 w-full sm:max-w-lg bg-white rounded-t-[2rem] border-t border-stone-200 shadow-2xl p-5 z-[120] flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Select Vouchers</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="p-1 px-2.5 py-1.5 hover:bg-stone-50 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrolling Content */}
              <div className="overflow-y-auto py-3 space-y-4 flex-grow no-scrollbar">
                {/* Input block */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-widest block">Have a direct promo code?</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError(null);
                        setPromoSuccessMsg(null);
                      }}
                      placeholder="e.g. FRESHCROP10"
                      className="flex-grow bg-stone-50 border border-stone-200 focus:border-emerald-600 rounded-xl px-4 py-2.5 text-xs font-bold outline-none uppercase placeholder-stone-400"
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Promo messages */}
                {promoError && (
                  <p className="text-[10px] font-bold text-rose-650 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                    {promoError}
                  </p>
                )}
                {promoSuccessMsg && (
                  <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                    {promoSuccessMsg}
                  </p>
                )}

                {/* Available Promo list */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[9px] text-stone-400 font-extrabold uppercase tracking-widest">Cooperative Promos</span>
                    {appliedPromo && (
                      <button 
                        onClick={handleRemovePromo}
                        className="text-[10px] font-black uppercase text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove Selected
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* FIRSTBUYER20 card */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasExistingOrders === true) {
                          setPromoError("This voucher code is exclusively for first-time buyers.");
                          setPromoSuccessMsg(null);
                          return;
                        }
                        setAppliedPromo('FIRSTBUYER20');
                        setPromoSuccessMsg('Success! 20% FIRSTBUYER discounts applied!');
                        setPromoError(null);
                      }}
                      disabled={hasExistingOrders === true}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        appliedPromo === 'FIRSTBUYER20'
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : hasExistingOrders === true
                          ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          appliedPromo === 'FIRSTBUYER20' ? 'bg-emerald-55 text-[#2d4f1e]' : 'bg-stone-100 text-slate-700'
                        }`}>
                          %
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">FIRSTBUYER20</h4>
                            {hasExistingOrders === true && (
                              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">Unavailable</span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">20% off your entire first organic farm purchase</p>
                        </div>
                      </div>
                      {appliedPromo === 'FIRSTBUYER20' && (
                        <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider shrink-0">Selected</span>
                      )}
                    </button>

                    {/* FRESHCROP10 card */}
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo('FRESHCROP10');
                        setPromoSuccessMsg('Success! 10% Fresh Crops promo applied!');
                        setPromoError(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        appliedPromo === 'FRESHCROP10'
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          appliedPromo === 'FRESHCROP10' ? 'bg-emerald-55 text-[#2d4f1e]' : 'bg-stone-100 text-slate-700'
                        }`}>
                          %
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">FRESHCROP10</h4>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">10% off high-quality organic highland crops</p>
                        </div>
                      </div>
                      {appliedPromo === 'FRESHCROP10' && (
                        <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider shrink-0">Selected</span>
                      )}
                    </button>

                    {/* HARVEST15 card */}
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo('HARVEST15');
                        setPromoSuccessMsg('Success! 15% Seasonal Harvest promo applied!');
                        setPromoError(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        appliedPromo === 'HARVEST15'
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          appliedPromo === 'HARVEST15' ? 'bg-emerald-55 text-[#2d4f1e]' : 'bg-stone-100 text-slate-700'
                        }`}>
                          %
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">HARVEST15</h4>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">15% off seasonal community harvest selections</p>
                        </div>
                      </div>
                      {appliedPromo === 'HARVEST15' && (
                        <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider shrink-0">Selected</span>
                      )}
                    </button>

                    {/* COOP50 card */}
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo('COOP50');
                        setPromoSuccessMsg('Success! ₱50 cooperative discount applied!');
                        setPromoError(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        appliedPromo === 'COOP50'
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          appliedPromo === 'COOP50' ? 'bg-emerald-55 text-[#2d4f1e]' : 'bg-stone-100 text-slate-700'
                        }`}>
                          ₱
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">COOP50</h4>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">Flat ₱50 off partner agricultural hubs</p>
                        </div>
                      </div>
                      {appliedPromo === 'COOP50' && (
                        <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider shrink-0">Selected</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirm footer */}
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="w-full mt-2 py-3.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black uppercase tracking-[0.15em] rounded-xl transition-colors text-center cursor-pointer"
              >
                Apply Voucher Selection
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GCashSandboxModal
        isOpen={showGCashSandbox}
        onClose={() => setShowGCashSandbox(false)}
        total={finalTotal}
        phone={contactNumber}
        name={profile?.fullName || user?.displayName || 'Farmer Customer'}
        onSuccess={handleSandboxSuccess}
      />

      <PayMongoRedirectModal
        isOpen={!!paymongoCheckoutUrl}
        onClose={() => setPaymongoCheckoutUrl(null)}
        checkoutUrl={paymongoCheckoutUrl || ''}
        total={finalTotal}
        onRedirect={() => onClose()}
      />
    </div>
  );
};

