import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, setDoc, deleteDoc, getDoc, where, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaError, isOfflineError, safeSetItem } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Product, Order, UserProfile, SystemConfig, AuditLog } from '../types';
import { 
  Users, ShoppingBag, TrendingUp, CheckCircle, XCircle, Shield, 
  AlertCircle, Search, BarChart3, Settings, Flag, MessageSquare,
  Lock, Unlock, Star, Ban, RefreshCw, Send, Radio, History,
  Trash2, ExternalLink, Tag, Plus, AlertTriangle, X, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface AdminDashboardProps {
  activeTabProp?: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system';
  onTabChange?: (tab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTabProp, onTabChange }) => {
  const { user, profile, openAuth } = useAuth();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'users' | 'marketplace' | 'logistics' | 'analytics' | 'system'>(activeTabProp || 'users');

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  const handleTabChange = (tab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  
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
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'pending-farmers' | 'verified-farmers' | 'buyers'>('all');
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'emergency'>('info');

  useEffect(() => {
    // Only fetch data once to save quota, instead of constant listeners
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      const isDemo = user.uid?.startsWith('demo_');
      
      try {
        setLoading(true);

        // Force-refresh or resolve Firebase Auth ID token if real user is active
        if (auth.currentUser) {
          try {
            await auth.currentUser.getIdToken(true);
          } catch (tokenErr) {
            console.warn("Retrying token synchronization...", tokenErr);
          }
        }

        // Try load system config from cache first for immediate UI
        const cachedConfig = localStorage.getItem('system_config');
        if (cachedConfig) {
          setConfig(JSON.parse(cachedConfig));
        } else {
          // Default fallbacks for system configuration
          setConfig({
            maintenanceMode: false,
            broadcastMessage: '',
            broadcastType: 'info',
            platformCommissionRate: 5,
            lastUpdated: new Date().toISOString()
          });
        }

        // Load other lists from cache if available
        const cachedUsers = localStorage.getItem('admin_users');
        if (cachedUsers) setUsers(JSON.parse(cachedUsers));
        const cachedProducts = localStorage.getItem('admin_products');
        if (cachedProducts) setProducts(JSON.parse(cachedProducts));
        const cachedOrders = localStorage.getItem('admin_orders');
        if (cachedOrders) setOrders(JSON.parse(cachedOrders));
        const cachedAuditLogs = localStorage.getItem('admin_audit_logs');
        if (cachedAuditLogs) setAuditLogs(JSON.parse(cachedAuditLogs));

        // If it's a demo admin, we can also seed mock lists if they are empty to ensure a full experience
        if (isDemo) {
          if (!cachedUsers) {
            const seedUsers: UserProfile[] = [
              { uid: 'demo_farmer_juan', email: 'juan@cagayan.farm', fullName: 'Mang Juan', phone: '09170001122', role: 'farmer', status: 'verified', createdAt: new Date().toISOString() },
              { uid: 'demo_farmer_pedro', email: 'pedro@benguet.farm', fullName: 'Mang Pedro', phone: '09178889900', role: 'farmer', status: 'pending', createdAt: new Date().toISOString() },
              { uid: 'demo_buyer_patricia', email: 'patricia@gmail.com', fullName: 'Patricia Salvador', phone: '09187654321', role: 'buyer', status: 'verified', createdAt: new Date().toISOString() },
              { uid: 'demo_buyer_john', email: 'john@santos.ph', fullName: 'John Santos', phone: '09192223344', role: 'buyer', status: 'verified', createdAt: new Date().toISOString() }
            ];
            setUsers(seedUsers);
            safeSetItem('admin_users', JSON.stringify(seedUsers));
          }
          if (!cachedProducts) {
            const seedProducts: Product[] = [
              { id: 'p_guimaras_mangoes', name: 'Guimaras Sweet Mangoes (Export Grade)', category: 'Fruits', price: 180, unit: 'kg', stock: 120, description: 'Famous sweet Guimaras mangoes, freshly harvested, organic, and pesticide-free.', images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400'], rating: 4.9, reviewCount: 24, farmerId: 'demo_farmer_juan', isPublished: true, harvestDate: new Date().toISOString(), createdAt: new Date().toISOString() },
              { id: 'p_calamansi', name: 'Fresh Native Calamansi', category: 'Fruits', price: 80, unit: 'kg', stock: 350, description: 'Zesty native calamansi, rich in Vitamin C, harvested daily.', images: ['https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400'], rating: 4.8, reviewCount: 15, farmerId: 'demo_farmer_juan', isPublished: true, harvestDate: new Date().toISOString(), createdAt: new Date().toISOString() }
            ];
            setProducts(seedProducts);
            safeSetItem('admin_products', JSON.stringify(seedProducts));
          }
          if (!cachedOrders) {
            const seedOrders: Order[] = [
              { id: 'order_demo_101', buyerId: 'demo_buyer_patricia', buyerName: 'Patricia Salvador', buyerPhone: '09187654321', buyerAddress: 'Unit 401, Serendra Condominium, BGC, Taguig City, Metro Manila', deliveryAddress: 'Unit 401, Serendra Condominium, BGC, Taguig City, Metro Manila', contactNumber: '09187654321', farmerId: 'demo_farmer_juan', items: [{ productId: 'p_guimaras_mangoes', name: 'Guimaras Sweet Mangoes (Export Grade)', price: 180, quantity: 3, image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400' }], total: 590, paymentMethod: 'cash_on_delivery', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            ];
            setOrders(seedOrders);
            safeSetItem('admin_orders', JSON.stringify(seedOrders));
          }
          if (!cachedAuditLogs) {
            const seedLogs: AuditLog[] = [
              { id: 'log_001', action: 'System Initialization', details: 'FarmToHome administrative console prepared.', timestamp: new Date().toISOString(), adminId: user.uid }
            ];
            setAuditLogs(seedLogs);
            safeSetItem('admin_audit_logs', JSON.stringify(seedLogs));
          }
        }

        // Fetch actual data from Firestore database
        if (!isDemo) {
          const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
          const usersData = usersSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
          setUsers(usersData);
          safeSetItem('admin_users', JSON.stringify(usersData.slice(0, 50)));

          const productsSnap = await getDocs(query(collection(db, 'products'), limit(50)));
          const productsData = productsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
          setProducts(productsData);
          safeSetItem('admin_products', JSON.stringify(productsData.slice(0, 50)));

          const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(50)));
          const ordersData = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
          setOrders(ordersData);
          safeSetItem('admin_orders', JSON.stringify(ordersData.slice(0, 50)));

          const configSnap = await getDoc(doc(db, 'system', 'config'));
          if (configSnap.exists()) {
            const configData = configSnap.data() as SystemConfig;
            setConfig(configData);
            safeSetItem('system_config', JSON.stringify(configData));
          }

          const categoriesSnap = await getDoc(doc(db, 'system', 'categories'));
          if (categoriesSnap.exists()) setCategories(categoriesSnap.data().list || ['Vegetables', 'Fruits', 'Root Crops', 'Herbs & Spices', 'Grains']);

          const logsSnap = await getDocs(query(collection(db, 'audit_logs'), limit(20)));
          const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
          setAuditLogs(logsData);
          safeSetItem('admin_audit_logs', JSON.stringify(logsData));
        } else {
          // In demo mode, we can still try to read from public system/config if we can
          try {
            const configSnap = await getDoc(doc(db, 'system', 'config'));
            if (configSnap.exists()) {
              const configData = configSnap.data() as SystemConfig;
              setConfig(configData);
              safeSetItem('system_config', JSON.stringify(configData));
            }
          } catch (configErr) {
            console.warn("Could not read remote config in demo mode, staying with cached configuration:", configErr);
          }
        }
      } catch (error) {
        if (!isDemo) {
          if (!isQuotaError(error) && !isOfflineError(error)) {
            handleFirestoreError(error, OperationType.LIST, 'admin_data');
          } else {
            setQuotaHit(true);
            console.warn("Admin dashboard: partially using cached/last-known data due to quota limits or offline state");
          }
        } else {
          console.warn("Using simulated data for demo user account. DB reads bypassed.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {};
  }, [user]);

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
      safeSetItem('admin_users', JSON.stringify(updatedUsers.slice(0, 50)));

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
        safeSetItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

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
      safeSetItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

      logAction('Product Update', `Updated product ${productId} with ${JSON.stringify(updates)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    const confirmed = await confirm({
      title: 'Permanently delete this product???',
      message: 'Are you sure you want to permanently delete this product from the marketplace? This action cannot be undone and will immediately drop this crop from the client store fronts.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'products', productId));

      // Update local state and cache
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      safeSetItem('admin_products', JSON.stringify(updatedProducts.slice(0, 50)));

      logAction('Product Delete', `Deleted product ${productId}`);
      alert('Product successfully removed from the marketplace.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
      alert('Failed to delete product. Please check your permissions.');
    }
  };

  // System Config
  const updateSystemConfig = async (updates: Partial<SystemConfig>) => {
    const isDemo = user?.uid?.startsWith('demo_');
    try {
      const newConfig = {
        ...config,
        ...updates,
        lastUpdated: new Date().toISOString()
      } as SystemConfig;

      // Update local state and cache immediately for instantaneous UI responsiveness
      setConfig(newConfig);
      safeSetItem('system_config', JSON.stringify(newConfig));
      window.dispatchEvent(new Event('system-config-update'));

      if (!isDemo) {
        await setDoc(doc(db, 'system', 'config'), newConfig, { merge: true });
        logAction('System Update', `Updated system config`);
      } else {
        try {
          await setDoc(doc(db, 'system', 'config'), newConfig, { merge: true });
          logAction('System Update', `Updated system config`);
        } catch (dbErr) {
          console.warn("Firestore save skipped/failed for demo admin:", dbErr);
          logAction('System Update (Simulated)', `Updated system config locally`);
        }
      }
    } catch (err) {
      if (!isDemo) {
        handleFirestoreError(err, OperationType.WRITE, 'system/config');
        alert('Failed to update system config in Firestore.');
      }
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
      safeSetItem('admin_orders', JSON.stringify(updatedOrders.slice(0, 50)));

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
      safeSetItem('admin_orders', JSON.stringify(updatedOrders.slice(0, 50)));

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
    const matchesTab = 
      userFilterTab === 'all' ? true :
      userFilterTab === 'pending-farmers' ? (u.role === 'farmer' && (u.status === 'pending' || !u.status)) :
      userFilterTab === 'verified-farmers' ? (u.role === 'farmer' && u.status === 'verified') :
      userFilterTab === 'buyers' ? (u.role === 'buyer') : true;

    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesTab && matchesRole;
  });

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-sm mx-auto p-8">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10 border-2 border-rose-100 mb-2">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-serif italic text-slate-800 tracking-tight mb-2">Authentication Required</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
            You must be signed in with a verified Administrator account to access this section.
          </p>
        </div>
        <button 
          onClick={() => openAuth('login', 'admin')}
          className="px-12 py-5 bg-slate-800 text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10"
        >
          Authenticate Admin
        </button>
      </div>
    );
  }

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

  const getTabHeaderDetails = () => {
    switch (activeTab) {
      case 'users':
        return {
          title: "User",
          italicTitle: "Directory",
          subtitle: "Manage platform memberships, verify farmer registrations, and configure accounts",
          color: "bg-secondary"
        };
      case 'marketplace':
        return {
          title: "Product",
          italicTitle: "Approvals",
          subtitle: "Review merchant submissions, approve listings, and audit active stock descriptions",
          color: "bg-emerald-600"
        };
      case 'logistics':
        return {
          title: "Logistics",
          italicTitle: "Tracker",
          subtitle: "Monitor global order deliveries, routing status, and logistics milestones",
          color: "bg-amber-500"
        };
      case 'analytics':
        return {
          title: "System",
          italicTitle: "Analytics",
          subtitle: "Analyze system transaction volume, citizen growth, and market indicators",
          color: "bg-primary"
        };
      case 'system':
        return {
          title: "Platform",
          italicTitle: "Setup",
          subtitle: "Configure global system preferences, active maintenance flags, and configurations",
          color: "bg-slate-700"
        };
      default:
        return {
          title: "Control",
          italicTitle: "Center",
          subtitle: "Command & Control Hub for the FarmToHome Ecosystem",
          color: "bg-secondary"
        };
    }
  };

  const headerDetails = getTabHeaderDetails();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
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

      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10 mb-8 sm:mb-12 px-0">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-2 h-10 ${headerDetails.color} rounded-full transition-colors duration-300`} />
            <h1 className="text-3xl sm:text-5xl font-bold text-slate-800 tracking-tighter font-sans uppercase">
              {headerDetails.title} <span className={`italic font-serif normal-case ${headerDetails.color.replace('bg-', 'text-')}`}>{headerDetails.italicTitle}</span>
            </h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">{headerDetails.subtitle}</p>
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

      {/* Mobile sub-tabs selector for easy navigation across controls */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar scroll-smooth">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'marketplace', label: 'Products', icon: ShoppingBag },
          { id: 'logistics', label: 'Logistics', icon: Package },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'system', label: 'Platform', icon: Settings }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all border shadow-xs cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 scale-102 font-extrabold'
                  : 'bg-white text-slate-500 hover:text-slate-800 border-slate-150 hover:bg-slate-50'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-[#a3e635]' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* User Management Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-emerald-50 text-primary rounded-xl shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{users.length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Citizens</p>
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-amber-50/70 text-secondary rounded-xl shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{pendingFarmers.length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Farmer Regists</p>
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{users.filter(u => u.status === 'banned').length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Bans</p>
                </div>
              </div>
            </div>

            {/* Quick Filter Pill Row - No Horizontal Scroll, Wrap Elegantly */}
            <div className="flex flex-wrap gap-2 pb-2 pt-1">
              <button 
                onClick={() => setUserFilterTab('all')}
                className={`text-[10px] sm:text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  userFilterTab === 'all' 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                    : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-150'
                }`}
              >
                All Users <span className="text-[10px] opacity-65 font-mono">({users.length})</span>
              </button>
              <button 
                onClick={() => setUserFilterTab('pending-farmers')}
                className={`text-[10px] sm:text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  userFilterTab === 'pending-farmers' 
                    ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/10' 
                    : 'bg-white text-amber-600 hover:text-amber-800 hover:bg-amber-50/50 border border-amber-100'
                }`}
              >
                Pending Farmers <span className="text-[10px] opacity-80 font-mono">({users.filter(u => u.role === 'farmer' && (u.status === 'pending' || !u.status)).length})</span>
              </button>
              <button 
                onClick={() => setUserFilterTab('verified-farmers')}
                className={`text-[10px] sm:text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  userFilterTab === 'verified-farmers' 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/10' 
                    : 'bg-white text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/50 border border-emerald-100'
                }`}
              >
                Verified Farmers <span className="text-[10px] opacity-85 font-mono">({users.filter(u => u.role === 'farmer' && u.status === 'verified').length})</span>
              </button>
              <button 
                onClick={() => setUserFilterTab('buyers')}
                className={`text-[10px] sm:text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  userFilterTab === 'buyers' 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-650/10' 
                    : 'bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 border border-blue-100'
                }`}
              >
                Buyers <span className="text-[10px] opacity-85 font-mono">({users.filter(u => u.role === 'buyer').length})</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl sm:rounded-[2rem] border border-slate-100 overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
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
              <div className="hidden md:block overflow-x-auto no-scrollbar">
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
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-slate-800 text-base group-hover:text-primary transition-colors leading-tight">{u.fullName}</p>
                                {u.role === 'farmer' && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">Farmer</span>
                                )}
                                {u.role === 'buyer' && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">Buyer</span>
                                )}
                                {u.role === 'admin' && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">Admin</span>
                                )}
                              </div>
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
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.role === 'farmer' && (u.status === 'pending' || !u.status) && (
                              <button 
                                onClick={() => updateUserAttribute(u.uid, { status: 'verified' })}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all font-bold text-[9px] uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Verify Farmer
                              </button>
                            )}
                            <button 
                              onClick={() => updateUserAttribute(u.uid, { status: u.status === 'verified' ? 'pending' : 'verified' })} 
                              className={`px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center gap-1 cursor-pointer ${
                                u.status === 'verified' 
                                  ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800' 
                                  : 'bg-primary text-white border-primary/20 hover:bg-primary/95 shadow-md shadow-primary/10'
                              }`}
                            >
                              {u.status === 'verified' ? (
                                <><Lock className="w-3.5 h-3.5" /> Suspend</>
                              ) : (
                                <><Unlock className="w-3.5 h-3.5" /> Verify</>
                              )}
                            </button>
                            <button 
                              onClick={() => updateUserAttribute(u.uid, { status: u.status === 'banned' ? 'verified' : 'banned' })} 
                              className={`px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center gap-1 cursor-pointer ${
                                u.status === 'banned' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60' 
                                  : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/60'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" /> {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based Directory Layout */}
              <div className="block md:hidden divide-y divide-slate-100 p-4 sm:p-6 bg-white">
                {filteredUsers.map(u => (
                  <div key={u.uid} className="py-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-lg font-bold font-serif italic shadow-inner overflow-hidden border border-slate-100 flex-shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.fullName} className="w-full h-full object-contain bg-slate-50" />
                        ) : (
                          u.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-bold text-slate-800 text-base leading-tight">{u.fullName}</p>
                          {u.role === 'farmer' && (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-green-100 text-green-800 border border-green-200 uppercase tracking-wider">Farmer</span>
                          )}
                          {u.role === 'buyer' && (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">Buyer</span>
                          )}
                          {u.role === 'admin' && (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">Admin</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-1">
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Role / Protocol</p>
                        <select 
                          value={u.role}
                          onChange={(e) => updateUserAttribute(u.uid, { role: e.target.value as any })}
                          className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none w-full"
                        >
                          <option value="buyer">Buyer</option>
                          <option value="farmer">Farmer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Status</p>
                        <span className={`self-start px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-[0.2em] ${
                          u.status === 'verified' ? 'bg-emerald-50 text-emerald-500' : 
                          u.status === 'banned' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                        }`}>
                          {u.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {u.role === 'farmer' && (u.status === 'pending' || !u.status) && (
                        <button 
                          onClick={() => updateUserAttribute(u.uid, { status: 'verified' })} 
                          className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1 min-h-[48px] cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Verify Farmer
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateUserAttribute(u.uid, { status: u.status === 'verified' ? 'pending' : 'verified' })} 
                          className="flex-1 py-3 bg-slate-50 text-slate-605 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm border border-slate-100 hover:border-primary flex items-center justify-center gap-1 min-h-[48px] cursor-pointer"
                        >
                          {u.status === 'verified' ? (
                            <>
                              <Lock className="w-3.5 h-3.5" /> Suspend
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" /> Verify
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => updateUserAttribute(u.uid, { status: u.status === 'banned' ? 'verified' : 'banned' })} 
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border flex items-center justify-center gap-1 min-h-[48px] cursor-pointer ${u.status === 'banned' ? 'bg-emerald-50 text-emerald-600 border-emerald-110' : 'bg-red-50 text-red-650 border-red-110'}`}
                        >
                          <Ban className="w-3.5 h-3.5" /> {u.status === 'banned' ? 'Unban' : 'Ban User'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent System Activities Section */}
            <div className="bg-slate-900 text-white rounded-[3rem] p-6 sm:p-10 border border-slate-800 shadow-2xl overflow-hidden mt-8 relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-12 translate-x-12 animate-pulse" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold font-sans tracking-tight">Recent System Activities</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reliability & Security Audit Trail</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {auditLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/80 hover:bg-slate-800 transition-all flex flex-col justify-between gap-2 min-h-[110px]">
                      <div>
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-900/40">
                            {log.action}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500">
                            #{log.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-800/50">
                        {new Date(log.timestamp).toLocaleTimeString() || log.timestamp}
                      </p>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4 col-span-3">No recent activities logged in this cycle.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-emerald-50 text-secondary rounded-xl shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{products.length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Harvests</p>
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-rose-50 text-red-500 rounded-xl shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{flaggedProducts.length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Flagged Items</p>
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{products.filter(p => p.isFeatured).length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spotlight Items</p>
                </div>
              </div>
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-2.5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">{products.filter(p => !p.approvalStatus || p.approvalStatus === 'pending').length}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Vetting</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-6">Harvest Moderation</h3>
                <div className="space-y-4">
                  {products.map(p => (
                    <div key={p.id} className={`p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all ${p.approvalStatus === 'flagged' ? 'bg-red-50/50' : 'bg-slate-50/30'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner shrink-0">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{p.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Farmer: {users.find(u => u.uid === p.farmerId)?.fullName}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {p.isFeatured && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[7px] font-black uppercase">Spotlight</span>}
                            {p.approvalStatus === 'approved' && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[7px] font-black uppercase">Vetted</span>}
                            {p.approvalStatus === 'flagged' && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[7px] font-black uppercase">Flagged</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {p.approvalStatus !== 'approved' && (
                          <button onClick={() => updateProductStatus(p.id, { approvalStatus: 'approved' })} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => updateProductStatus(p.id, { isFeatured: !p.isFeatured })} className={`p-2 rounded-lg transition-all hover:scale-110 ${p.isFeatured ? 'bg-amber-400 text-white shadow-md' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`} title="Toggle Spotlight">
                          <Star className="w-4 h-4" />
                        </button>
                        {p.approvalStatus !== 'flagged' && (
                          <button onClick={() => updateProductStatus(p.id, { approvalStatus: 'flagged' })} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all hover:scale-110" title="Flag Content">
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all hover:scale-110" title="Delete Product">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xl">
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-1.5">Ecosystem Taxonomy</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Global Harvest Categories</p>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="New category label..." 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <button 
                      onClick={addCategory}
                      className="px-5 py-3 bg-primary text-white rounded-2xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-center"
                    >
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => (
                      <div key={cat} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-primary/20 hover:bg-white hover:shadow-md transition-all">
                        <span className="text-xs font-bold text-slate-600 truncate mr-2">{cat}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => removeCategory(cat)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-all hover:scale-125"
                            title="Remove Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 sm:p-8 bg-primary rounded-3xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
                <TrendingUp className="w-8 h-8 text-emerald-300 mb-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 mb-1">Platform Revenue</p>
                <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans tracking-tight mb-2">₱{totalRevenue.toLocaleString()}</h4>
                <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" /> Projected: ₱{(totalRevenue * 1.2).toLocaleString()}
                </p>
              </div>
              <div className="p-5 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-xl">
                <ShoppingBag className="w-8 h-8 text-secondary mb-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Direct Platform Fees</p>
                <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans tracking-tight mb-2 text-slate-800">₱{platformFees.toLocaleString()}</h4>
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Total Commissions</p>
              </div>
              <div className="p-5 sm:p-8 bg-white border border-slate-100 rounded-3xl shadow-xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mb-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Disputed Orders</p>
                <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans tracking-tight mb-2 text-slate-800">{orders.filter(o => o.disputeStatus === 'opened').length}</h4>
                <p className="text-[8px] font-bold uppercase tracking-widest text-red-500">Awaiting Mediation</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl sm:rounded-[2rem] border border-slate-100 overflow-hidden shadow-xl">
              <div className="p-5 sm:p-8 border-b border-slate-50">
                <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">Global Trade Ledger</h3>
              </div>
              <div className="hidden md:block overflow-x-auto no-scrollbar">
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
                            <div className="flex gap-2 justify-end">
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

              {/* Mobile Card-Based Order Ledger Layout */}
              <div className="block md:hidden divide-y divide-slate-100 p-4 sm:p-6 bg-white">
                {orders.map(o => (
                  <div key={o.id} className="py-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-xs text-slate-400">Order #{o.id?.slice(0, 12)}</p>
                        <p className="text-sm font-bold text-slate-800 tracking-tight mt-1">
                          Buyer: {users.find(u => u.uid === o.buyerId)?.fullName || 'Farmer Ecosystem'}
                        </p>
                      </div>
                      <p className="text-lg font-black text-primary font-sans">
                        ₱{o.total.toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-1">
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trade State</p>
                        <select 
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value as Order['status'])}
                          className="bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none w-full hover:text-primary transition-all cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dispute Protocol</p>
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${o.disputeStatus === 'opened' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                          {o.disputeStatus === 'opened' ? '⚠️ Disputed' : 'Stable'}
                        </span>
                      </div>
                    </div>

                    {o.disputeStatus === 'opened' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => resolveOrderDispute(o.id, 'resolved')} 
                          className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center min-h-[48px]"
                        >
                          Resolve Dispute
                        </button>
                        <button 
                          onClick={() => resolveOrderDispute(o.id, 'refunded', { status: 'cancelled' })} 
                          className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/10 flex items-center justify-center min-h-[48px]"
                        >
                          Issue Refund
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="p-5 sm:p-8 bg-white rounded-3xl border border-slate-100 shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-6">Sales Flux (7D)</h3>
                <div className="h-[300px] sm:h-[400px]">
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
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        itemStyle={{ color: '#416D19', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#416D19" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 sm:p-8 bg-white rounded-3xl border border-slate-100 shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-6">Harvest Distribution</h3>
                <div className="h-[300px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(products.reduce((acc: any, p) => {
                      acc[p.category] = (acc[p.category] || 0) + 1;
                      return acc;
                    }, {})).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Internal Broadcast */}
              <div className="p-5 sm:p-8 bg-white rounded-3xl border border-slate-100 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Radio className="w-6 h-6 text-secondary" />
                  <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Global Broadcast</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Transmission Payload</p>
                    <textarea 
                      value={broadcastDraft} onChange={e => setBroadcastDraft(e.target.value)}
                      placeholder="Enter emergency broadcast message..."
                      className="w-full p-4 sm:p-6 bg-slate-50 rounded-2xl text-xs font-medium h-36 focus:outline-none focus:ring-4 ring-secondary/5 transition-all outline-none"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Signal Priority</p>
                      <div className="flex gap-2.5">
                        {(['info', 'warning', 'emergency'] as const).map(t => (
                          <button key={t} onClick={() => setBroadcastType(t)} className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${broadcastType === t ? 'bg-secondary text-white' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={sendBroadcast} 
                      className="px-6 py-2.5 bg-primary text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 self-end hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      <Send className="w-3.5 h-3.5" /> Transmit Signal
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Audit */}
              <div className="p-5 sm:p-8 bg-primary rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="w-6 h-6 text-accent-light" />
                    <h3 className="text-xl font-bold font-sans tracking-tight">Security Audit Log</h3>
                  </div>
                  <div className="space-y-4">
                    {auditLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="p-4 border-b border-white/5 last:border-0 group">
                        <div className="flex justify-between items-start mb-1.5">
                          <p className="text-xs font-bold tracking-tight text-white/90">{log.action}</p>
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">#{log.id.slice(0, 8)}</p>
                        </div>
                        <p className="text-[11px] text-white/50 mb-2">{log.details}</p>
                        <p className="text-[8px] font-bold text-secondary uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Site Maintenance */}
              <div className="p-5 sm:p-8 bg-white rounded-3xl border border-slate-100 shadow-xl">
                <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-6">Ecosystem State</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-sans tracking-tight">Maintenance Mode</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Platform Lockdown</p>
                    </div>
                    <button 
                      onClick={() => updateSystemConfig({ maintenanceMode: !config?.maintenanceMode })} 
                      className={`w-12 h-6 rounded-full p-0.5 transition-all hover:scale-110 active:scale-95 ${config?.maintenanceMode ? 'bg-red-400' : 'bg-slate-200'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${config?.maintenanceMode ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Financial Protocol</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Platform Commission</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={config?.platformCommissionRate || 0} 
                          onChange={(e) => updateSystemConfig({ platformCommissionRate: Number(e.target.value) })}
                          className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-primary focus:outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-400 hover:scale-105 active:scale-95 transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Purge Cache
                  </button>
                </div>
              </div>

              {/* Featured Harvests Quicklinks */}
              <div className="p-5 sm:p-8 bg-secondary rounded-3xl text-white shadow-xl group">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                  <h3 className="text-xl font-bold font-sans tracking-tight">Spotlight Feed</h3>
                </div>
                <div className="space-y-4">
                  {products.filter(p => p.isFeatured).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shadow-inner shrink-0">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-bold truncate tracking-tight">{p.name}</p>
                      <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </div>
                  ))}
                  {products.filter(p => p.isFeatured).length === 0 && (
                    <p className="text-[10px] font-bold text-white/30 uppercase text-center py-6 italic">No harvests in spotlight</p>
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
