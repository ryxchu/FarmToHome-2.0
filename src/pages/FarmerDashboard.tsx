import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, updateDoc, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order } from '../types';
import { Plus, Package, ShoppingBag, TrendingUp, Edit, Trash2, X, Check, Image as ImageIcon, Star, User, Settings, MessageSquare, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat } from '../components/Chat';

interface FarmerDashboardProps {
  onEditProfile?: () => void;
  activeTabProp?: 'inventory' | 'feedback' | 'messages';
  onTabChange?: (tab: 'inventory' | 'feedback' | 'messages') => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ onEditProfile, activeTabProp, onTabChange }) => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'feedback' | 'messages'>(activeTabProp || 'inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  const handleTabChange = (tab: 'inventory' | 'feedback' | 'messages') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const fetchData = async () => {
      try {
        // Fetch products once
        const qProds = query(collection(db, 'products'), where('farmerId', '==', currentUid));
        const prodsSnap = await getDocs(qProds);
        setProducts(prodsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));

        // Fetch orders once
        const qOrders = query(collection(db, 'orders'), where('farmerId', '==', currentUid));
        const ordersSnap = await getDocs(qOrders);
        setOrders(ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));

        // Fetch reviews once
        const qReviews = query(collection(db, 'reviews'), where('farmerId', '==', currentUid));
        const reviewsSnap = await getDocs(qReviews);
        setReviews(reviewsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'farmer_dashboard_data');
      }
    };

    fetchData();

    // Keep conversations real-time as messaging needs it
    const qConv = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUid));
    const unsubscribeConv = onSnapshot(qConv, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'conversations'));

    return () => unsubscribeConv();
  }, [auth.currentUser?.uid]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const ordersPerPage = 4;
  const productsPerPage = 5;
  
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const totalProductPages = Math.ceil(products.length / productsPerPage);

  const paginatedOrders = orders
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  const paginatedProducts = products
    .sort((a,b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice((currentProductPage - 1) * productsPerPage, currentProductPage * productsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header Area - Catalog & Stats only */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-2 h-10 bg-primary rounded-full" />
              <h1 className="text-4xl font-bold text-slate-800 tracking-tighter font-sans">Store <span className="italic text-primary font-serif">Management</span></h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Real-time operational overview for {profile?.farmName || "Your Farm"}.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onEditProfile}
              className="px-6 py-3 bg-white text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-slate-100 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-3"
            >
              <User className="w-4 h-4" /> Profile Settings
            </button>
            <button 
              onClick={() => handleTabChange('messages')}
              className="px-6 py-3 bg-white text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-slate-100 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-3 relative"
            >
              <MessageSquare className="w-4 h-4" /> Messages
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </div>
      )}

      {/* Title Specific Headers for Feedback and Client Inbox */}
      {activeTab === 'feedback' && (
        <div className="flex items-center gap-4 mb-10">
          <div className="w-2 h-10 bg-primary rounded-full" />
          <h1 className="text-4xl font-bold text-slate-800 tracking-tighter font-sans">Customer <span className="italic text-primary font-serif">Feedback & Reviews</span></h1>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="flex items-center gap-4 mb-10">
          <div className="w-2 h-10 bg-primary rounded-full" />
          <h1 className="text-4xl font-bold text-slate-800 tracking-tighter font-sans">Client <span className="italic text-primary font-serif">Inbox</span></h1>
        </div>
      )}

      {/* Stats Row - Catalog & Stats only */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Active Products</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{products.length}</h3>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 italic font-sans tracking-widest">Listed Products</span>
            </div>
            <Package className="absolute right-6 bottom-6 w-12 h-12 text-slate-50 -mb-2 -mr-2" />
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Top Performer</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate">
                  {products.sort((a,b) => (b.rating || 0) - (a.rating || 0))[0]?.name || '---'}
                </h3>
                <p className="text-[10px] font-medium text-slate-400">Winning Item</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Performance</p>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full rotate-[-90deg] absolute">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#f8fafc" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="125" strokeDashoffset="30" strokeLinecap="round" />
                </svg>
                <span className="text-[9px] font-bold text-emerald-600 relative z-10">82%</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight font-sans leading-none mb-1">Good!</h3>
                <p className="text-[10px] font-medium text-slate-400">Quality Score</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Sales Value</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-black text-primary tracking-tighter">₱{totalSales.toLocaleString()}</h3>
              <span className="text-[10px] font-bold text-emerald-500 mb-1.5">+12.4%</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-16">
        {/* Main Panel */}
        <div className="space-y-10">
          {activeTab === 'inventory' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">Produce & Crop Catalog</h2>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search produce..." 
                    className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[2rem] text-xs focus:ring-2 focus:ring-primary/10 outline-none w-72 transition-all shadow-sm"
                  />
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                <button 
                  onClick={() => { setEditingProduct(null); setShowAddModal(true); }}
                  className="px-8 py-4 bg-primary text-white rounded-[2rem] text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>
          )}
          
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
                  <>
                    <div className="bg-white/50 border border-slate-100 rounded-[3.5rem] overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 px-10 py-6 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="col-span-4">Product Info</div>
                        <div className="col-span-2">Performance</div>
                        <div className="col-span-3">Inventory Status</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-1"></div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {paginatedProducts.map(product => (
                          <div key={product.id} className="grid grid-cols-12 gap-4 px-10 py-8 items-center bg-white hover:bg-slate-50/50 transition-colors group">
                            <div className="col-span-4 flex items-center gap-6">
                              <div className="relative flex-shrink-0">
                                <img 
                                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=200'} 
                                  className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-white" 
                                  alt={product.name}
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-lg tracking-tight mb-1">{product.name}</h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-tighter">Verified</span>
                                  <span className="text-[10px] font-medium text-slate-400 italic">ID: {product.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-2">
                              <div className="flex flex-col gap-1.5">
                                <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                                  (product.rating || 0) >= 4.5 ? 'text-emerald-500' : 
                                  (product.rating || 0) >= 3.5 ? 'text-amber-500' : 'text-slate-400'
                                }`}>
                                  {(product.rating || 0) >= 4.5 ? 'Excellent' : 
                                   (product.rating || 0) >= 3.5 ? 'Good' : 'Needs Review'}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400">
                                  <TrendingUp className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">{(product.reviewCount || 0) * 12} Views</span>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-3">
                              <div className="flex items-center gap-4">
                                <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      product.stock > 50 ? 'bg-emerald-500' : 
                                      product.stock > 10 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (product.stock / 200) * 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold w-20 ${product.stock <= 10 ? 'text-rose-500' : 'text-slate-600'}`}>
                                  {product.stock} {product.unit}s
                                </span>
                              </div>
                            </div>

                            <div className="col-span-2 text-right">
                              <p className="text-lg font-black text-slate-800 tracking-tighter">₱{product.price.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">per {product.unit}</p>
                            </div>

                            <div className="col-span-1 flex justify-end gap-2 pr-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setEditingProduct(product); setShowAddModal(true); }}
                                  className="p-2.5 text-slate-400 hover:text-primary transition-all hover:bg-primary/5 rounded-xl border border-slate-100"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteProduct(product.id)}
                                  className="p-2.5 text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-xl border border-slate-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {totalProductPages > 1 && (
                      <div className="flex items-center justify-center gap-4 p-8 bg-slate-50/50 rounded-b-[4rem]">
                        <button 
                          disabled={currentProductPage === 1}
                          onClick={() => setCurrentProductPage(prev => Math.max(1, prev - 1))}
                          className="p-3 bg-white text-slate-400 hover:text-primary disabled:opacity-30 rounded-2xl border border-border transition-all shadow-sm"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex gap-2">
                          {[...Array(totalProductPages)].map((_, i) => (
                            <button 
                              key={i}
                              onClick={() => setCurrentProductPage(i + 1)}
                              className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${currentProductPage === i + 1 ? 'bg-primary text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button 
                          disabled={currentProductPage === totalProductPages}
                          onClick={() => setCurrentProductPage(prev => Math.min(totalProductPages, prev + 1))}
                          className="p-3 bg-white text-slate-400 hover:text-primary disabled:opacity-30 rounded-2xl border border-border transition-all shadow-sm"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
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

        {/* Recent Orders - Bottom Business Panel */}
        <div className="space-y-12">
          <div className="px-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 tracking-tighter font-sans italic">Operational Log</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction History & Fulfillment</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-[4rem] p-16 shadow-inner min-h-[400px] relative overflow-hidden">
             {orders.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-30 relative z-10 py-20">
                 <ShoppingBag className="w-16 h-16 mb-6 text-slate-400" />
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Inventory is standby...</p>
               </div>
             ) : (
               <div className="relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {paginatedOrders.map(order => (
                    <div key={order.id} className="p-10 bg-white border border-slate-200 rounded-[3.5rem] hover:shadow-xl hover:shadow-slate-200/50 transition-all border-l-8 border-l-primary flex flex-col h-full group">
                      <div className="flex justify-between items-start mb-8 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Receipt ID</p>
                          <p className="font-mono text-sm text-slate-800 font-bold opacity-80">#{order.id.slice(0, 10).toUpperCase()}</p>
                        </div>
                        <span className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-[0.3em] border flex-shrink-0 ${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                          order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4 mb-8 opacity-90 border-y border-slate-100 py-8 flex-grow">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-700 tracking-tight">{item.name} <span className="text-[10px] text-slate-400 font-medium italic ml-2">x {item.quantity}</span></span>
                            <span className="font-mono text-[11px] font-bold text-slate-800">₱{(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] opacity-40 font-bold uppercase mb-2 tracking-[0.2em]">Settled Amount</p>
                          <p className="text-4xl font-black tracking-tighter text-slate-800 italic font-sans">₱{order.total.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-6">
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                className="px-6 py-3 bg-primary text-white text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-primary/20 tracking-widest hover:scale-105 active:scale-95"
                              >
                                Accept
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'shipped')}
                                className="px-6 py-3 bg-primary text-white text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-primary/20 tracking-widest hover:scale-105 active:scale-95"
                              >
                                Ship Order
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="px-6 py-3 bg-secondary text-white text-[9px] font-bold uppercase rounded-xl transition-all shadow-lg shadow-secondary/20 tracking-widest hover:scale-105 active:scale-95"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                   ))}
                 </div>
                 
                 {totalPages > 1 && (
                   <div className="flex items-center justify-center gap-8 mt-16 border-t border-slate-200 pt-10">
                     <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-4 bg-white hover:bg-slate-50 disabled:opacity-30 border border-slate-200 rounded-2xl transition-all shadow-sm"
                     >
                       <ArrowLeft className="w-5 h-5 text-slate-400" />
                     </button>
                     <div className="flex items-center gap-3">
                       {[...Array(totalPages)].map((_, i) => (
                         <button 
                           key={i}
                           onClick={() => setCurrentPage(i + 1)}
                           className={`w-12 h-12 rounded-2xl font-bold text-xs transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                         >
                           {i + 1}
                         </button>
                       ))}
                     </div>
                     <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="p-4 bg-white hover:bg-slate-50 disabled:opacity-30 border border-slate-200 rounded-2xl transition-all shadow-sm"
                     >
                       <ChevronRight className="w-5 h-5 text-slate-400" />
                     </button>
                   </div>
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


const ProductFormModal: React.FC<{ initialData: Product | null; onClose: () => void }> = ({ initialData, onClose }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    category: initialData?.category || 'Vegetables',
    unit: initialData?.unit || 'kg',
    stock: initialData?.stock || 0,
    harvestDate: initialData?.harvestDate ? initialData.harvestDate.slice(0, 16) : new Date().toISOString().slice(0, 16),
    images: initialData?.images || []
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMultipleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setFormData(prev => ({ ...prev, images: [...prev.images, base64String] }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const getSmartPriceSuggestion = async () => {
    if (!formData.name) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/gemini/price-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category
        })
      });
      const data = await response.json();
      
      if (data.success && data.text) {
        const result = JSON.parse(data.text);
        if (result.recommendedPrice) {
          setFormData(prev => ({ ...prev, price: result.recommendedPrice }));
        }
      } else {
        console.error("AI Price suggestion API error:", data.error);
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
          harvestDate: new Date(formData.harvestDate).toISOString(),
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
          harvestDate: new Date(formData.harvestDate).toISOString(),
          id: productRef.id,
          farmerId: auth.currentUser?.uid,
          rating: 0,
          reviewCount: 0,
          coordinates: profile?.coordinates || null,
          isPublished: (profile?.status as string) !== 'banned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
                  <option>Root Crops</option>
                  <option>Herbs & Spices</option>
                  <option>Grains</option>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Harvest Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={formData.harvestDate} 
                  onChange={e => setFormData({...formData, harvestDate: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" 
                  required
                />
                <p className="mt-2 text-[10px] text-slate-400 italic px-1">Transparency is key. Let buyers know exactly when this was harvested.</p>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Product Images</label>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div 
                    className={`flex flex-col gap-2 p-8 bg-slate-50 border-2 border-dashed rounded-3xl transition-all group relative ${
                      isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-200 hover:border-primary/40'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        handleMultipleFiles(files);
                      }
                    }}
                  >
                    <input 
                      type="file" 
                      multiple
                      accept="image/*" 
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleFiles(files);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                      <div className={`p-4 rounded-full shadow-lg transition-all ${isDragging ? 'bg-primary text-white scale-110' : 'bg-white text-slate-400 group-hover:text-primary group-hover:scale-110'}`}>
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">
                          {isDragging ? 'Drop images now!' : 'Click or Drag to Upload'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          High-quality photos found to increase sales by 40%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-100 flex-grow"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Optional URL</span>
                    <div className="h-px bg-slate-100 flex-grow"></div>
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="url" 
                      value={imageInput} 
                      onChange={e => setImageInput(e.target.value)}
                      placeholder="https://image-url.com/photo.jpg"
                      className="flex-grow px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                    <button 
                      type="button"
                      onClick={addImage}
                      className="px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {formData.images.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uploaded <span className="text-slate-800">{formData.images.length}</span> Assets</p>
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, images: []})}
                        className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto p-2 no-scrollbar pb-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                      {formData.images.map((url, idx) => (
                        <div key={idx} className="relative flex-shrink-0 group">
                          <img 
                            src={url} 
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl transition-all group-hover:ring-4 group-hover:ring-primary/20 group-hover:scale-105" 
                            alt={`Preview ${idx + 1}`}
                          />
                          <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="bg-white/20 backdrop-blur-md text-white p-2 rounded-xl hover:bg-rose-500 transition-colors shadow-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {idx === 0 && (
                            <span className="absolute bottom-2 left-2 bg-primary text-white text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md shadow-lg border border-white/20">Main Photo</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-bold font-sans text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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
