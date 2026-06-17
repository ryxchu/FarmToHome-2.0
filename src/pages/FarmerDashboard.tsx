import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, updateDoc, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaError, isOfflineError, safeSetItem } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Product, Order } from '../types';
import { Plus, Package, ShoppingBag, TrendingUp, Edit, Trash2, X, Check, Image as ImageIcon, Star, User, Settings, MessageSquare, ArrowLeft, ChevronRight, MapPin, Phone, Truck, CreditCard, Radio, ClipboardList, Sprout, Camera, Sparkles, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat } from '../components/Chat';
import { SocialFeed } from '../components/SocialFeed';
import { PhotoEditorModal } from '../components/PhotoEditorModal';

interface FarmerDashboardProps {
  onEditProfile?: () => void;
  activeTabProp?: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs';
  onTabChange?: (tab: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs') => void;
  highlightedOrderId?: string | null;
  onClearHighlightedOrder?: () => void;
  showProfileFormProp?: boolean;
  onCloseProfileForm?: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ 
  onEditProfile, 
  activeTabProp, 
  onTabChange,
  highlightedOrderId,
  onClearHighlightedOrder,
  showProfileFormProp,
  onCloseProfileForm
}) => {
  const { user, profile, refreshProfile, logout, isDemoActive } = useAuth();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'feedback' | 'messages' | 'community' | 'logs'>(activeTabProp || 'inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedDetailedOrder, setSelectedDetailedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (highlightedOrderId && orders.length > 0) {
      const matchedOrder = orders.find(o => o.id === highlightedOrderId);
      if (matchedOrder) {
        setSelectedDetailedOrder(matchedOrder);
        setActiveTab('logs');
      }
    }
  }, [highlightedOrderId, orders]);

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  const handleTabChange = (tab: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    const handleOpenModal = () => {
      setEditingProduct(null);
      setShowAddModal(true);
    };
    window.addEventListener('open-add-product-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-add-product-modal', handleOpenModal);
    };
  }, []);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Load initial cached values from localStorage
    try {
      const cachedProds = localStorage.getItem(`farmer_products_${currentUid}`);
      if (cachedProds) setProducts(JSON.parse(cachedProds));

      const cachedOrders = localStorage.getItem(`farmer_orders_${currentUid}`);
      if (cachedOrders) setOrders(JSON.parse(cachedOrders));

      const cachedReviews = localStorage.getItem(`farmer_reviews_${currentUid}`);
      if (cachedReviews) setReviews(JSON.parse(cachedReviews));

      const cachedConvs = localStorage.getItem(`farmer_conversations_${currentUid}`);
      if (cachedConvs) setConversations(JSON.parse(cachedConvs));
    } catch (e) {
      console.warn("Failed to parse cached farmer data:", e);
    }

    const qProds = query(collection(db, 'products'), where('farmerId', '==', currentUid));
    const unsubscribeProds = onSnapshot(qProds, (snapshot) => {
      const fetchedProds = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      setProducts(fetchedProds);
      safeSetItem(`farmer_products_${currentUid}`, JSON.stringify(fetchedProds));
    }, (error) => {
      if (!isQuotaError(error) && !isOfflineError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    });

    const qOrders = query(collection(db, 'orders'), where('farmerId', '==', currentUid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      setOrders(fetchedOrders);
      safeSetItem(`farmer_orders_${currentUid}`, JSON.stringify(fetchedOrders));
    }, (error) => {
      if (!isQuotaError(error) && !isOfflineError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    const qReviews = query(collection(db, 'reviews'), where('farmerId', '==', currentUid));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      setReviews(fetchedReviews);
      safeSetItem(`farmer_reviews_${currentUid}`, JSON.stringify(fetchedReviews));
    }, (error) => {
      if (!isQuotaError(error) && !isOfflineError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    });

    // Keep conversations real-time as messaging needs it
    const qConv = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUid));
    const unsubscribeConv = onSnapshot(qConv, (snapshot) => {
      const fetchedConvs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setConversations(fetchedConvs);
      safeSetItem(`farmer_conversations_${currentUid}`, JSON.stringify(fetchedConvs));
    }, (error) => {
      if (!isQuotaError(error) && !isOfflineError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      } else {
        console.warn("Using cached conversations due to quota limit or offline status");
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    });

    return () => {
      unsubscribeProds();
      unsubscribeOrders();
      unsubscribeReviews();
      unsubscribeConv();
    };
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

  // Account Settings states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showPresetsInForm, setShowPresetsInForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    farmName: profile?.farmName || '',
    contactNumber: profile?.phone || '',
    address: profile?.address || '',
    primaryCrops: profile?.primaryCrops || '',
    photoURL: profile?.photoURL || '',
    farmStory: profile?.farmStory || '',
  });

  const presetFarmerAvatars = [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200", 
    "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200"
  ];

  const profileFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showProfileFormProp !== undefined) {
      setShowEditProfileModal(showProfileFormProp);
    }
  }, [showProfileFormProp]);

  const handleCloseModal = () => {
    setShowEditProfileModal(false);
    if (onCloseProfileForm) {
      onCloseProfileForm();
    }
  };

  useEffect(() => {
    if (profile) {
      setProfileForm({
        farmName: profile.farmName || '',
        contactNumber: profile.phone || '',
        address: profile.address || '',
        primaryCrops: profile.primaryCrops || '',
        photoURL: profile.photoURL || '',
        farmStory: profile.farmStory || '',
      });
    }
  }, [profile]);

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setTempImageSrc(reader.result as string);
          setPhotoEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const displayAddress = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setProfileForm(v => ({ ...v, address: displayAddress }));
            setDetectingLocation(false);
          })
          .catch(() => {
            setProfileForm(v => ({ ...v, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
            setDetectingLocation(false);
          });
      },
      (error) => {
        alert('Could not detect location. Please enable permissions.');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleUpdateFarmerPhoto = async (newPhotoURL: string) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = { photoURL: newPhotoURL };

      // Instant state and cache merge to avoid slow network feedback loops
      localStorage.removeItem(`user_profile_${user.uid}`);
      const updatedProfile = { ...(profile || {}), ...updateData };
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(updatedProfile));

      const isDemo = user.uid.startsWith('demo_');
      if (isDemo) {
        const storedDemoSession = localStorage.getItem('demo_profile_session');
        if (storedDemoSession) {
          try {
            const parsed = JSON.parse(storedDemoSession);
            const merged = { ...parsed, ...updateData };
            localStorage.setItem('demo_profile_session', JSON.stringify(merged));
          } catch (e) {}
        }
      }

      if (!isDemo) {
        await updateDoc(userRef, updateData);
      } else {
        try {
          await setDoc(userRef, updateData, { merge: true });
        } catch (e) {
          console.warn("Firestore save skipped/failed for demo user:", e);
        }
      }

      await refreshProfile();
    } catch (err) {
      console.error("Failed to instantly save farmer profile photo:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        farmName: profileForm.farmName,
        contactNumber: profileForm.contactNumber,
        phone: profileForm.contactNumber,
        address: profileForm.address,
        deliveryAddress: profileForm.address,
        primaryCrops: profileForm.primaryCrops,
        photoURL: profileForm.photoURL,
        farmStory: profileForm.farmStory,
      };

      // Clear local storage cache to bypass any stale reads
      localStorage.removeItem(`user_profile_${user.uid}`);
      
      const isDemo = user.uid.startsWith('demo_');
      if (isDemo) {
        const storedDemoSession = localStorage.getItem('demo_profile_session');
        if (storedDemoSession) {
          try {
            const parsed = JSON.parse(storedDemoSession);
            const merged = { ...parsed, ...updateData };
            localStorage.setItem('demo_profile_session', JSON.stringify(merged));
          } catch (e) {}
        }
      }

      if (!isDemo) {
        await updateDoc(userRef, updateData);
      } else {
        try {
          await setDoc(userRef, updateData, { merge: true });
        } catch (e) {
          console.warn("Firestore save skipped/failed for demo user:", e);
        }
      }

      await refreshProfile();
      alert("Account settings saved successfully!");
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Failed to save profile changes. Please check permissions or try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Predefined realistic transaction logs for immediate mechanics testing
  const dummyLogs = [
    {
      id: "IZN3G9JWY9",
      buyerName: "Chef Andrea Delgado (Green Bistro)",
      createdAt: "2026-05-26T15:30:00Z",
      status: "pending" as const,
      deliveryAddress: "Green Bistro Cafe, Bonifacio Global City, Taguig",
      contactNumber: "0917-882-9912",
      shippingMethod: "Direct Dispatch (Express)",
      paymentMethod: "GCash Transfer",
      buyerMessage: "Please pack the Pechay Tagalog with wet towels to keep them crisp!",
      items: [
        { name: "Pechay Tagalog", quantity: 3, price: 40, image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=120" },
        { name: "Organic Red Tomatoes", quantity: 2, price: 75, image: "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&q=80&w=120" }
      ],
      total: 270
    },
    {
      id: "KXM8F2HQA4",
      buyerName: "Maria Santos (Home Cook)",
      createdAt: "2026-05-26T10:15:00Z",
      status: "preparing" as const,
      deliveryAddress: "12A Molave Street, Project 3, Quezon City",
      contactNumber: "0918-223-1144",
      shippingMethod: "Eco-Courier Partner",
      paymentMethod: "Cash on Delivery",
      buyerMessage: "Call 5 minutes before arriving.",
      items: [
        { name: "Highland Sweet Potatoes", quantity: 5, price: 60, image: "https://images.unsplash.com/photo-1596003903067-bf5762a521c8?auto=format&fit=crop&q=80&w=120" }
      ],
      total: 300
    },
    {
      id: "YPT4V1XCD7",
      buyerName: "Luigi Almeda (Salad Express)",
      createdAt: "2026-05-25T16:45:00Z",
      status: "delivered" as const,
      deliveryAddress: "Salad Express Central, Kapitolyo, Pasig City",
      contactNumber: "0919-771-4422",
      shippingMethod: "Cooperative Trucking",
      paymentMethod: "Cooperative Wallet",
      items: [
        { name: "Lettuce Batavia", quantity: 4, price: 50, image: "https://images.unsplash.com/photo-1622484211148-716598e04141?auto=format&fit=crop&q=80&w=120" },
        { name: "Fresh Garlic Bulbs", quantity: 1, price: 120, image: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=120" }
      ],
      total: 320
    }
  ];

  // Tracking mock state status changes locally to ensure complete interaction
  const [mockStatuses, setMockStatuses] = useState<Record<string, Order['status']>>({});

  const totalSales = orders.reduce((sum, order) => order.status === 'delivered' ? sum + order.total : sum, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (["IZN3G9JWY9", "KXM8F2HQA4", "YPT4V1XCD7"].includes(orderId)) {
      setMockStatuses(prev => ({ ...prev, [orderId]: newStatus }));
      alert(`Demo Order status updated to "${newStatus}"!`);
      return;
    }
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

  const deleteProduct = (productId: string) => {
    setDeleteConfirmId(productId);
  };

  const deleteProductDirectly = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const togglePublishStatus = async (product: Product) => {
    try {
      const updatedStatus = !product.isPublished;
      await updateDoc(doc(db, 'products', product.id), { 
        isPublished: updatedStatus,
        updatedAt: new Date().toISOString()
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isPublished: updatedStatus } : p));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
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
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-6 overflow-x-hidden w-full">
      {/* Header Area - Catalog & Stats only */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">Store <span className="italic text-primary font-serif">Management</span></h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px]">Operational dashboard for {profile?.farmName || "Your Farm"}.</p>
          </div>
          
          <div className="hidden sm:flex flex-wrap items-center gap-2 w-auto">
            <button 
              onClick={() => { setEditingProduct(null); setShowAddModal(true); }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-primary/10 active:scale-95 flex items-center justify-center gap-1.5 min-w-[95px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <button 
              onClick={() => handleTabChange('logs')}
              className="px-3 py-2 bg-white text-slate-600 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm min-w-[75px]"
            >
              <ClipboardList className="w-3.5 h-3.5 text-primary" /> Orders
            </button>
            <button 
              onClick={onEditProfile || (() => setShowEditProfileModal(true))}
              className="px-3 py-2 bg-white text-slate-600 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm min-w-[75px]"
            >
              <User className="w-3.5 h-3.5 hover:text-primary" /> Profile
            </button>
            <button 
              onClick={() => handleTabChange('messages')}
              className="px-3 py-2 bg-white text-slate-600 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-1.5 relative shadow-sm min-w-[75px]"
            >
              <MessageSquare className="w-3.5 h-3.5 hover:text-primary" /> Chat
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
            </button>
            <button 
              onClick={() => handleTabChange('community')}
              className="px-3 py-2 bg-white text-slate-600 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm min-w-[75px]"
            >
              <Radio className="w-3.5 h-3.5 text-secondary hover:text-primary" /> Community
            </button>
          </div>
        </div>
      )}

      {/* Title Specific Headers for Feedback and Client Inbox */}
      {activeTab === 'feedback' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">Customer <span className="italic text-primary font-serif">Feedback & Reviews</span></h1>
          </div>
          <button
            onClick={() => handleTabChange('inventory')}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" /> Back to Dashboard
          </button>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">Client <span className="italic text-primary font-serif">Inbox</span></h1>
          </div>
          <button
            onClick={() => handleTabChange('inventory')}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" /> Back to Dashboard
          </button>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">Farmer <span className="italic text-primary font-serif">Community Feed</span></h1>
          </div>
          <button
            onClick={() => handleTabChange('inventory')}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" /> Back to Dashboard
          </button>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">Operational <span className="italic text-primary font-serif">Log & Orders</span></h1>
          </div>
          <button
            onClick={() => handleTabChange('inventory')}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary" /> Back to Dashboard
          </button>
        </div>
      )}

      {/* Stats Row - Catalog & Stats only */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full">
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[90px]">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">Active Products</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{products.length}</h3>
              <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Listed</span>
            </div>
            <Package className="absolute right-3 bottom-3 w-8 h-8 text-slate-100 opacity-20" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[90px]">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">Top Performer</p>
            <div className="mt-1 overflow-hidden">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight truncate leading-tight">
                {products.sort((a,b) => (b.rating || 0) - (a.rating || 0))[0]?.name || '---'}
              </h3>
              <p className="text-[8px] font-semibold text-amber-500 uppercase tracking-wide mt-0.5">Winning Crop</p>
            </div>
            <Star className="absolute right-3 bottom-3 w-8 h-8 text-amber-200/40 fill-amber-200/20" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[90px]">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">Quality Score</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <svg className="w-full h-full rotate-[-90deg] absolute">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="88" strokeDashoffset="18" strokeLinecap="round" />
                </svg>
                <span className="text-[8px] font-black text-emerald-600 relative z-10">82%</span>
              </div>
              <p className="text-[8.5px] font-bold text-emerald-500 uppercase tracking-wide leading-none">Good Performance</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[90px]">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">Sales Value</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-black text-primary tracking-tight">₱{totalSales.toLocaleString()}</h3>
              <span className="text-[8px] font-bold text-emerald-500 tracking-wide">+12.4%</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Main Panel */}
        <div className="space-y-10">
          {activeTab === 'inventory' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 mb-4">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight font-sans">Produce & Crop Catalog</h2>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <input 
                    type="text" 
                    placeholder="Search produce..." 
                    className="pl-10 pr-4 py-2 bg-white border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-primary/10 outline-none w-full transition-all shadow-sm h-10"
                  />
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
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
                className="bg-white rounded-3xl p-4 md:p-6 shadow-md border border-slate-100"
              >
                {products.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px]">No products in inventory</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop/Tablet Table Layout */}
                    <div className="hidden lg:block bg-white/50 border border-slate-100 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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

                    {/* Mobile Cards Layout */}
                    <div className="lg:hidden space-y-4">
                      {paginatedProducts.map(product => (
                        <div key={product.id} className="bg-white border border-slate-150 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <img 
                              src={product.images?.[0] || 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=200'} 
                              className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl object-cover shadow-sm border border-slate-150 shrink-0" 
                              alt={product.name}
                            />
                            <div className="min-w-0 flex-1">
                              {/* Large Bold Crop Name */}
                              <h4 className="font-extrabold text-slate-900 text-base sm:text-xl tracking-tight leading-tight mb-1 truncate">{product.name}</h4>
                              <p className="text-[9px] text-slate-400 font-mono">ID: {product.id.slice(0, 8).toUpperCase()}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">Quality Verified</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price per {product.unit}</p>
                              <p className="text-lg sm:text-xl font-black text-primary tracking-tight">₱{product.price.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Listing Visibility</p>
                              <div className="flex items-center gap-2">
                                {/* Standard responsive physical toggle */}
                                <button 
                                  type="button"
                                  onClick={() => togglePublishStatus(product)}
                                  aria-label="Toggle visible state"
                                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    product.isPublished ? 'bg-primary' : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      product.isPublished ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${product.isPublished ? 'text-primary' : 'text-slate-400'}`}>
                                  {product.isPublished ? 'Active' : 'Standby'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Weight</p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none shrink-0">{product.stock} {product.unit}s</span>
                                <div className="flex-grow h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-150">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      product.stock > 50 ? 'bg-primary' : 
                                      product.stock > 10 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (product.stock / 200) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                              <button 
                                type="button"
                                onClick={() => { setEditingProduct(product); setShowAddModal(true); }}
                                className="flex-1 py-2.5 text-slate-700 bg-slate-50 hover:bg-slate-100 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit Listing
                              </button>
                              <button 
                                type="button"
                                onClick={() => deleteProduct(product.id)}
                                className="px-3 py-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl border border-rose-200 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                  <div className="bg-white rounded-3xl py-12 text-center border border-slate-200">
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
                    <div key={review.id} className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-150 hover:border-primary/20 transition-all group shadow-sm hover:shadow-md">
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
            ) : activeTab === 'messages' ? (
              <motion.div 
                key="messages"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm border border-slate-150 divide-y divide-slate-100"
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
                      className="p-4 sm:p-6 group flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center overflow-hidden border border-primary/5 shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participants.find((id: string) => id !== profile?.uid)}`} className="w-full h-full object-contain bg-accent-light" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-base text-slate-800 tracking-tight truncate">{conv.buyerName === profile?.fullName ? conv.farmerName : conv.buyerName}</p>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{conv.lastMessage || 'No messages yet'}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{conv.lastMessageAt ? new Date(conv.lastMessageAt?.toDate?.() || conv.lastMessageAt).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === 'community' ? (
              <motion.div
                key="community"
                initial={{ opacity: 0, x: -25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 25 }}
                className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100"
              >
                <SocialFeed />
              </motion.div>
            ) : (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: -25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 25 }}
                className="flex flex-col h-full max-h-[75vh]"
              >
                {/* Header block for Logs */}
                <div className="px-4 mb-4 flex items-center justify-between shrink-0 text-left">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight font-sans">Operational Logs</h2>
                    <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Real-Time Sourced Purchases & Fulfillment</p>
                  </div>
                </div>

                {/* Main continuous scrollable area */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 no-scrollbar">
                  {orders.length === 0 && !isDemoActive ? (
                    <div className="py-24 text-center">
                      <Package className="w-16 h-16 text-slate-200 mx-auto mb-6 shrink-0" />
                      <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">No orders or logs yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed font-semibold">
                        Once buyers start sourcing and purchasing your crops, your real-time fulfillment logs will appear here!
                      </p>
                    </div>
                  ) : (
                    Object.keys(
                      (() => {
                        // Prepare log combination right at state scope safely
                      const allLogsCombined = [
                        ...orders.map(o => ({
                          id: o.id,
                          buyerName: o.buyerName || "General Buyer",
                          createdAt: (o.createdAt as any)?.toDate?.() ? (o.createdAt as any).toDate().toISOString() : (o.createdAt || new Date().toISOString()),
                          status: mockStatuses[o.id] || o.status,
                          deliveryAddress: o.buyerAddress || o.deliveryAddress || "No delivery address",
                          contactNumber: o.buyerPhone || o.contactNumber || "N/A",
                          shippingMethod: o.shippingMethod || "Standard Cargo",
                          paymentMethod: o.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : o.paymentMethod === 'gcash' ? 'GCash' : o.paymentMethod || 'Paid',
                          buyerMessage: o.buyerMessage || "",
                          items: (o.items || []).map(item => {
                            const matchedProd = products.find(p => p.id === item.productId);
                            return {
                              name: item.name,
                              quantity: item.quantity,
                              price: item.price,
                              image: item.image || matchedProd?.images?.[0] || "https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=120"
                            };
                          }),
                          total: o.total,
                          isRealDbOrder: true
                        })),
                        ...(isDemoActive ? dummyLogs.map(dl => ({
                          ...dl,
                          status: mockStatuses[dl.id] || dl.status,
                          isRealDbOrder: false
                        })) : [])
                      ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                      const groups: Record<string, typeof allLogsCombined> = {};
                      allLogsCombined.forEach(log => {
                        const d = new Date(log.createdAt);
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);

                        let dayName = "";
                        if (d.toDateString() === today.toDateString()) {
                          dayName = "TODAY";
                        } else if (d.toDateString() === yesterday.toDateString()) {
                          dayName = "YESTERDAY";
                        } else {
                          dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                        }

                        const monthName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                        const dateLabel = `${dayName} • ${monthName}`;

                        if (!groups[dateLabel]) {
                          groups[dateLabel] = [];
                        }
                        groups[dateLabel].push(log);
                      });
                      return groups;
                    })()
                  ).map(dateHeader => {
                    const allLogsCombined = [
                      ...orders.map(o => ({
                        id: o.id,
                        buyerName: o.buyerName || "General Buyer",
                        createdAt: (o.createdAt as any)?.toDate?.() ? (o.createdAt as any).toDate().toISOString() : (o.createdAt || new Date().toISOString()),
                        status: mockStatuses[o.id] || o.status,
                        deliveryAddress: o.buyerAddress || o.deliveryAddress || "No delivery address",
                        contactNumber: o.buyerPhone || o.contactNumber || "N/A",
                        shippingMethod: o.shippingMethod || "Standard Cargo",
                        paymentMethod: o.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : o.paymentMethod === 'gcash' ? 'GCash' : o.paymentMethod || 'Paid',
                        buyerMessage: o.buyerMessage || "",
                        items: (o.items || []).map(item => {
                          const matchedProd = products.find(p => p.id === item.productId);
                          return {
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            image: item.image || matchedProd?.images?.[0] || "https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=120"
                          };
                        }),
                        total: o.total,
                        isRealDbOrder: true
                      })),
                      ...(isDemoActive ? dummyLogs.map(dl => ({
                        ...dl,
                        status: mockStatuses[dl.id] || dl.status,
                        isRealDbOrder: false
                      })) : [])
                    ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                    const groups: Record<string, typeof allLogsCombined> = {};
                    allLogsCombined.forEach(log => {
                      const d = new Date(log.createdAt);
                      const today = new Date();
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);

                      let dayName = "";
                      if (d.toDateString() === today.toDateString()) {
                        dayName = "TODAY";
                      } else if (d.toDateString() === yesterday.toDateString()) {
                        dayName = "YESTERDAY";
                      } else {
                        dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                      }

                      const monthName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                      const dateLabel = `${dayName} • ${monthName}`;

                      if (!groups[dateLabel]) {
                        groups[dateLabel] = [];
                      }
                      groups[dateLabel].push(log);
                    });

                    const logsInGroup = groups[dateHeader] || [];

                    return (
                      <div key={dateHeader} className="space-y-4 text-left">
                        {/* Sticky Date Group Heading */}
                        <div className="sticky top-0 bg-slate-50 py-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase z-10 border-b border-slate-100 text-left">
                          {dateHeader}
                        </div>

                        {/* Logs list in this date group */}
                        <div className="space-y-4">
                          {logsInGroup.map(log => {
                            const isPending = log.status === 'pending';
                            const isPreparing = log.status === 'preparing';
                            const isShipped = log.status === 'shipped';
                            const isDelivered = log.status === 'delivered';

                            return (
                              <div 
                                key={log.id} 
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-150 shadow-xs space-y-3.5 relative overflow-hidden transition-all hover:bg-slate-50/20 text-left"
                              >
                                {/* Receipt Header info */}
                                <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-3 text-left">
                                  <div>
                                    <span className="font-mono text-[9px] font-bold text-slate-400 block tracking-wider leading-none">RECEIPT ID</span>
                                    <button 
                                      onClick={() => setSelectedDetailedOrder({
                                        ...log,
                                        buyerAddress: log.deliveryAddress,
                                        buyerPhone: log.contactNumber,
                                        buyerMessage: log.buyerMessage,
                                      } as any)}
                                      className="text-sm font-black tracking-tight text-slate-800 hover:text-emerald-700 hover:underline outline-none flex items-center gap-1 mt-1 text-left bg-transparent p-0 border-0 cursor-pointer"
                                    >
                                      #{log.id.toUpperCase()}
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500 mt-1.5 block font-sans">Buyer: {log.buyerName}</span>
                                  </div>

                                  <div className="text-right flex flex-col items-end shrink-0">
                                    <span className="text-[8px] font-bold text-slate-450 uppercase tracking-widest leading-none mb-1.5">
                                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border leading-none ${
                                      isPending ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                      isPreparing ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                      isShipped ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                      isDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                      'bg-slate-50 text-slate-650 border-slate-200'
                                    }`}>
                                      {log.status === 'preparing' ? 'preparing' : log.status === 'shipped' ? 'shipped' : log.status === 'delivered' ? 'delivered' : log.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Items block with images */}
                                <div className="space-y-2 mt-1">
                                  {log.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3 bg-slate-50/50 p-2 border border-slate-100/40 rounded-xl">
                                      <img src={item.image} className="w-9 h-9 object-cover rounded-lg border border-slate-100 shrink-0" referrerPolicy="no-referrer" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">{item.name}</p>
                                        <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                                          Qty: {item.quantity} • ₱{item.price.toFixed(2)}
                                        </p>
                                      </div>
                                      <p className="text-xs font-mono font-bold text-slate-705">₱{(item.quantity * item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Actions & totals footer */}
                                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-left">
                                  <div className="text-left">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5 text-left">Fulfillment Total</span>
                                    <span className="text-sm font-mono font-black text-slate-800 text-left block">
                                      ₱{log.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      onClick={() => setSelectedDetailedOrder({
                                        ...log,
                                        buyerAddress: log.deliveryAddress,
                                        buyerPhone: log.contactNumber,
                                        buyerMessage: log.buyerMessage,
                                      } as any)}
                                      className="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-505 hover:text-slate-700 border border-slate-205 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                                    >
                                      Details
                                    </button>

                                    {isPending && (
                                      <button
                                        onClick={() => updateOrderStatus(log.id, 'preparing')}
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
                                      >
                                        Accept
                                      </button>
                                    )}

                                    {isPreparing && (
                                      <button
                                        onClick={() => updateOrderStatus(log.id, 'shipped')}
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
                                      >
                                        Dispatch
                                      </button>
                                    )}

                                    {isShipped && (
                                      <button
                                        onClick={() => updateOrderStatus(log.id, 'delivered')}
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white bg-emerald-605 hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer"
                                      >
                                        Deliver
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Spacing widget to prevent floating button overlapping tap targets */}
      <div className="h-24" />

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

      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100/85"
            >
              <h3 className="text-base font-bold text-slate-900 tracking-tight font-sans mb-1.5 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" /> Delete Listing?
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this listing? Registered chefs won't be able to buy it anymore.</p>
              <div className="flex gap-2.5 justify-end">
                <button 
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    const id = deleteConfirmId;
                    setDeleteConfirmId(null);
                    await deleteProductDirectly(id);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-500/10"
                >
                  Delete Listing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDetailedOrder && (
          <OrderDetailModal 
            order={selectedDetailedOrder} 
            onClose={() => {
              setSelectedDetailedOrder(null);
              onClearHighlightedOrder?.();
            }}
            updateOrderStatus={updateOrderStatus}
          />
        )}
      </AnimatePresence>

      {/* Account Settings / Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[999]"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-lg shadow-2xl flex flex-col overflow-hidden border border-slate-100 max-h-[90vh] md:max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-5 border-b border-stone-100 shrink-0">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5 leading-none">
                    <Settings className="w-4 h-4 text-primary animate-spin-slow" /> Account Settings
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Update farm & primary contact details</p>
                </div>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-50 active:scale-95 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form and Scroll Area */}
              <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 p-6 bg-slate-50/50 max-h-[60vh]">
                  {/* Farm Details Header banner card */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                      <Sprout className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Operational Identity</p>
                      <p className="text-[9px] text-emerald-600 font-medium leading-relaxed mt-0.5">Let local chefs know who is preparing their harvest. Keep your details current to build trust.</p>
                    </div>
                  </div>

                  {/* Interactive Profile Picture Section */}
                  <div className="space-y-2 text-center">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest text-center">
                      Profile Avatar
                    </label>
                    <div className="relative">
                      <div 
                        onClick={() => profileFileInputRef.current?.click()}
                        className="w-24 h-24 rounded-full bg-slate-100 border-2 border-emerald-500 relative flex items-center justify-center overflow-hidden mx-auto group cursor-pointer hover:ring-4 hover:ring-emerald-500/10 active:scale-95 transition-all shadow-md"
                      >
                        {profileForm.photoURL ? (
                          <img 
                            src={profileForm.photoURL} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-slate-400 group-hover:text-emerald-600 transition-colors flex flex-col items-center">
                            <User className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Upload</span>
                          </div>
                        )}
                        
                        <input 
                          type="file"
                          ref={profileFileInputRef}
                          onChange={handleFormFileChange}
                          accept="image/*"
                          className="hidden"
                          id="farmer-profile-image-input"
                        />

                        {/* Icon Overlay Badge representing camera action */}
                        <div className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow hover:bg-emerald-700 transition-colors z-10">
                          <Camera className="w-3.5 h-3.5 stroke-[2]" />
                        </div>
                      </div>
                    </div>

                    {/* Preselected Filipino / Local Farmer Avatars */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setShowPresetsInForm(!showPresetsInForm)}
                        className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase text-emerald-700 hover:text-emerald-800 tracking-wider bg-emerald-50/50 px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer border border-emerald-100/55"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        {showPresetsInForm ? "Hide Presets" : "Use Preset Avatar"}
                      </button>

                      {showPresetsInForm && (
                        <div className="mt-2.5 p-2 bg-white rounded-xl border border-dashed border-slate-200 flex justify-center gap-3">
                          {presetFarmerAvatars.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={async () => {
                                setProfileForm(v => ({ ...v, photoURL: url }));
                                setShowPresetsInForm(false);
                                await handleUpdateFarmerPhoto(url);
                              }}
                              className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-90 ${profileForm.photoURL === url ? 'border-emerald-600 scale-105 shadow' : 'border-white hover:border-slate-300'}`}
                            >
                              <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Farm Name Field */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Farm Name
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={profileForm.farmName}
                        onChange={(e) => setProfileForm(v => ({ ...v, farmName: e.target.value }))}
                        placeholder="e.g. Cordillera Greens Farm" 
                        className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                        disabled={isSavingProfile}
                      />
                    </div>
                  </div>

                  {/* Contact Number Field */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Mobile contact Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input 
                        type="tel" 
                        required
                        value={profileForm.contactNumber}
                        onChange={(e) => setProfileForm(v => ({ ...v, contactNumber: e.target.value }))}
                        placeholder="e.g. +63 917 123 4567" 
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                        disabled={isSavingProfile}
                      />
                    </div>
                  </div>

                  {/* Address Field */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center">
                      <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                        Farm Logistics Address
                      </label>
                      <button 
                        type="button" 
                        onClick={detectLocation}
                        className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest hover:underline flex items-center gap-1"
                        disabled={detectingLocation}
                      >
                        <MapPin className="w-3 h-3 text-emerald-600 animate-pulse" />
                        {detectingLocation ? 'Detecting...' : 'Detect Location'}
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <textarea 
                        required
                        rows={3}
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(v => ({ ...v, address: e.target.value }))}
                        placeholder="e.g. Sitio Benson, Brgy. Ambassador, Tublay, Benguet" 
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 resize-none leading-relaxed"
                        disabled={isSavingProfile}
                      />
                    </div>
                  </div>

                  {/* Primary Crops Field */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Primary Crops / Cultivations
                    </label>
                    <input 
                      type="text" 
                      required
                      value={profileForm.primaryCrops}
                      onChange={(e) => setProfileForm(v => ({ ...v, primaryCrops: e.target.value }))}
                      placeholder="e.g. Strawberries, Lettuce, Heirloom Rice, Carrots" 
                      className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800"
                      disabled={isSavingProfile}
                    />
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider text-left mt-1">Comma-separated values of crops you primarily grow.</p>
                  </div>

                  {/* Farmer Story / Testimonial Box */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] font-extrabold uppercase text-slate-500 tracking-widest">
                      Farmer's Story / Testimonial
                    </label>
                    <textarea 
                      required
                      rows={3}
                      value={profileForm.farmStory}
                      onChange={(e) => setProfileForm(v => ({ ...v, farmStory: e.target.value }))}
                      placeholder="Share your farm's background, practices, or experiences to inspire local buyers..." 
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-emerald-500 text-slate-800 focus:outline-none leading-relaxed resize-none"
                      disabled={isSavingProfile}
                    />
                    <div className="flex justify-between text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                      <span>Introduce your heritage and values</span>
                      <span>{profileForm.farmStory.length} chars</span>
                    </div>
                  </div>

                  {/* Quick Mobile Log Out Section */}
                  <div className="mt-6 pt-6 border-t border-slate-200/60 text-center">
                    <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-1">Session Management</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-3">Finished managing your cooperative store?</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Are you sure you want to logout???',
                          message: 'You are logging out from your Farmer Dashboard session. You will need to use your OTP next time you register or log in.',
                          confirmText: 'Yes, Logout',
                          cancelText: 'Cancel',
                          type: 'logout'
                        });
                        if (!confirmed) return;
                        try {
                          // Synchronously purge demo cache so page reload cannot restore the session
                          localStorage.removeItem('demo_user_session');
                          localStorage.removeItem('demo_profile_session');
                          
                          // Await the logout process fully (Firebase sign out + state purge)
                          await logout();
                          
                          // Force immediate browser redirect to landing page to wipe Javascript memory
                          window.location.href = '/';
                        } catch (e) {
                          console.error("Log out handling error:", e);
                          window.location.reload();
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 font-extrabold text-[10px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  </div>
                </div>

                {/* Footer sticky area */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3.5 shrink-0">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-650 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-slate-200"
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PhotoEditorModal 
        isOpen={photoEditorOpen}
        imageSrc={tempImageSrc}
        onClose={() => setPhotoEditorOpen(false)}
        onDone={async (croppedBase64) => {
          setProfileForm(prev => ({ ...prev, photoURL: croppedBase64 }));
          setPhotoEditorOpen(false);
          await handleUpdateFarmerPhoto(croppedBase64);
        }}
      />
    </div>
  );
};

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  updateOrderStatus: (orderId: string, status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled') => Promise<void>;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, updateOrderStatus }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled') => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, status);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-stone-150 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h3 className="text-lg font-black text-slate-800 tracking-tight font-sans">Sourced Order Details</h3>
            </div>
            <p className="font-mono text-xs text-slate-405 font-bold tracking-wider">ORDER ID: #{order.id.toUpperCase()}</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 text-slate-400 rounded-full transition-all border border-slate-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1.5">
          {/* Status Tracker */}
          <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-405 block mb-1">Fulfillment Status</span>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {order.status}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-440 block mb-1">Date Sourced</span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {new Date((order.createdAt as any)?.toDate?.() || order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Crops Items Detail */}
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-405 block mb-2.5">Sourced Crops Summary</span>
            <div className="border border-slate-150 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center bg-white transition-colors hover:bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-850 text-sm leading-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-405 font-bold mt-0.5 uppercase tracking-wide">
                      ₱{item.price.toLocaleString()} per unit <span className="text-primary">•</span> Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-800">₱{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="p-4 bg-slate-50/30 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-405">Transaction Subtotal</span>
                <span className="text-xl font-black text-primary italic font-sans animate-pulse">₱{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Billing Address */}
          <div className="p-4.5 border border-slate-150 rounded-2xl bg-slate-50/20 space-y-3 text-xs leading-relaxed">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[8px] font-black uppercase text-slate-404 tracking-widest leading-none mb-1">Destination Address</p>
                <p className="font-bold text-slate-700">{order.deliveryAddress || 'No address provided'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-150/70">
              <div className="flex items-start gap-2.5">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-404 tracking-wider leading-none mb-1">Contact Details</p>
                  <p className="font-bold text-slate-700">{order.contactNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Truck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-404 tracking-wider leading-none mb-1">Logistics Route</p>
                  <p className="font-bold text-slate-700">{order.shippingMethod || 'Standard Route'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-150/50">
              <span className="text-[9px] font-black uppercase text-slate-404 tracking-wider">Payment Method</span>
              <span className="font-bold text-slate-600 bg-white border border-slate-150 px-2.5 py-0.5 rounded-lg">
                {order.paymentMethod || 'Cash on Delivery'}
              </span>
            </div>

            {order.buyerMessage && (
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-start gap-2.5 bg-amber-50/40 -mx-4.5 -mb-4.5 p-4 rounded-b-[1.25rem]">
                <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-black uppercase text-primary tracking-wider leading-none mb-1">Instruction from Chef</p>
                  <p className="text-[11px] font-medium text-slate-800 italic leading-relaxed">"{order.buyerMessage}"</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="mt-6 pt-5 border-t border-slate-150 flex flex-wrap gap-2 justify-end shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold text-[10px] uppercase rounded-xl tracking-wider transition-all select-none active:scale-95 cursor-pointer"
          >
            Close Receipt
          </button>
          
          {order.status === 'pending' && (
            <button 
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('preparing')}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer tracking-widest disabled:opacity-40"
            >
              Accept Order
            </button>
          )}

          {order.status === 'preparing' && (
            <button 
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('shipped')}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer tracking-widest disabled:opacity-40"
            >
              Ship Order
            </button>
          )}

          {order.status === 'shipped' && (
            <button 
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('delivered')}
              className="px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white font-bold text-[10px] uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer tracking-widest disabled:opacity-40"
            >
              Complete Order
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.60);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleMultipleFiles = async (files: FileList) => {
    setLoading(true);
    try {
      const pImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          pImages.push(compressed);
        }
      }
      if (pImages.length > 0) {
        setFormData(prev => ({ ...prev, images: [...prev.images, ...pImages] }));
      }
    } catch (err) {
      console.error("Compression error:", err);
    } finally {
      setLoading(false);
    }
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
          <div className="p-5 sm:p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 text-slate-400 rounded-full transition-all border border-slate-100"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Quick Crop Preset Shortcuts */}
              <div className="col-span-2 bg-stone-50 p-4 border border-stone-200 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">🌾 Quick Crop Presets (Tap to auto-fill)</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { name: 'Pechay', category: 'Vegetables', unit: 'kg', price: 90, desc: 'Freshly harvested local Pechay. Crispy green leaves, rich in iron.' },
                    { name: 'Mangoes', category: 'Fruits', unit: 'kg', price: 180, desc: 'Sweet, juicy yellow mangoes of the Carabao variety.' },
                    { name: 'Tomatoes', category: 'Vegetables', unit: 'kg', price: 120, desc: 'Fresh ripe red tomatoes, juicy and organic.' },
                    { name: 'Onions', category: 'Root Crops', unit: 'kg', price: 155, desc: 'Local red onions, pungent and freshly dug.' },
                    { name: 'Ginger', category: 'Root Crops', unit: 'kg', price: 210, desc: 'Organic ginger rhizomes, intense flavor.' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          name: preset.name,
                          category: preset.category,
                          unit: preset.unit as any,
                          price: preset.price,
                          description: preset.desc
                        });
                      }}
                      className="px-3 py-2.5 bg-white hover:bg-primary/5 text-slate-700 hover:text-primary font-bold text-[9px] uppercase tracking-wider rounded-xl border border-stone-200 hover:border-primary/40 transition-all select-none active:scale-95"
                    >
                      +{preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 group">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Product Name</label>
                <input 
                  type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Description</label>
                <textarea 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
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
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Stock</label>
                <input 
                  type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Category</label>
                <select 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
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
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
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
                  className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium" 
                  required
                />
                <p className="mt-2 text-[10px] text-slate-400 italic px-1">Transparency is key. Let buyers know exactly when this was harvested.</p>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Product Images</label>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  {/* Dedicated hardware-integrated camera release trigger */}
                  <div className="relative h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer border-2 border-white shadow-lg shadow-amber-500/10 select-none">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleMultipleFiles(files);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.508 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.065-.75-1.995-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-xs uppercase tracking-widest font-black">Open Phone Camera</span>
                  </div>

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
