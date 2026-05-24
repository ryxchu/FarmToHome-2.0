import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, CheckCircle2, Ticket, MapPin, Truck, MessageSquare, ChevronLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
  const { user, openAuth } = useAuth();
  
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Interactive checkout details
  const [deliveryAddress, setDeliveryAddress] = useState('Central Heights, Tower B, Manila, Philippines 1000');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [contactNumber, setContactNumber] = useState('0917-888-2936');
  const [isEditingContact, setIsEditingContact] = useState(false);
  
  const [buyerMessage, setBuyerMessage] = useState('');
  const [paymentOption, setPaymentOption] = useState<'cod' | 'gcash' | 'card'>('cod');
  const [shippingType, setShippingType] = useState<'standard' | 'express'>('standard');
  const [redeemCoins, setRedeemCoins] = useState(false);
  
  // Checkbox select items state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [voucherApplied, setVoucherApplied] = useState(true);

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
  const discount = (voucherApplied && selectedItems.length > 0) ? Math.floor(selectedSubtotal * 0.2) : 0;
  const finalTotal = Math.max(0, selectedSubtotal + deliveryFee - discount - coinsDeduction);

  const handleNextStage = () => {
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    if (selectedItems.length === 0) return;
    setStage('checkout');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      openAuth('login', 'buyer');
      return;
    }
    setLoading(true);
    try {
      // Create orders grouped or with the first farmer in selected items
      const farmerId = selectedItems[0]?.farmerId || 'unknown_farmer'; 
      
      const orderRef = doc(collection(db, 'orders'));
      const orderData = {
        id: orderRef.id,
        buyerId: user.uid,
        farmerId,
        items: selectedItems.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        total: finalTotal,
        discount: discount,
        discountType: voucherApplied ? 'FIRST_BUYER_20' : null,
        status: 'pending',
        deliveryAddress,
        contactNumber,
        buyerMessage: buyerMessage || null,
        paymentMethod: paymentOption === 'cod' ? 'Cash on Delivery' : paymentOption === 'gcash' ? 'GCash Sauté Transfer' : 'Credit/Debit Card',
        shippingMethod: shippingType === 'express' ? 'Express Dispatch' : 'Standard Farm Route',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(orderRef, orderData);

      // Create notification for farmer
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: farmerId,
        title: 'New Order Sourced',
        message: `You've received a fresh crop order of ${selectedItems.length} crops. Sourced Total: ₱${finalTotal}`,
        type: 'order',
        relatedId: orderRef.id,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Remove selected items from cart
      selectedItemIds.forEach(id => removeFromCart(id));
      
      setIsCheckingOut(true);
      setTimeout(() => {
        onClose();
        setIsCheckingOut(false);
        setStage('cart');
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
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 w-full max-w-xs text-left">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <span>Recipient</span>
                    <span className="text-slate-700">{contactNumber}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    <span>Courier Route</span>
                    <span className="text-slate-700">{shippingType === 'express' ? 'Express Dispatch' : 'Standard Hub Carrier'}</span>
                  </div>
                </div>
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
                <div className="space-y-3">
                  {items.length > 0 ? (
                    items.map((item) => {
                      const isChecked = selectedItemIds.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          className={`flex items-start gap-3 p-3.5 bg-white rounded-2.5xl border transition-all relative group overflow-hidden ${
                            isChecked ? 'border-accent/30 shadow-md shadow-accent/5 bg-white' : 'border-stone-200 opacity-80'
                          }`}
                        >
                          {/* Item Custom Checkbox */}
                          <div className="pt-5 pl-1">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4.5 h-4.5 text-accent border-stone-300 rounded focus:ring-accent accent-accent"
                            />
                          </div>

                          {/* Crop Thumbnail */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0 relative">
                            <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=300'} className="w-full h-full object-cover" />
                            {!isChecked && <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px]" />}
                          </div>

                          {/* Details and Controller */}
                          <div className="flex-grow flex flex-col justify-between self-stretch py-0.5">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-slate-800 text-sm sm:text-base font-serif italic tracking-tight leading-snug line-clamp-1">{item.name}</h4>
                                <button 
                                  onClick={() => removeFromCart(item.id)} 
                                  className="text-stone-300 hover:text-stone-600 transition-colors shrink-0 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[8px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">₱{item.price} / {item.unit}</span>
                            </div>

                            <div className="flex justify-between items-end mt-2">
                              <p className="text-sm font-black text-slate-800">₱{item.price * item.quantity}</p>
                              
                              {/* Inline Quantity Stepper */}
                              <div className="flex items-center gap-1.5 bg-stone-50 rounded-xl border border-stone-150 p-1">
                                <button 
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="w-6.5 h-6.5 flex items-center justify-center bg-white hover:bg-stone-100 rounded-lg text-slate-500 hover:text-slate-850 shadow-sm border border-stone-200 transition-all active:scale-90"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs font-black font-serif italic text-center w-5 text-slate-800">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-6.5 h-6.5 flex items-center justify-center bg-white hover:bg-stone-100 rounded-lg text-slate-500 hover:text-slate-850 shadow-sm border border-stone-200 transition-all active:scale-90"
                                >
                                  <Plus className="w-2.5 h-2.5" />
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
                      <p className="text-[10px] font-bold text-slate-700">₱50 • 2-3 Days</p>
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
                      <p className="text-[10px] font-bold text-slate-700">₱95 • Next Day</p>
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM ACTION BAR & SUBSTANTIATIVE TOTALS BREAKDOWN */}
        {items.length > 0 && !isCheckingOut && (
          <div className="p-6 bg-white border-t border-stone-150 space-y-5 shadow-2xl relative z-20">
            {/* TICKET COUPONS NOTIFICATION */}
            {stage === 'cart' && voucherApplied && selectedItems.length > 0 && (
              <div className="bg-[#e9faf2] border border-[#a3e4c7] px-4 py-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Ticket className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h5 className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">FIRSTBUYER20 Applied</h5>
                    <p className="text-xs text-slate-700 font-bold font-serif italic">20% Off local sourced crops</p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-600">-₱{discount}</span>
              </div>
            )}

            {/* TOTAL PAYMENTS LINE CALCULATION */}
            <div className="space-y-2 px-1">
              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <span>Selected Items Subtotal</span>
                <span className="text-slate-800 font-serif italic">₱{selectedSubtotal}</span>
              </div>
              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <span>Freight Logistics Shipping</span>
                <span className="text-slate-800 font-serif italic">
                  {selectedItems.length > 0 ? `₱${deliveryFee}` : '₱0'}
                </span>
              </div>
              {voucherApplied && selectedItems.length > 0 && (
                <div className="flex justify-between text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">
                  <span>Sourced Promo Save</span>
                  <span className="font-serif italic">-₱{discount}</span>
                </div>
              )}
              {redeemCoins && selectedItems.length > 0 && (
                <div className="flex justify-between text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">
                  <span>Farm Coins Deduct</span>
                  <span className="font-serif italic">-₱{coinsDeduction}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black text-slate-850 pt-3 border-t border-stone-150 items-end">
                <span className="font-serif italic text-xs text-slate-400 uppercase tracking-[0.2em] mb-1">Total Payment</span>
                <span className="text-primary tracking-tighter text-3xl">₱{selectedItems.length > 0 ? finalTotal : 0}</span>
              </div>
            </div>

            {/* ACTION TRIGGERS */}
            {stage === 'cart' ? (
              <button
                onClick={handleNextStage}
                disabled={selectedItems.length === 0}
                className="w-full py-4.5 bg-primary hover:bg-primary/95 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/10"
              >
                Checkout ({selectedItemIds.length} Crops)
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={loading || selectedItems.length === 0}
                className="w-full py-4.5 bg-primary hover:bg-primary/95 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/10"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Place Order (₱{finalTotal})
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            )}

            <p className="text-[8.5px] text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2 italic">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Connecting community kitchens directly to upland agricultural farms
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

