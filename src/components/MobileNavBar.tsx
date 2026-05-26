import React, { useState, useEffect } from 'react';
import { 
  Home, ShoppingBag, User, Bell, MessageSquare, X, ChevronRight, AlertCircle, Package, ClipboardList, Plus, Radio 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';

interface MobileNavBarProps {
  currentView: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages';
  setView: (view: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages') => void;
  marketViewMode: 'shop' | 'community';
  setMarketViewMode: (mode: 'shop' | 'community') => void;
  farmerTab: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs';
  setFarmerTab: (tab: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs') => void;
  adminTab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system';
  setAdminTab: (tab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system') => void;
  onCartClick?: () => void;
  onAuthClick?: () => void;
  onOrderNotificationClick?: (orderId: string) => void;
  onAddClick?: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentView,
  setView,
  marketViewMode,
  setMarketViewMode,
  farmerTab,
  setFarmerTab,
  adminTab,
  setAdminTab,
  onCartClick,
  onAuthClick,
  onOrderNotificationClick,
  onAddClick
}) => {
  const { user, profile } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = profile?.role || 'buyer';

  // Live Notification Fetch
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setNotifications(docs);
      setUnreadCount(docs.filter((n: any) => !n.read).length);
    }, (err) => {
      console.log('Mobile notifications fetch error:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotifClick = async (notif: any) => {
    const nId = notif.id;
    const nType = notif.type;
    const wasUnread = !notif.read;

    // 1. Close drawer
    setShowNotifications(false);

    // 2. Perform exact matched navigation
    if (nType === 'message') {
      if (role === 'farmer') {
        setFarmerTab('messages');
        setView('dashboard');
      } else {
        setView('messages');
      }
    } else if (nType === 'order') {
      if (role === 'farmer') {
        if (notif.relatedId) {
          onOrderNotificationClick?.(notif.relatedId);
        }
        setFarmerTab('logs');
        setView('dashboard');
      } else if (role === 'buyer') {
        setView('tracking');
      }
    } else if (nType === 'system') {
      if (role === 'farmer') {
        setFarmerTab('feedback');
        setView('dashboard');
      }
    }

    // 3. Mark as read in Firestore
    if (wasUnread) {
      try {
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === nId ? { ...n, read: true } : n));
        await updateDoc(doc(db, 'notifications', nId), { read: true });
      } catch (err) {
        console.error("Failed to mark mobile notification as read", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const n of unread) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (err) {
        console.error("Failed to mark all as read", err);
      }
    }
  };

  const navItems = role === 'farmer' 
    ? [
        {
          id: 'store',
          label: 'Store',
          icon: Home,
          active: currentView === 'dashboard' && farmerTab === 'inventory',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('inventory');
          }
        },
        {
          id: 'logs',
          label: 'Logs',
          icon: ClipboardList,
          active: currentView === 'dashboard' && farmerTab === 'logs',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('logs');
          }
        },
        {
          id: 'add-item',
          label: 'Add Item',
          icon: Plus,
          customFAB: true,
          onClick: () => {
            if (onAddClick) {
              onAddClick();
            } else {
              window.dispatchEvent(new CustomEvent('open-add-product-modal'));
            }
          }
        },
        {
          id: 'community',
          label: 'Feed',
          icon: Radio,
          active: currentView === 'dashboard' && farmerTab === 'community',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('community');
          }
        },
        {
          id: 'notification',
          label: 'Alerts',
          icon: Bell,
          active: showNotifications,
          badge: unreadCount,
          onClick: () => {
            setShowNotifications(true);
          }
        }
      ]
    : role === 'admin'
    ? [
        {
          id: 'home',
          label: 'Admin Hub',
          icon: Home,
          active: currentView === 'admin-dashboard',
          onClick: () => {
            setView('admin-dashboard');
          }
        },
        {
          id: 'notification',
          label: 'Alerts',
          icon: Bell,
          active: showNotifications,
          badge: unreadCount,
          onClick: () => {
            setShowNotifications(true);
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          active: currentView === 'profile',
          onClick: () => {
            setView('profile');
          }
        }
      ]
    : [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          active: currentView === 'landing' || (currentView === 'home' && marketViewMode === 'community'),
          onClick: () => {
            if (user) {
              setView('home');
              setMarketViewMode('community');
            } else {
              setView('landing');
            }
          }
        },
        {
          id: 'marketplace',
          label: 'Marketplace',
          icon: ShoppingBag,
          active: currentView === 'home' && marketViewMode === 'shop',
          onClick: () => {
            setView('home');
            setMarketViewMode('shop');
          }
        },
        {
          id: 'tracking',
          label: 'My Orders',
          icon: Package,
          active: currentView === 'tracking',
          onClick: () => {
            if (user) {
              setView('tracking');
            } else if (onAuthClick) {
              onAuthClick();
            }
          }
        },
        {
          id: 'notification',
          label: 'Alerts',
          icon: Bell,
          active: showNotifications,
          badge: unreadCount,
          onClick: () => {
            if (user) {
              setShowNotifications(true);
            } else if (onAuthClick) {
              onAuthClick();
            }
          }
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          active: currentView === 'profile',
          onClick: () => {
            if (user) {
              setView('profile');
            } else if (onAuthClick) {
              onAuthClick();
            }
          }
        }
      ];

  return (
    <>
      <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/60 pt-2.5 pb-6 text-slate-600 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] z-[80] lg:hidden grid ${
        role === 'farmer' ? 'grid-cols-5 text-[10px] uppercase font-bold text-center tracking-wider' : (navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4')
      } w-full px-1 justify-items-center items-center`}>
        {navItems.map((item: any) => {
          const IconComp = item.icon;
          
          if (item.customFAB) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -translate-y-4 relative select-none z-[90] active:scale-95 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(16,185,129,0.4)] border-4 border-white">
                  <IconComp className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 mt-1 block">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 py-1 w-full text-center transition-all duration-300 relative select-none ${
                item.active 
                  ? 'scale-105 font-extrabold text-primary' 
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              <div className="relative">
                <IconComp className={`w-5.5 h-5.5 ${item.active ? 'text-primary' : 'text-slate-400'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-white animate-scale-in">
                    {item.badge}
                  </span>
                )}
              </div>
              
              <span className={`text-[10px] font-bold uppercase tracking-tight ${item.active ? 'text-primary' : 'text-slate-400'}`}>
                <span className="block sm:hidden">
                  {item.id === 'marketplace' ? 'Market' : item.id === 'tracking' ? 'Orders' : item.id === 'notification' ? 'Alerts' : item.label}
                </span>
                <span className="hidden sm:block">
                  {item.label}
                </span>
              </span>
              
              {item.active && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Bottom sheet notification drawer for One-handed mobile experience */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[90] lg:hidden"
              onClick={() => setShowNotifications(false)}
            />

            {/* Notification Drawer Sheet */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[75vh] bg-stone-50 rounded-t-[2.5rem] shadow-2xl p-6 pb-12 z-[100] lg:hidden flex flex-col border-t border-stone-200"
            >
              {/* Touch handle */}
              <div className="w-12 h-1.5 bg-stone-300/80 rounded-full mx-auto mb-5 cursor-pointer shrink-0" onClick={() => setShowNotifications(false)} />

              <div className="flex items-center justify-between mb-5 shrink-0 px-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-stone-850">Alerts & Updates</h3>
                  <p className="text-[9.5px] text-stone-450 font-bold uppercase tracking-widest">Keep up with harvest schedules</p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Clear All Badge
                  </button>
                )}
              </div>

              {/* Notification Scroll List Area */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
                {notifications.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 border border-stone-200/50">
                      <Bell className="w-6 h-6 text-stone-400" />
                    </div>
                    <p className="text-xs font-black text-stone-700 uppercase tracking-widest">No Alerts On Hand</p>
                    <p className="text-[10px] font-medium text-stone-400 mt-1 max-w-[200px] mx-auto">We'll alert you immediately when orders, messages, or crops update.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button 
                      key={notif.id} 
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full text-left p-4.5 rounded-2.5xl transition-all border block relative ${
                        notif.read 
                          ? 'bg-white border-stone-150 text-stone-800' 
                          : 'bg-primary/5 border-primary/20 text-stone-900 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-1">
                        <span className="text-xs font-extrabold tracking-tight leading-tight block">{notif.title}</span>
                        {!notif.read && (
                          <span className="shrink-0 w-2.5 h-2.5 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-stone-500 leading-normal font-medium mb-2.5">{notif.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest font-mono">
                          {new Date(notif.createdAt?.toDate?.() || notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt?.toDate?.() || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-0.5">
                          View details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
