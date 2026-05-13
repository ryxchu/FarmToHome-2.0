import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order } from '../types';
import { Plus, Package, ShoppingBag, TrendingUp, Edit, Trash2, X, Check, Image as ImageIcon, Star, User, Settings, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat } from '../components/Chat';

interface FarmerDashboardProps {
  onEditProfile?: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ onEditProfile }) => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'feedback' | 'messages'>('inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qConv = query(collection(db, 'conversations'), where('participants', 'array-contains', auth.currentUser.uid));
    const unsubscribeConv = onSnapshot(qConv, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'conversations'));

    return () => unsubscribeConv();
  }, []);

  const fetchRecipientProfile = async (conv: any) => {
    const recipientId = conv.participants.find((id: string) => id !== profile?.uid);
    const docSnap = await getDoc(doc(db, 'users', recipientId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), uid: docSnap.id } as any;
    }
    return null;
  };

  const handleOpenConversation = async (conv: any) => {
    const recipient = await fetchRecipientProfile(conv);
    if (recipient) {
      setSelectedConversation({ conv, recipient });
    }
  };
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandAllActivity, setExpandAllActivity] = useState(false);
  const [weatherAlert, setWeatherAlert] = useState<{ type: 'warning' | 'info'; message: string } | null>({
    type: 'info',
    message: 'Heavy rainfall expected tomorrow in your region. Consider harvesting early.'
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const qProds = query(collection(db, 'products'), where('farmerId', '==' , auth.currentUser.uid));
    const unsubscribeProds = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qOrders = query(collection(db, 'orders'), where('farmerId', '==' , auth.currentUser.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const qReviews = query(collection(db, 'reviews'), where('farmerId', '==' , auth.currentUser.uid));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    return () => {
      unsubscribeProds();
      unsubscribeOrders();
      unsubscribeReviews();
    };
  }, []);

  const totalSales = orders.reduce((sum, order) => order.status === 'delivered' ? sum + order.total : sum, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Send notification to buyer
      const orderSnap = await getDoc(doc(db, 'orders', orderId));
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const notificationRef = doc(collection(db, 'notifications'));
        await setDoc(notificationRef, {
          id: notificationRef.id,
          userId: orderData.buyerId,
          title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          message: `Your order #${orderId.slice(0, 8)} status has been updated to ${newStatus}.`,
          type: 'order',
          relatedId: orderId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Delete listing?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-2 h-10 bg-primary rounded-full" />
            <h1 className="text-5xl font-bold text-slate-800 tracking-tighter font-serif">Farmer <span className="italic text-primary">Dashboard</span></h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Managing {profile?.farmName || "Your Farm"}'s daily operations.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={onEditProfile}
            className="p-5 bg-white text-slate-400 hover:text-primary rounded-full transition-all border-2 border-slate-100 hover:border-primary/20 shadow-sm hover:shadow-lg hover:scale-110 active:scale-90"
          >
            <User className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex flex-col items-end mr-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Climate Intelligence</p>
            <p className="text-sm font-bold text-slate-700">Optimal Soil Energy • 28°C</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="group flex items-center gap-4 px-10 py-5 bg-primary text-white rounded-full font-bold hover:scale-105 transition-all shadow-2xl shadow-primary/20 active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            Add Product
          </button>
        </div>
      </div>

      {/* Weather Alert Panel */}
      {weatherAlert && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-12 p-8 rounded-[3rem] border-2 flex items-center gap-8 ${
            weatherAlert.type === 'warning' 
              ? 'bg-secondary/5 border-secondary/10 text-secondary' 
              : 'bg-primary/5 border-primary/10 text-primary'
          }`}
        >
          <div className={`p-4 rounded-2xl ${weatherAlert.type === 'warning' ? 'bg-secondary' : 'bg-primary'} text-white shadow-xl`}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-grow">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-60 mb-2">Farm Updates</p>
            <p className="text-lg font-bold tracking-tight">{weatherAlert.message}</p>
          </div>
          <button 
            onClick={() => setWeatherAlert(null)}
            className="p-3 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
        {/* Main Stat: Revenue */}
        <div className="lg:col-span-2 bg-primary text-white p-12 rounded-[4rem] relative overflow-hidden group shadow-2xl forest-shadow">
          <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-125" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-16">
              <div className="p-5 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-inner">
                <TrendingUp className="text-accent-light w-8 h-8" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] bg-white/10 text-accent-light py-2 px-6 rounded-full border border-white/10">Yield Increase +12.5%</span>
            </div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Total Sales Value</p>
            <h3 className="text-7xl font-bold tracking-tighter mb-4 font-serif italic">₱{totalSales.toLocaleString()}</h3>
            <p className="text-accent-light/80 text-xs font-bold uppercase tracking-widest">Excellent progress for your farm.</p>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-12 rounded-[4rem] border-2 border-border shadow-xl clay-shadow flex flex-col justify-between group hover:border-primary transition-all duration-500">
          <div>
            <div className="p-5 bg-accent-light rounded-3xl w-fit mb-10 group-hover:bg-primary/5 transition-colors border border-primary/5">
              <ShoppingBag className="text-primary w-8 h-8" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Orders to Ship</p>
            <h3 className="text-6xl font-bold text-slate-800 tracking-tighter font-serif italic">{pendingOrders.length}</h3>
          </div>
          <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.3em] mt-6">Ready to Process</p>
        </div>

        {/* Operational Health */}
        <div className="bg-background p-12 rounded-[4rem] border-2 border-border flex flex-col justify-between hover:bg-white transition-all cursor-pointer group hover:shadow-2xl hover:shadow-primary/5">
          <div className="space-y-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Farm Status</p>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Products</span>
                <span className="text-2xl font-bold text-primary font-serif italic">{products.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[75%] shadow-[0_0_10px_rgba(45,66,45,0.4)]" />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(45,66,45,0.6)]" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Inventory Updated</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Main Panel with Tabs */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center gap-6 px-4">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`text-xl font-bold tracking-tight transition-all ${activeTab === 'inventory' ? 'text-slate-800' : 'text-slate-300 hover:text-slate-400'}`}
            >
              Product Inventory
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`text-xl font-bold tracking-tight transition-all ${activeTab === 'feedback' ? 'text-slate-800' : 'text-slate-300 hover:text-slate-400'}`}
            >
              Customer Reviews
              {reviews.length > 0 && <span className="ml-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">{reviews.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`text-xl font-bold tracking-tight transition-all ${activeTab === 'messages' ? 'text-slate-800' : 'text-slate-300 hover:text-slate-400'}`}
            >
              Messages
              {conversations.length > 0 && <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">{conversations.length}</span>}
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            {activeTab === 'inventory' ? (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-[4rem] p-6 shadow-2xl shadow-primary/5 border border-border divide-y divide-border/50"
              >
                {products.length === 0 ? (
                  <div className="py-24 text-center">
                    <Package className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">No products in inventory</p>
                  </div>
                ) : (
                  products.map(product => (
                    <div key={product.id} className="p-10 group flex items-center justify-between hover:bg-background transition-all first:rounded-t-[3.5rem] last:rounded-b-[3.5rem]">
                      <div className="flex items-center gap-10">
                        <div className="relative">
                          <img 
                            src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=200'} 
                            className="w-24 h-24 rounded-[2.5rem] object-cover shadow-2xl group-hover:scale-110 transition-transform duration-1000" 
                          />
                          {product.stock <= 5 && (
                            <div className="absolute -top-3 -right-3 px-3 py-1.5 bg-secondary text-white text-[9px] font-bold uppercase rounded-xl shadow-xl tracking-widest">Low Stock</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-4 mb-2">
                            <p className="font-bold text-2xl text-slate-800 tracking-tighter font-serif italic">{product.name}</p>
                            <span className="px-3 py-1 bg-accent-light text-primary rounded-full text-[9px] font-bold uppercase tracking-widest border border-primary/5">{product.category}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <p className="text-sm font-bold text-primary tracking-tight">₱{product.price} <span className="text-[10px] text-slate-300 uppercase italic">per {product.unit}</span></p>
                            <div className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.stock} In Stock</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                        <button 
                          onClick={() => { setEditingProduct(product); setShowAddModal(true); }}
                          className="p-4 bg-white text-slate-400 hover:text-primary transition-all rounded-2xl border border-border shadow-sm hover:shadow-xl hover:scale-110 active:scale-90 group/btn"
                        >
                          <Edit className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="p-4 bg-white text-slate-400 hover:text-secondary transition-all rounded-2xl border border-border shadow-sm hover:shadow-xl hover:scale-110 active:scale-90 group/btn"
                        >
                          <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === 'feedback' ? (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {reviews.length === 0 ? (
                  <div className="bg-white rounded-[4rem] py-32 text-center border-2 border-border shadow-2xl shadow-primary/5">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/5 shadow-inner"
                    >
                      <Star className="w-8 h-8 text-primary shadow-2xl" />
                    </motion.div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Awaiting customer reviews</p>
                  </div>
                ) : (
                  reviews.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(review => (
                    <div key={review.id} className="bg-white p-10 rounded-[4rem] border-2 border-border shadow-2xl shadow-primary/5 hover:border-primary/20 transition-all group">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-accent-light rounded-2xl flex items-center justify-center text-primary font-bold text-xl font-serif italic border border-primary/10 shadow-inner">
                            {review.rating}
                          </div>
                          <div>
                            <div className="flex gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < review.rating ? 'text-secondary fill-secondary' : 'text-slate-100'}`} 
                                />
                              ))}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">User Review</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 font-medium text-lg leading-relaxed mb-8 italic">"{review.comment}"</p>
                      <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center border border-primary/5 shadow-inner">
                             <Package className="w-5 h-5 text-primary opacity-40" />
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Product: <span className="text-slate-800 italic">{products.find(p => p.id === review.productId)?.name || 'Local Product'}</span></p>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="messages"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-[4rem] p-6 shadow-2xl shadow-primary/5 border border-border divide-y divide-border/50"
              >
                {conversations.length === 0 ? (
                  <div className="py-24 text-center">
                    <MessageSquare className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">No messages yet</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      onClick={() => handleOpenConversation(conv)}
                      className="p-10 group flex items-center justify-between hover:bg-background transition-all first:rounded-t-[3.5rem] last:rounded-b-[3.5rem] cursor-pointer"
                    >
                      <div className="flex items-center gap-10">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-accent-light flex items-center justify-center overflow-hidden border border-primary/5">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participants.find((id: string) => id !== profile?.uid)}`} className="w-full h-full object-contain bg-accent-light" />
                        </div>
                        <div>
                          <div className="flex items-center gap-4 mb-2">
                            <p className="font-bold text-xl text-slate-800 tracking-tighter">{conv.buyerName === profile?.fullName ? conv.farmerName : conv.buyerName}</p>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-1">{conv.lastMessage || 'No messages yet'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{conv.lastMessageAt ? new Date(conv.lastMessageAt?.toDate?.() || conv.lastMessageAt).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Orders - Right Panel */}
        <div className="lg:col-span-2 space-y-10">
          <div className="px-6">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tighter font-serif italic">Recent Activity</h2>
          </div>
          
          <div className="bg-primary rounded-[4rem] p-12 shadow-2xl shadow-primary/20 text-white min-h-[600px] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
             
             {orders.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-30 relative z-10">
                 <ShoppingBag className="w-16 h-16 mb-6" />
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Waiting for new orders...</p>
               </div>
             ) : (
               <div className="space-y-8 relative z-10">
                 {orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, expandAllActivity ? orders.length : 5).map(order => (
                  <div key={order.id} className="p-8 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/10 transition-all border-l-8 border-l-secondary shadow-inner">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[9px] font-bold text-secondary uppercase tracking-[0.3em] mb-2">Order ID</p>
                        <p className="font-mono text-xs opacity-60">#{order.id.slice(0, 12)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.4em] border ${
                          order.status === 'pending' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          order.status === 'delivered' ? 'bg-accent-light/10 text-accent-light border-accent-light/20' : 
                          order.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          'bg-accent-light/10 text-accent-light border-accent-light/20'
                        }`}>
                          {order.status}
                        </span>
                        
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="px-4 py-2 bg-secondary text-white text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-secondary/20 tracking-widest hover:scale-110 hover:-rotate-2 active:scale-95"
                            >
                              Process
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'shipped')}
                              className="px-4 py-2 bg-accent-light text-primary text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-accent-light/20 tracking-widest hover:scale-110 hover:rotate-2 active:scale-95"
                            >
                              Ship
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="px-4 py-2 bg-secondary text-white text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-secondary/20 tracking-widest hover:scale-110 hover:-rotate-2 active:scale-95"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6 opacity-80 border-y border-white/5 py-6">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold tracking-tight">{item.name} <span className="opacity-40 italic">x {item.quantity}</span></span>
                          <span className="font-mono text-[10px]">₱{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold tracking-tighter font-serif italic text-accent-light">₱{order.total.toLocaleString()}</p>
                        <p className="text-[9px] opacity-40 font-bold uppercase mt-2 tracking-[0.2em]">Order Total</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-xs font-bold text-white/60 tracking-tight">{new Date(order.createdAt).toLocaleDateString()}</p>
                        <p className="text-[9px] opacity-40 font-bold uppercase mt-2 tracking-[0.2em]">Order Date</p>
                      </div>
                    </div>
                  </div>
                 ))}
                 
                 {orders.length > 5 && (
                   <button 
                    onClick={() => setExpandAllActivity(!expandAllActivity)}
                    className="w-full py-6 text-center text-[10px] font-bold uppercase tracking-[0.5em] text-white/40 hover:text-white transition-all border-t border-white/5 mt-10"
                   >
                     {expandAllActivity ? 'Show Less' : 'Show More'}
                   </button>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedConversation && (
          <Chat 
            conversationId={selectedConversation.conv.id} 
            recipientProfile={selectedConversation.recipient} 
            onClose={() => setSelectedConversation(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <ProductFormModal 
            initialData={editingProduct} 
            onClose={() => { setShowAddModal(false); setEditingProduct(null); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; trend: string; color: string }> = ({ icon, label, value, trend, color }) => (
  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-primary/20 transition-all">
    <div className={`p-4 ${color} rounded-2xl w-fit mb-6 transition-all group-hover:scale-110 shadow-sm`}>{icon}</div>
    <p className="text-slate-500 text-[10px] font-bold mb-1.5 uppercase tracking-widest opacity-70">{label}</p>
    <p className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-3">{value}</p>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{trend}</p>
  </div>
);

import { GoogleGenAI, Type } from "@google/genai";

const ProductFormModal: React.FC<{ initialData: Product | null; onClose: () => void }> = ({ initialData, onClose }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    category: initialData?.category || 'Vegetables',
    unit: initialData?.unit || 'kg',
    stock: initialData?.stock || 0,
    images: initialData?.images || []
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const getSmartPriceSuggestion = async () => {
    if (!formData.name) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Recommend a fair market price in Philippine Pesos (PHP) for ${formData.name} in the category of ${formData.category}. Consider seasonal trends. Return only the number.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedPrice: { type: Type.NUMBER }
            },
            required: ["recommendedPrice"]
          }
        }
      });
      
      const result = JSON.parse(response.text);
      if (result.recommendedPrice) {
        setFormData(prev => ({ ...prev, price: result.recommendedPrice }));
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const [imageInput, setImageInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        if ((profile?.status as string) === 'banned') {
          alert('Your account is banned. You cannot update products.');
          return;
        }
        await updateDoc(doc(db, 'products', initialData.id), { 
          ...formData,
          updatedAt: new Date().toISOString(),
          coordinates: profile?.coordinates || null,
          isPublished: (profile?.status as string) !== 'banned'
        });
      } else {
        if ((profile?.status as string) === 'banned') {
          alert('Your account is banned. You cannot add products.');
          return;
        }
        const productRef = doc(collection(db, 'products'));
        await setDoc(productRef, {
          ...formData,
          id: productRef.id,
          farmerId: auth.currentUser?.uid,
          rating: 0,
          reviewCount: 0,
          coordinates: profile?.coordinates || null,
          isPublished: (profile?.status as string) !== 'banned',
          harvestDate: new Date().toISOString()
        });
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, initialData ? `products/${initialData.id}` : 'products');
    } finally {
      setLoading(false);
    }
  };

  const addImage = () => {
    if (imageInput) {
      setFormData({ ...formData, images: [...formData.images, imageInput] });
      setImageInput('');
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-emerald-50"
      >
        <div className="max-h-[90vh] overflow-y-auto no-scrollbar">
          <div className="p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 text-slate-400 rounded-full transition-all border border-slate-100"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 group">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Product Name</label>
                <input 
                  type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Description</label>
                <textarea 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Price (₱)</label>
                  <button 
                    type="button"
                    onClick={getSmartPriceSuggestion}
                    disabled={aiLoading || !formData.name}
                    className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-500 disabled:opacity-50 flex items-center gap-1"
                  >
                    {aiLoading ? 'Analyzing...' : <>✨ Smart Price</>}
                  </button>
                </div>
                <input 
                  type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Stock</label>
                <input 
                  type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Category</label>
                <select 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                >
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Rice</option>
                  <option>Poultry</option>
                  <option>Dairy</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Unit</label>
                <select 
                  value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                >
                  <option value="kg">kilogram (kg)</option>
                  <option value="unit">unit/piece</option>
                  <option value="pack">pack</option>
                  <option value="gallon">gallon</option>
                  <option value="tray">tray</option>
                  <option value="sack">sack</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Product Images</label>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="flex flex-col gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary/40 transition-all group relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            setFormData({ ...formData, images: [...formData.images, base64String] });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                      <div className="p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload from Device</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Images only (PNG, JPG)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-100 flex-grow"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</span>
                    <div className="h-px bg-slate-100 flex-grow"></div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={imageInput} 
                      onChange={e => setImageInput(e.target.value)}
                      placeholder="Paste image URL here"
                      className="flex-grow px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                    <button 
                      type="button"
                      onClick={addImage}
                      className="px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {formData.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto p-1 no-scrollbar">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className="relative flex-shrink-0 group">
                        <img src={url} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md transition-all group-hover:scale-105" />
                        <button 
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1.5 shadow-lg hover:bg-rose-600 transition-all transform scale-0 group-hover:scale-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-bold font-serif text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : initialData ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  </div>
  );
};
