import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, setDoc, deleteDoc, getDoc, where, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order, UserProfile, SystemConfig, AuditLog } from '../types';
import { 
  Users, ShoppingBag, TrendingUp, CheckCircle, XCircle, Shield, 
  AlertCircle, Search, BarChart3, Settings, Flag, MessageSquare,
  Lock, Unlock, Star, Ban, RefreshCw, Send, Radio, History,
  Trash2, ExternalLink, Tag, Plus, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'marketplace' | 'logistics' | 'analytics' | 'system'>('users');
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<string[]>(['Vegetables', 'Fruits', 'Root Crops', 'Herbs & Spices', 'Grains']);
  const [newCategory, setNewCategory] = useState('');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaHit, setQuotaHit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'farmer' | 'buyer' | 'admin'>('all');
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'emergency'>('info');

  useEffect(() => {
    // Only fetch data once to save quota, instead of constant listeners
    const fetchData = async () => {
      try {
        setLoading(true);

        // Try load system config from cache first for immediate UI
        const cachedConfig = localStorage.getItem('system_config');
        if (cachedConfig) setConfig(JSON.parse(cachedConfig));

        // Load other lists from cache if available
        const cachedUsers = localStorage.getItem('admin_users');
        if (cachedUsers) setUsers(JSON.parse(cachedUsers));
        const cachedProducts = localStorage.getItem('admin_products');
        if (cachedProducts) setProducts(JSON.parse(cachedProducts));
        const cachedOrders = localStorage.getItem('admin_orders');
        if (cachedOrders) setOrders(JSON.parse(cachedOrders));

        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const usersData = usersSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setUsers(usersData);
        localStorage.setItem('admin_users', JSON.stringify(usersData.slice(0, 50)));

        const productsSnap = await getDocs(query(collection(db, 'products'), limit(50)));
        const productsData = productsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(productsData);
        localStorage.setItem('admin_products', JSON.stringify(productsData.slice(0, 50)));

        const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(50)));
        const ordersData = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        setOrders(ordersData);
        localStorage.setItem('admin_orders', JSON.stringify(ordersData.slice(0, 50)));

        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) {
          const configData = configSnap.data() as SystemConfig;
          setConfig(configData);
          localStorage.setItem('system_config', JSON.stringify(configData));
        }

        const categoriesSnap = await getDoc(doc(db, 'system', 'categories'));
        if (categoriesSnap.exists()) setCategories(categoriesSnap.data().list || ['Vegetables', 'Fruits', 'Root Crops', 'Herbs & Spices', 'Grains']);

        const logsSnap = await getDocs(query(collection(db, 'audit_logs'), limit(20)));
        setAuditLogs(logsSnap.docs.map(doc => ({ ...doc.data() } as AuditLog)).sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
      } catch (error) {
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.LIST, 'admin_data');
        } else {
          setQuotaHit(true);
          console.warn("Admin dashboard: partially using cached/last-known data due to quota limits");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {};
  }, []);

  const logAction = async (action: string, details: string) => {
    try {
      const logId = doc(collection(db, 'audit_logs')).id;
      const newLog = {
        id: logId,
        adminId: auth.currentUser?.uid,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'audit_logs', logId), newLog);
      
      // Update local React state for audit logs
      setAuditLogs(prev => [newLog, ...prev].slice(0, 20));
    } catch (err) {
      console.warn('Logging action failed silently:', err);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const updated = [...categories, newCategory.trim()];
      await setDoc(doc(db, 'system', 'categories'), { 
        list: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update local state
      setCategories(updated);
      setNewCategory('');
      logAction('Category Add', `Added category ${newCategory.trim()}`);
    } catch (err) {
      console.error('Add category error:', err);
      alert('Failed to add category. Make sure you are an admin.');
    }
  };

  const removeCategory = async (cat: string) => {
    try {
      const updated = categories.filter(c => c !== cat);
      await setDoc(doc(db, 'system', 'categories'), { list: updated }, { merge: true });
      
      // Update local state
      setCategories(updated);
      logAction('Category Remove', `Removed category ${cat}`);
    } catch (err) {
      console.error('Remove category error:', err);
      alert('Failed to remove category. Please check your permissions.');
    }
  };

  const totalRevenue = orders.reduce((sum, order) => order.status === 'delivered' ? sum + order.total : sum, 0);
  const platformFees = orders.reduce((sum, order) => order.status === 'delivered' ? sum + (order.platformFee || 0) : sum, 0);
  const pendingFarmers = users.filter(f => f.role === 'farmer' && f.status === 'pending');
  const flaggedProducts = products.filter(p => p.approvalStatus === 'flagged');

  // User Management
  const updateUserAttribute = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state and cache
      const updatedUsers = users.map(u => u.uid === userId ? { ...u, ...updates } : u);
      setUsers(updatedUsers);
      localStorage.setItem('admin_users', JSON.stringify(updatedUsers.slice(0, 50)));

      // If user is banned, unpublish all their products
      if (updates.status === 'banned') {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('farmerId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const unpublishPromises = querySnapshot.docs.map(productDoc => 
          updateDoc(doc(db, 'products', productDoc.id), { 
            isPublished: false,
            updatedAt: new Date().toISOString()
          })
        );
        
        await Promise.all(unpublishPromises);

        // Update local products state and cache
        const updatedProducts = products.map(p => p.farmerId === userId ? { ...p, isPublished: false } : p);
        setProducts(updatedProducts);
        localStorage.setItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

        logAction('User Update', `Banned user ${userId} and unpublished ${unpublishPromises.length} products`);
      } else {
        logAction('User Update', `Updated user ${userId} with ${JSON.stringify(updates)}`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  // Product Management
  const updateProductStatus = async (productId: string, updates: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', productId), { 
        ...updates,
        updatedAt: new Date().toISOString()
      });

      // Update local state and cache
      const updatedProducts = products.map(p => p.id === productId ? { ...p, ...updates } : p);
      setProducts(updatedProducts);
      localStorage.setItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

      logAction('Product Update', `Updated product ${productId} with ${JSON.stringify(updates)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this product from the marketplace?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));

      // Update local state and cache
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      localStorage.setItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

      logAction('Product Delete', `Deleted product ${productId}`);
      alert('Product successfully removed from the marketplace.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
      alert('Failed to delete product. Please check your permissions.');
    }
  };

  // System Config
  const updateSystemConfig = async (updates: Partial<SystemConfig>) => {
    try {
      const newConfig = {
        ...config,
        ...updates,
        lastUpdated: new Date().toISOString()
      } as SystemConfig;

      await setDoc(doc(db, 'system', 'config'), newConfig, { merge: true });

      // Update local state and cache
      setConfig(newConfig);
      localStorage.setItem('system_config', JSON.stringify(newConfig));

      logAction('System Update', `Updated system config`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system/config');
    }
  };

  // Order Logistics Actions
  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: new Date().toISOString()
      });

      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status } : o);
      setOrders(updatedOrders as Order[]);
      localStorage.setItem('admin_orders', JSON.stringify(updatedOrders.slice(0, 50)));

      logAction('Order Update', `Updated order ${orderId} status to ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
      alert('Failed to update order status. Please check your permissions.');
    }
  };

  const resolveOrderDispute = async (orderId: string, disputeStatus: 'none' | 'opened' | 'resolved' | 'refunded', updates: Partial<Order> = {}) => {
    try {
      const finalUpdates = {
        disputeStatus,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'orders', orderId), finalUpdates);

      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, ...finalUpdates } : o);
      setOrders(updatedOrders as Order[]);
      localStorage.setItem('admin_orders', JSON.stringify(updatedOrders.slice(0, 50)));

      logAction('Order Dispute Update', `Updated dispute for ${orderId} to ${disputeStatus}`);
      alert(`Order dispute successfully marked as ${disputeStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
      alert('Failed to update dispute status. Please check your permissions.');
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastDraft) return;
    await updateSystemConfig({
      broadcastMessage: broadcastDraft,
      broadcastType
    });
    setBroadcastDraft('');
  };

  const salesData = orders.map(o => ({
    date: new Date(o.createdAt).toLocaleDateString(),
    amount: o.total
  })).reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.date === curr.date);
    if (existing) {
      existing.amount += curr.amount;
    } else {
      acc.push(curr);
    }
    return acc;
  }, []).slice(-7);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-lg shadow-primary/20"
        />
        <div className="text-center">
          <p className="text-xl font-bold text-slate-800 font-serif italic mb-1 tracking-tight">Initializing Command Center</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregating Global Ecosystem Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Quota Warning */}
      {quotaHit && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-between gap-4 shadow-lg shadow-amber-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Protocol Restriction: Quota Limit Detected</p>
              <p className="text-[10px] text-amber-600/80 font-bold uppercase tracking-widest">Displaying cached offline data. New updates may be delayed.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-amber-200 text-amber-800 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-amber-300 transition-all"
          >
            Retry Sync
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-2 h-10 bg-secondary rounded-full" />
            <h1 className="text-5xl font-bold text-slate-800 tracking-tighter font-sans uppercase">
              Control <span className="italic text-secondary font-serif">Center</span>
            </h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Command & Control Hub for the FarmToHome Ecosystem</p>
        </div>
        
        <div className="flex items-center gap-4">
          {config?.maintenanceMode && (
            <div className="flex items-center gap-2 px-6 py-3 bg-red-400 text-white rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse shadow-xl shadow-red-400/20 cursor-default">
              <Lock className="w-3 h-3" />
              Maintenance Active
            </div>
          )}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
            <Shield className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Security Status</p>
              <p className="text-sm font-bold text-slate-800 uppercase leading-none">Global Tier 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mb-16 overflow-x-auto no-scrollbar pb-2">
        {(['users', 'marketplace', 'logistics', 'analytics', 'system'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-10 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap hover:scale-105 active:scale-95 ${
              activeTab === tab 
                ? 'bg-primary text-white shadow-2xl shadow-primary/30' 
                : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            {tab === 'users' && <Users className="w-4 h-4" />}
            {tab === 'marketplace' && <ShoppingBag className="w-4 h-4" />}
            {tab === 'logistics' && <TrendingUp className="w-4 h-4" />}
            {tab === 'analytics' && <BarChart3 className="w-4 h-4" />}
            {tab === 'system' && <Settings className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* User Management Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <Users className="w-8 h-8 text-primary mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{users.length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Active Citizens</p>
              </div>
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <Shield className="w-8 h-8 text-secondary mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{pendingFarmers.length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Farmer Regists</p>
              </div>
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <Ban className="w-8 h-8 text-red-400 mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{users.filter(u => u.status === 'banned').length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Global Bans</p>
              </div>
            </div>

            <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">Global Directory</h3>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold w-64 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Identity</th>
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Protocol</th>
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Status</th>
                      <th className="px-10 py-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="group hover:bg-slate-50/30 transition-all">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl font-bold font-serif italic shadow-inner overflow-hidden border border-slate-100">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt={u.fullName} className="w-full h-full object-contain bg-slate-50" />
                              ) : (
                                u.fullName.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-lg group-hover:text-primary transition-colors">{u.fullName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <select 
                            value={u.role}
                            onChange={(e) => updateUserAttribute(u.uid, { role: e.target.value as any })}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none"
                          >
                            <option value="buyer">Buyer</option>
                            <option value="farmer">Farmer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-10 py-8">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.3em] ${
                            u.status === 'verified' ? 'bg-emerald-50 text-emerald-500' : 
                            u.status === 'banned' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-right space-x-3">
                          <button 
                            onClick={() => updateUserAttribute(u.uid, { status: u.status === 'verified' ? 'pending' : 'verified' })} 
                            className="p-4 bg-slate-50 rounded-2xl hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                            title={u.status === 'verified' ? 'Suspend' : 'Verify'}
                          >
                            {u.status === 'verified' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => updateUserAttribute(u.uid, { status: u.status === 'banned' ? 'verified' : 'banned' })} 
                            className="p-4 bg-slate-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                            title={u.status === 'banned' ? 'Unban' : 'Ban User'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <ShoppingBag className="w-8 h-8 text-primary mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{products.length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Active Harvests</p>
              </div>
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <Flag className="w-8 h-8 text-red-400 mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{flaggedProducts.length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Flagged Items</p>
              </div>
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <Star className="w-8 h-8 text-amber-400 mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{products.filter(p => p.isFeatured).length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Spotlight Items</p>
              </div>
              <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-xl clay-shadow">
                <RefreshCw className="w-8 h-8 text-secondary mb-6" />
                <h4 className="text-3xl font-bold text-slate-800 font-sans tracking-tight">{products.filter(p => !p.approvalStatus || p.approvalStatus === 'pending').length}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Pending Vetting</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mb-10">Harvest Moderation</h3>
                <div className="space-y-6">
                  {products.map(p => (
                    <div key={p.id} className={`p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all ${p.approvalStatus === 'flagged' ? 'bg-red-50/50' : 'bg-slate-50/30'}`}>
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farmer: {users.find(u => u.uid === p.farmerId)?.fullName}</p>
                          <div className="flex gap-2 mt-2">
                            {p.isFeatured && <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-[8px] font-black uppercase">Spotlight</span>}
                            {p.approvalStatus === 'approved' && <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase">Vetted</span>}
                            {p.approvalStatus === 'flagged' && <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase">Flagged</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {p.approvalStatus !== 'approved' && (
                          <button onClick={() => updateProductStatus(p.id, { approvalStatus: 'approved' })} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110 active:scale-90" title="Approve">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => updateProductStatus(p.id, { isFeatured: !p.isFeatured })} className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-90 ${p.isFeatured ? 'bg-amber-400 text-white shadow-lg' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`} title="Toggle Spotlight">
                          <Star className="w-5 h-5" />
                        </button>
                        {p.approvalStatus !== 'flagged' && (
                          <button onClick={() => updateProductStatus(p.id, { approvalStatus: 'flagged' })} className="p-3 text-amber-500 hover:bg-amber-50 rounded-xl transition-all hover:scale-110 active:scale-90" title="Flag Content">
                            <Flag className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => deleteProduct(p.id)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-90" title="Delete Product">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl">
                <div className="flex flex-col gap-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mb-2">Ecosystem Taxonomy</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Global Harvest Categories</p>
                  </div>

                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="New category label..." 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <button 
                      onClick={addCategory}
                      className="px-8 py-5 bg-primary text-white rounded-3xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    >
                      Add Category
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {categories.map(cat => (
                      <div key={cat} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-primary/20 hover:bg-white hover:shadow-lg transition-all">
                        <span className="text-xs font-bold text-slate-600">{cat}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => removeCategory(cat)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all hover:scale-125 active:scale-90"
                            title="Remove Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Logistics Tab */}
        {activeTab === 'logistics' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-10 bg-primary rounded-[3.5rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                <TrendingUp className="w-10 h-10 text-accent-light mb-8" />
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60 mb-2">Platform Revenue</p>
                <h4 className="text-5xl font-bold font-sans tracking-tighter mb-4 text-accent-light">₱{totalRevenue.toLocaleString()}</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" /> Projected: ₱{(totalRevenue * 1.2).toLocaleString()}
                </p>
              </div>
              <div className="p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-xl clay-shadow">
                <ShoppingBag className="w-10 h-10 text-secondary mb-8" />
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Direct Platform Fees</p>
                <h4 className="text-5xl font-bold font-sans tracking-tighter mb-4 text-slate-800">₱{platformFees.toLocaleString()}</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Harvested Commissions</p>
              </div>
              <div className="p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-xl clay-shadow">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-8" />
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2">Disputed Orders</p>
                <h4 className="text-5xl font-bold font-sans tracking-tighter mb-4 text-slate-800">{orders.filter(o => o.disputeStatus === 'opened').length}</h4>
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">Awaiting Mediation</p>
              </div>
            </div>

            <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-slate-50">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">Global Trade Ledger</h3>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Transaction</th>
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Economic Flux</th>
                      <th className="px-10 py-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Protocol State</th>
                      <th className="px-10 py-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Dispute Ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map(o => (
                      <tr key={o.id} className="group hover:bg-slate-50/30 transition-all">
                        <td className="px-10 py-8">
                          <p className="font-mono text-xs text-slate-400">#{o.id?.slice(0, 12)}</p>
                          <p className="text-xs font-bold text-slate-800 tracking-tight mt-1">Buyer: {users.find(u => u.uid === o.buyerId)?.fullName}</p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <p className="text-xl font-bold text-primary font-sans">₱{o.total.toLocaleString()}</p>
                        </td>
                        <td className="px-10 py-8">
                          <select 
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as Order['status'])}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none hover:text-primary transition-all cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-10 py-8 text-right space-x-2">
                          {o.disputeStatus === 'opened' && (
                            <div className="flex gap-2">
                              <button onClick={() => resolveOrderDispute(o.id, 'resolved')} className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:scale-110 active:scale-90 transition-all shadow-lg shadow-emerald-500/20">Resolve</button>
                              <button onClick={() => resolveOrderDispute(o.id, 'refunded', { status: 'cancelled' })} className="px-6 py-3 bg-red-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:scale-110 active:scale-90 transition-all shadow-lg shadow-red-500/20">Refund</button>
                            </div>
                          )}
                          {(!o.disputeStatus || o.disputeStatus === 'none') && (
                            <p className="text-[10px] font-bold text-slate-300 uppercase italic">Trade Stable</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="p-12 bg-white rounded-[4rem] border border-slate-100 shadow-xl clay-shadow">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mb-10">Sales Flux (7D)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#416D19" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#416D19" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        itemStyle={{ color: '#416D19', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#416D19" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-12 bg-white rounded-[4rem] border border-slate-100 shadow-xl clay-shadow">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mb-10">Harvest Distribution</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(products.reduce((acc: any, p) => {
                      acc[p.category] = (acc[p.category] || 0) + 1;
                      return acc;
                    }, {})).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="#9BCF53" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              {/* Internal Broadcast */}
              <div className="p-12 bg-white rounded-[4rem] border border-slate-100 shadow-xl clay-shadow">
                <div className="flex items-center gap-4 mb-10">
                  <Radio className="w-8 h-8 text-secondary" />
                  <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">Global Broadcast</h3>
                </div>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Transmission Payload</p>
                    <textarea 
                      value={broadcastDraft} onChange={e => setBroadcastDraft(e.target.value)}
                      placeholder="Enter emergency broadcast message..."
                      className="w-full p-8 bg-slate-50 rounded-[2.5rem] text-sm font-medium h-40 focus:outline-none focus:ring-4 ring-secondary/5 transition-all outline-none"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-grow">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Signal Priority</p>
                      <div className="flex gap-4">
                        {(['info', 'warning', 'emergency'] as const).map(t => (
                          <button key={t} onClick={() => setBroadcastType(t)} className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${broadcastType === t ? 'bg-secondary text-white' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={sendBroadcast} 
                      className="px-12 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 self-end hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                      <Send className="w-4 h-4" /> Transmit Signal
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Audit */}
              <div className="p-12 bg-primary rounded-[4rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                    <History className="w-8 h-8 text-accent-light" />
                    <h3 className="text-2xl font-bold font-sans tracking-tight">Security Audit Log</h3>
                  </div>
                  <div className="space-y-6">
                    {auditLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="p-6 border-b border-white/5 last:border-0 group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-bold tracking-tight text-white/90">{log.action}</p>
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">#{log.id.slice(0, 8)}</p>
                        </div>
                        <p className="text-xs text-white/50 mb-3">{log.details}</p>
                        <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              {/* Site Maintenance */}
              <div className="p-12 bg-white rounded-[4rem] border border-slate-100 shadow-xl clay-shadow">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mb-8">Ecosystem State</h3>
                <div className="space-y-10">
                  <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem]">
                    <div>
                      <p className="text-base font-bold text-slate-800 font-sans tracking-tight">Maintenance Mode</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Lockdown</p>
                    </div>
                    <button 
                      onClick={() => updateSystemConfig({ maintenanceMode: !config?.maintenanceMode })} 
                      className={`w-16 h-8 rounded-full p-1 transition-all hover:scale-110 active:scale-95 ${config?.maintenanceMode ? 'bg-red-400' : 'bg-slate-200'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full transition-transform ${config?.maintenanceMode ? 'translate-x-8' : ''}`} />
                    </button>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Protocol</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Platform Commission</span>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          value={config?.platformCommissionRate || 0} 
                          onChange={(e) => updateSystemConfig({ platformCommissionRate: Number(e.target.value) })}
                          className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-primary focus:outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-slate-100 text-slate-400 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-50 hover:text-red-400 hover:scale-105 active:scale-95 transition-all">
                    <Trash2 className="w-4 h-4" /> Purge Cache
                  </button>
                </div>
              </div>

              {/* Featured Harvests Quicklinks */}
              <div className="p-12 bg-secondary rounded-[4rem] text-white shadow-2xl shadow-secondary/20 group">
                <div className="flex items-center gap-4 mb-10">
                  <Star className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
                  <h3 className="text-2xl font-bold font-sans tracking-tight">Spotlight Feed</h3>
                </div>
                <div className="space-y-6">
                  {products.filter(p => p.isFeatured).map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-4 border border-white/10 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner shrink-0">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-bold truncate tracking-tight">{p.name}</p>
                      <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </div>
                  ))}
                  {products.filter(p => p.isFeatured).length === 0 && (
                    <p className="text-[10px] font-bold text-white/30 uppercase text-center py-10 italic">No harvests in spotlight</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
