import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Order, Review, Product } from '../types';
import { Package, Truck, CheckCircle2, Clock, Map as MapIcon, Star, Camera, X, ShoppingBag, ArrowRight, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrderTracking: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<{ productId: string, name: string } | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'details'>('list');

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    
    setLoading(true);
    const q = query(collection(db, 'orders'), where('buyerId', '==', currentUid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setOrders(ords);
      
      // Update selected order in real-time
      if (ords.length > 0) {
        setSelectedOrder(prev => {
          if (!prev) return ords[0];
          const matched = ords.find(o => o.id === prev.id);
          return matched || prev;
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Real-time orders listener error", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setCancellingOrder(true);
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      setShowCancelModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${selectedOrder.id}`);
    } finally {
      setCancellingOrder(false);
    }
  };

  const statuses: { id: Order['status']; label: string; icon: any }[] = [
    { id: 'pending', label: 'Order Received', icon: Clock },
    { id: 'accepted', label: 'Farmer Accepted', icon: CheckCircle2 },
    { id: 'preparing', label: 'Preparing Fresh', icon: Package },
    { id: 'shipped', label: 'In Transit', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const currentStatusIndex = selectedOrder ? statuses.findIndex(s => s.id === selectedOrder.status) : -1;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-12 px-0 sm:px-4">
      <div className="flex items-center gap-6 mb-16">
        <div className="w-2 h-12 bg-secondary rounded-full" />
        <div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-800 tracking-tighter font-serif italic">Track Orders</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Tracking your recent purchases</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Order List */}
        <div className={`lg:col-span-4 space-y-10 ${activeMobileTab === 'details' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between px-4">
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-[0.3em]">Recent Orders</h2>
            <span className="px-3 py-1 bg-accent-light text-primary text-[9px] font-bold rounded-full border border-primary/10">{orders.length}</span>
          </div>
          <div className="space-y-6 max-h-[700px] overflow-y-auto no-scrollbar pr-4 pb-10">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order);
                  setActiveMobileTab('details');
                }}
                className={`w-full text-left p-8 rounded-[3rem] border-2 transition-all group ${
                  selectedOrder?.id === order.id 
                    ? 'bg-white border-primary shadow-2xl clay-shadow scale-[1.02]' 
                    : 'bg-white border-transparent hover:border-accent hover:shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Order ID</span>
                    <span className="font-bold text-slate-800 font-serif italic text-lg">#{order.id.slice(0, 8)}</span>
                  </div>
                  <span className={`text-[9px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest ${
                    order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                    order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    'bg-accent-light text-primary border border-primary/10'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-primary transition-colors">
                        <ShoppingBag className="w-4 h-4" />
                     </div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{order.items.length} items • ₱{order.total}</p>
                   </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-primary font-bold text-[9px] uppercase tracking-[0.3em]">
                  <span>Track Timeline</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>
            ))}
            {orders.length === 0 && !loading && (
              <div className="p-20 text-center bg-accent-light rounded-[4rem] border-4 border-dashed border-white shadow-inner">
                <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <ShoppingBag className="w-10 h-10 text-primary opacity-20" />
                </div>
                <p className="text-slate-400 font-serif italic text-xl">You haven't placed any orders yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Details */}
        <div className={`lg:col-span-8 space-y-6 sm:space-y-12 ${activeMobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-12"
              >
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10 px-2 sm:px-0">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <button
                      onClick={() => setActiveMobileTab('list')}
                      className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-primary transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                      title="Back to Orders list"
                    >
                      <ArrowLeft className="w-4 h-4 text-primary" />
                    </button>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-md border border-slate-100 shrink-0">
                      <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-primary shadow-sm" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-4xl font-bold text-slate-800 tracking-tighter font-serif italic truncate">Order Details</h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:tracking-[0.3em] truncate">Viewing Order #{selectedOrder.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] sm:text-[10px] px-4 py-1.5 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider sm:tracking-[0.4em] border border-stone-200 sm:border-2 shadow-sm self-start sm:self-auto ${
                    selectedOrder.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-150' : 
                    selectedOrder.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-150' :
                    'bg-accent-light text-primary border-primary/10'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Timeline Card */}
                <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] border-4 border-white shadow-xl forest-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-accent-light rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none" />
                  
                  {selectedOrder.status === 'cancelled' ? (
                    <div className="relative z-10 py-6 sm:py-10 flex flex-col items-center text-center">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-rose-50 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 border-4 border-white shadow-md">
                        <X className="w-8 h-8 sm:w-12 sm:h-12 text-rose-500" />
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-bold text-slate-800 tracking-tighter font-serif italic mb-2 sm:mb-4">Order Cancelled</h3>
                      <p className="text-slate-400 text-sm font-medium max-w-sm px-2">This order has been cancelled and will not be processed further.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Horizontal Timeline (md and up) */}
                      <div className="hidden md:flex items-center justify-between mb-24 relative z-10 px-8">
                        {statuses.map((status, idx) => {
                          const Icon = status.icon;
                          const isActive = idx <= currentStatusIndex;
                          const isCompleted = idx < currentStatusIndex;
                          const isCurrent = idx === currentStatusIndex;

                          return (
                            <div key={status.id} className="relative flex flex-col items-center flex-grow group">
                              {/* Line */}
                              {idx < statuses.length - 1 && (
                                <div className={`absolute top-8 left-1/2 w-full h-[4px] rounded-full transition-all duration-1000 ${isActive && (idx < currentStatusIndex) ? 'bg-primary shadow-[0_0_10px_rgba(45,86,51,0.3)]' : 'bg-slate-100 shadow-inner'}`} />
                              )}
                              
                              <div className={`relative z-10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 border-4 ${
                                isCurrent ? 'bg-primary text-white border-white shadow-2xl scale-125 rotate-6' :
                                isCompleted ? 'bg-white text-primary border-accent-light shadow-lg' : 'bg-slate-50 text-slate-300 border-slate-100'
                              }`}>
                                <Icon className="w-7 h-7" />
                              </div>
                              
                              <div className="absolute top-24 w-max">
                                <p className={`text-[9px] font-bold text-center uppercase tracking-[0.3em] font-serif transition-colors duration-500 ${
                                  isActive ? 'text-slate-800' : 'text-slate-300'
                                }`}>
                                  {status.label}
                                </p>
                              </div>

                              {isCurrent && (
                                <motion.span 
                                  layoutId="current-glow"
                                  className="absolute -top-4 w-4 h-4 bg-secondary rounded-full border-4 border-white shadow-xl shadow-secondary/50 animate-pulse"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Mobile Vertical Timeline (under md) */}
                      <div className="flex md:hidden flex-col gap-6 mb-8 relative z-10 pl-3 py-1">
                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100 rounded" />
                        
                        {/* Shaded Active Path */}
                        {currentStatusIndex > 0 && (
                          <div 
                            className="absolute left-[19px] top-4 w-[2px] bg-primary rounded transition-all duration-1000"
                            style={{ 
                              height: `${(currentStatusIndex) / (statuses.length - 1) * 90}%`
                            }}
                          />
                        )}
                        
                        {statuses.map((status, idx) => {
                          const Icon = status.icon;
                          const isActive = idx <= currentStatusIndex;
                          const isCompleted = idx < currentStatusIndex;
                          const isCurrent = idx === currentStatusIndex;

                          return (
                            <div key={status.id} className="flex items-center gap-4 relative z-10">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2 shrink-0 ${
                                isCurrent ? 'bg-primary text-white border-white shadow-lg scale-110' :
                                isCompleted ? 'bg-white text-primary border-accent-light shadow-sm' : 'bg-slate-50 text-slate-350 border-slate-100'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              
                              <div className="flex flex-col min-w-0">
                                <p className={`text-xs font-bold uppercase tracking-wider ${
                                  isActive ? 'text-slate-800' : 'text-slate-300'
                                }`}>
                                  {status.label}
                                </p>
                                {isCurrent && (
                                  <span className="text-[9px] text-primary font-bold uppercase tracking-widest mt-0.5 animate-pulse">
                                    Current Status
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-4 relative z-10">
                        {(selectedOrder.status === 'pending' || selectedOrder.status === 'accepted') && (
                          <button 
                            onClick={() => setShowCancelModal(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold border border-rose-100 shadow-xl text-[9px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                            Cancel Order
                          </button>
                        )}
                        {selectedOrder.status === 'shipped' && (
                          <button className="group flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-2xl font-bold border border-white/10 shadow-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all active:scale-95">
                            <MapIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            View Live Map
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Tracking Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                   {/* Delivery Map Mirror */}
                  {selectedOrder.status === 'shipped' && (
                    <div className="aspect-square bg-background rounded-[2rem] sm:rounded-[4rem] overflow-hidden relative border-4 border-white shadow-xl group forest-shadow">
                      <img 
                        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" 
                        className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-110 transition-transform duration-[10000ms]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/5">
                        <div className="p-4 sm:p-8 bg-white/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex items-center gap-4 sm:gap-6 border-2 sm:border-4 border-primary/5 max-w-[90%]">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                            <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-bounce" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Live Location</p>
                             <p className="text-base sm:text-xl font-bold text-slate-800 italic font-serif truncate">San Mateo High Road</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Summary Details */}
                  <div className={`bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] border-4 border-white shadow-xl forest-shadow relative overflow-hidden ${selectedOrder.status !== 'shipped' ? 'md:col-span-2' : ''}`}>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-accent-light rounded-full -mr-24 -mt-24 opacity-30 shadow-inner"></div>
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-12 relative z-10">
                       <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent-light flex items-center justify-center text-primary shrink-0">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                       </div>
                       <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight font-serif italic">Delivery Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 text-sm relative z-10 font-sans">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 border-b border-border pb-1 w-max">Delivery Address</p>
                        <p className="font-bold text-slate-800 text-base sm:text-xl leading-snug font-serif italic">{selectedOrder.deliveryAddress}</p>
                        <div className="flex items-center gap-2 mt-4 text-primary opacity-60">
                           <Clock className="w-4 h-4" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">Arrival Target: Today</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 border-b border-border pb-1 w-max">Payment Method</p>
                        <p className="font-bold text-slate-800 text-base sm:text-lg uppercase tracking-wider sm:tracking-widest mb-2">{selectedOrder.paymentMethod || 'Cash On Delivery'}</p>
                        <p className="text-primary font-bold text-2xl sm:text-5xl font-serif tracking-tighter">₱{selectedOrder.total}</p>
                      </div>
                    </div>

                    {/* Highly Polished Sourced Items Breakdown List */}
                    <div className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-slate-100 relative z-10 font-sans">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-4 sm:mb-6">Ordered Crops Details</p>
                      <div className="space-y-3 sm:space-y-4">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-4 px-6 bg-slate-50 border border-slate-100 hover:border-accent/15 hover:bg-accent-light/5 rounded-2xl transition-all">
                            <div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl overflow-hidden bg-accent-light shrink-0 border border-slate-100">
  {item.image ? (
    <img
      src={item.image}
      alt={item.name}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center font-bold text-primary font-serif italic text-base">
      {item.name?.[0] || 'C'}
    </div>
  )}
</div>
                              <div>
                                <span className="font-extrabold text-slate-800 text-sm leading-none block mb-1">{item.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Qty: {item.quantity}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-850 font-serif italic text-sm block">₱{item.price * item.quantity}</span>
                              <span className="text-[9px] text-[#362511]/50 font-bold uppercase tracking-widest block">₱{item.price} each</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Invitation */}
                {selectedOrder.status === 'delivered' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary p-6 sm:p-16 rounded-[2.5rem] sm:rounded-[5rem] text-white overflow-hidden relative shadow-2xl forest-shadow"
                  >
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
                    <div className="absolute top-10 right-16">
                       <Star className="w-20 h-20 text-accent-light opacity-10 rotate-12" />
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-bold mb-8 font-serif italic tracking-tighter leading-tight">Rate your <br /> <span className="text-accent-light">Recent Order</span></h3>
                    <p className="text-white/60 text-lg mb-12 max-w-xl font-medium leading-relaxed">Share your feedback about the produce quality and delivery experience.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all group">
                          <div>
                             <p className="text-[9px] font-bold text-accent-light uppercase tracking-widest mb-1 opacity-60">Product Purchased</p>
                             <span className="text-xl font-bold font-serif italic">{item.name}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setReviewingItem({ productId: item.productId, name: item.name });
                              setShowReviewModal(true);
                            }}
                            className="px-10 py-4 bg-accent-light text-primary text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-xl shadow-black/10 active:scale-95 group-hover:scale-105"
                          >
                            Write Review
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[500px]">
                <div className="w-32 h-32 bg-accent-light rounded-[3rem] flex items-center justify-center mb-10 shadow-inner">
                  <Package className="w-12 h-12 text-primary opacity-20" />
                </div>
                <p className="font-serif italic text-3xl text-slate-400 tracking-tighter">Choose a journey to track.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showReviewModal && reviewingItem && selectedOrder && (
          <ReviewModal 
            orderId={selectedOrder.id}
            productId={reviewingItem.productId}
            farmerId={selectedOrder.farmerId}
            productName={reviewingItem.name}
            onClose={() => {
              setShowReviewModal(false);
              setReviewingItem(null);
            }}
          />
        )}
        {showCancelModal && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3.5rem] overflow-hidden shadow-2xl relative border-4 border-white p-12"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-8 mx-auto border-4 border-white shadow-lg">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tighter font-serif italic text-center mb-4">Cancel Order?</h3>
              <p className="text-slate-500 text-center mb-10 font-medium">Are you sure you want to cancel this order? This action cannot be undone.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all border-2 border-slate-100"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleCancelOrder}
                  disabled={cancellingOrder}
                  className="py-5 bg-rose-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {cancellingOrder ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    'Confirm Cancel'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReviewModal: React.FC<{ 
  orderId: string, 
  productId: string, 
  farmerId: string,
  productName: string,
  onClose: () => void 
}> = ({ orderId, productId, farmerId, productName, onClose }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const review: Omit<Review, 'id'> = {
        orderId,
        productId,
        buyerId: auth.currentUser!.uid,
        farmerId,
        rating,
        comment,
        images: [],
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'reviews'), review);

      // Simple update logic for product rating (simulated)
      const prodRef = doc(db, 'products', productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as Product;
        const newReviewCount = (prodData.reviewCount || 0) + 1;
        const newRating = Number((( (prodData.rating || 0) * (prodData.reviewCount || 0) + rating) / newReviewCount).toFixed(1));
        await updateDoc(prodRef, {
          rating: newRating,
          reviewCount: newReviewCount
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl relative border-4 border-white max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="p-6 sm:p-12">
          <div className="flex justify-between items-center mb-6 sm:mb-12">
            <div className="min-w-0 pr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.4em] mb-1 sm:mb-2">Order Review</p>
              <h2 className="text-xl sm:text-3xl font-bold text-slate-800 tracking-tighter font-serif italic truncate">Review {productName}</h2>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full transition-all border border-slate-100 shrink-0">
              <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em] font-serif italic">How was the product?</p>
              <div className="flex gap-2 sm:gap-4">
                {[1,2,3,4,5].map(star => (
                   <button 
                    key={star} 
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2.5 sm:p-5 rounded-xl sm:rounded-3xl transition-all duration-500 border-2 ${
                      star <= rating 
                        ? 'bg-accent-light text-primary border-primary shadow-lg clay-shadow scale-105' 
                        : 'bg-slate-50 text-slate-200 border-transparent grayscale scale-95'
                    }`}
                  >
                    <Star className={`w-5 h-5 sm:w-8 sm:h-8 ${star <= rating ? 'fill-primary' : ''}`} />
                  </button>
                ))}
              </div>
              <p className="text-primary font-bold text-sm sm:text-lg uppercase tracking-[0.2em] sm:tracking-[0.4em]">
                {rating === 5 ? 'Excellent' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] block ml-1 sm:ml-2">Product Feedback</label>
              <textarea 
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Freshness, quality, and delivery experience..."
                className="w-full px-4 py-4 sm:px-8 sm:py-6 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-[2rem] text-xs sm:text-sm min-h-[100px] sm:min-h-[160px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all font-medium resize-none shadow-inner"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <button 
                type="button" 
                className="flex items-center justify-center gap-2 sm:gap-4 py-3 sm:py-5 bg-white text-slate-400 rounded-xl sm:rounded-[1.5rem] font-bold uppercase tracking-widest text-[8px] sm:text-[9px] border-2 border-slate-100 hover:border-slate-200 transition-all shadow-sm"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Photo
              </button>
              <button 
                type="submit" disabled={loading}
                className="py-3 sm:py-5 bg-primary text-white rounded-xl sm:rounded-[1.5rem] font-bold uppercase tracking-wider sm:tracking-[0.2em] text-[9px] sm:text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
