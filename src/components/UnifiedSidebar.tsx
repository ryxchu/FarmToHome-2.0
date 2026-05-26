import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Radio, Package, MessageSquare, User, 
  LayoutDashboard, Star, Globe, Users, TrendingUp, Settings, Sprout,
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { db } from '../lib/firebase';
import { query, collection, where, onSnapshot } from 'firebase/firestore';

interface UnifiedSidebarProps {
  currentView: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages';
  setView: (view: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages') => void;
  marketViewMode: 'shop' | 'community';
  setMarketViewMode: (mode: 'shop' | 'community') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  farmerTab: 'inventory' | 'feedback' | 'messages' | 'community';
  setFarmerTab: (tab: 'inventory' | 'feedback' | 'messages' | 'community') => void;
  adminTab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system';
  setAdminTab: (tab: 'users' | 'marketplace' | 'logistics' | 'analytics' | 'system') => void;
  nearMeEnabled: boolean;
  onNearMeToggle: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  currentView,
  setView,
  marketViewMode,
  setMarketViewMode,
  selectedCategory,
  setSelectedCategory,
  farmerTab,
  setFarmerTab,
  adminTab,
  setAdminTab,
  nearMeEnabled,
  onNearMeToggle
}) => {
  const { user, profile, logout } = useAuth();
  const { isOpen, setIsOpen } = useCart();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'message'),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessages(snapshot.size);
    }, (err) => {
      console.log('Sidebar messages count fetch error:', err);
    });
    return () => unsubscribe();
  }, [user]);

  // Determine current role: 'admin' | 'farmer' | 'buyer' (fallback if guest)
  const role = profile?.role || 'buyer';

  // Define sidebar links based on active role
  const getNavItems = () => {
    if (!user) {
      // Public / Guest Visitor Dashboard Map
      return [
        {
          id: 'market-shop',
          label: 'Marketplace',
          icon: ShoppingBag,
          active: currentView === 'home' && marketViewMode === 'shop',
          onClick: () => {
            setView('home');
            setMarketViewMode('shop');
          }
        },
        {
          id: 'market-community',
          label: 'Community Feed',
          icon: Radio,
          active: currentView === 'home' && marketViewMode === 'community',
          onClick: () => {
            setView('home');
            setMarketViewMode('community');
          }
        }
      ];
    }

    if (role === 'admin') {
      return [
        {
          id: 'admin-users',
          label: 'User Manager',
          icon: Users,
          active: currentView === 'admin-dashboard' && adminTab === 'users',
          onClick: () => {
            setView('admin-dashboard');
            setAdminTab('users');
          }
        },
        {
          id: 'admin-market',
          label: 'Product Approvals',
          icon: ShoppingBag,
          active: currentView === 'admin-dashboard' && adminTab === 'marketplace',
          onClick: () => {
            setView('admin-dashboard');
            setAdminTab('marketplace');
          }
        },
        {
          id: 'admin-logistics',
          label: 'Logistics Tracker',
          icon: Package,
          active: currentView === 'admin-dashboard' && adminTab === 'logistics',
          onClick: () => {
            setView('admin-dashboard');
            setAdminTab('logistics');
          }
        },
        {
          id: 'admin-analytics',
          label: 'System Analytics',
          icon: TrendingUp,
          active: currentView === 'admin-dashboard' && adminTab === 'analytics',
          onClick: () => {
            setView('admin-dashboard');
            setAdminTab('analytics');
          }
        },
        {
          id: 'admin-system',
          label: 'Platform Setup',
          icon: Settings,
          active: currentView === 'admin-dashboard' && adminTab === 'system',
          onClick: () => {
            setView('admin-dashboard');
            setAdminTab('system');
          }
        },
        {
          id: 'admin-buyer-market',
          label: 'Platform Front',
          icon: Globe,
          active: currentView === 'home',
          onClick: () => {
            setView('home');
          }
        },
        {
          id: 'admin-profile',
          label: 'My Account',
          icon: User,
          active: currentView === 'profile',
          onClick: () => {
            setView('profile');
          }
        }
      ];
    }

    if (role === 'farmer') {
      return [
        {
          id: 'farmer-dashboard',
          label: 'Catalog & Stats',
          icon: LayoutDashboard,
          active: (currentView === 'dashboard' || currentView === 'home') && farmerTab === 'inventory',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('inventory');
          }
        },
        {
          id: 'farmer-feedback',
          label: 'Evaluations',
          icon: Star,
          active: currentView === 'dashboard' && farmerTab === 'feedback',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('feedback');
          }
        },
        {
          id: 'farmer-messages',
          label: 'Client Inbox',
          icon: MessageSquare,
          active: currentView === 'dashboard' && farmerTab === 'messages',
          badge: unreadMessages,
          onClick: () => {
            setView('dashboard');
            setFarmerTab('messages');
          }
        },
        {
          id: 'farmer-community',
          label: 'Community Feed',
          icon: Radio,
          active: currentView === 'dashboard' && farmerTab === 'community',
          onClick: () => {
            setView('dashboard');
            setFarmerTab('community');
          }
        },
        {
          id: 'farmer-buyer-market',
          label: 'Open Market',
          icon: Globe,
          active: currentView === 'home' && marketViewMode === 'shop',
          onClick: () => {
            setView('home');
            setMarketViewMode('shop');
          }
        },
        {
          id: 'farmer-profile',
          label: 'Profile / Hub',
          icon: User,
          active: currentView === 'profile',
          onClick: () => {
            setView('profile');
          }
        }
      ];
    }

    // Default: Buyer Role
    return [
      {
        id: 'buyer-shop',
        label: 'Local Market',
        icon: ShoppingBag,
        active: currentView === 'home' && marketViewMode === 'shop',
        onClick: () => {
          setView('home');
          setMarketViewMode('shop');
        }
      },
      {
        id: 'buyer-community',
        label: 'Community Feed',
        icon: Radio,
        active: currentView === 'home' && marketViewMode === 'community',
        onClick: () => {
          setView('home');
          setMarketViewMode('community');
        }
      },
      {
        id: 'buyer-orders',
        label: 'My Orders',
        icon: Package,
        active: currentView === 'tracking',
        onClick: () => {
          setView('tracking');
        }
      },
      {
        id: 'buyer-messages',
        label: 'Seller Chats',
        icon: MessageSquare,
        active: currentView === 'messages',
        badge: unreadMessages,
        onClick: () => {
          setView('messages');
        }
      },
      {
        id: 'buyer-profile',
        label: 'Account Hub',
        icon: User,
        active: currentView === 'profile',
        onClick: () => {
          setView('profile');
        }
      }
    ];
  };

  const navItems = getNavItems();

  const categories = [
    { id: 'All', icon: '🌳', label: 'All Crops' },
    { id: 'Vegetables', icon: '🥬', label: 'Vegetables' },
    { id: 'Fruits', icon: '🍎', label: 'Fruits' },
    { id: 'Root Crops', icon: '🍠', label: 'Root Crops' },
    { id: 'Herbs & Spices', icon: '🌿', label: 'Herbs & Spices' },
    { id: 'Grains', icon: '🌾', label: 'Grains' }
  ];

  return (
    <aside className={`hidden lg:flex ${isCollapsed ? 'w-20 px-3 py-6' : 'w-72 p-6'} bg-[#F5F4F0] border-r border-[#eceae3] flex-col shrink-0 h-full select-none transition-all duration-300 relative`}>
      {/* Brand Logo Header */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-3 mb-10 mt-2">
          <div className="w-11 h-11 bg-white border border-[#eceae3] rounded-full flex items-center justify-center shadow-sm">
            <Sprout className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <button 
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar"
            className="p-1 px-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-white shadow-sm border border-[#eceae3] rounded-full transition-all active:scale-95 flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-10 mt-2 px-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white border border-[#eceae3] rounded-full flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-sans">FarmToHome</h1>
              <p className="text-[9px] text-[#b87333] font-bold uppercase tracking-widest">Philippines</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(true)}
            title="Collapse Sidebar"
            className="p-1.5 hover:bg-white border border-transparent hover:border-[#eceae3] rounded-full transition-all text-slate-500 hover:text-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Role Navigation Section */}
      <div className={`flex-1 overflow-y-auto no-scrollbar space-y-8 pr-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {isCollapsed ? (
          <nav className="space-y-4 w-full flex flex-col items-center">
            {navItems.map((item: any) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  title={item.label}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border relative ${
                    item.active
                      ? 'bg-primary text-white border-primary scale-110'
                      : 'bg-white text-[#362511]/70 border-[#eceae3] hover:scale-110 hover:text-primary hover:bg-white'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <>
            <div>
              <h3 className="text-[9px] font-bold text-[#362511]/50 uppercase tracking-[0.25em] mb-4 px-2">
                {role === 'admin' ? 'Control Panel' : role === 'farmer' ? 'Farmer Suite' : 'Navigation'}
              </h3>
              <nav className="space-y-1.5">
                {navItems.map((item: any) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-4 p-2 pl-2 pr-6 rounded-full transition-all duration-300 pointer group relative ${
                        item.active
                          ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-[#eceae3] font-bold scale-[1.02]'
                          : 'hover:bg-white/40 font-medium'
                      }`}
                    >
                      {/* Circular Icon Container */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border relative ${
                        item.active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-[#362511]/70 border-[#eceae3] group-hover:scale-110 group-hover:text-primary'
                      }`}>
                        <IconComp className="w-4 h-4" />
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {/* Row Text Label */}
                      <span className={`text-xs uppercase tracking-widest text-left ${
                        item.active ? 'text-primary' : 'text-slate-500 group-hover:text-slate-800'
                      }`}>
                        {item.label}
                      </span>
                      {/* Subtle right accent ribbon for active item */}
                      {item.active && (
                        <div className="absolute right-3 w-1.5 h-6 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Categories Section - Only show for Buyers or Guests browsing Market */}
            {role === 'buyer' && currentView === 'home' && marketViewMode === 'shop' && (
              <div className="pt-2">
                <h3 className="text-[9px] font-bold text-[#362511]/50 uppercase tracking-[0.25em] mb-4 px-2">
                  Sectors & Crops
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setView('home');
                        }}
                        className={`w-full flex items-center gap-4 p-2 pl-3 rounded-full transition-all duration-300 select-none ${
                          isSelected
                            ? 'bg-white/80 shadow-inner border border-[#eceae3] font-bold'
                            : 'hover:bg-white/40'
                        }`}
                      >
                        <div className="text-base">{cat.icon}</div>
                        <span className={`text-[10px] uppercase tracking-widest ${
                          isSelected ? 'text-primary font-bold' : 'text-slate-500'
                        }`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eco Metrics or Farmer Stats Area at Bottom of Container */}
            {role === 'buyer' && (
              <div className="mt-4 px-2 pt-2">
                <div className="bg-[#EBECE7] rounded-3xl p-5 border border-[#eceae3] shadow-inner relative overflow-hidden group">
                  <p className="text-[8px] uppercase font-bold text-[#4c6640] mb-2 tracking-[0.2em]">Carbon Footprint Saved</p>
                  <p className="text-2xl font-bold mb-1 tracking-tight font-serif italic text-primary">
                    12.5 <span className="text-xs not-italic opacity-60">kg</span>
                  </p>
                  <p className="text-[8px] leading-relaxed text-slate-500 font-medium font-mono">
                    100% direct-trade freight.
                  </p>
                </div>
              </div>
            )}

            {role === 'farmer' && (
              <div className="mt-4 px-2 pt-2">
                <div className="bg-[#EBECE7] rounded-3xl p-5 border border-[#eceae3] shadow-inner relative overflow-hidden group">
                  <p className="text-[8px] uppercase font-bold text-[#4c6640] mb-2 tracking-[0.2em] animate-pulse">Hub Advisory</p>
                  <p className="text-[10px] font-medium text-slate-600 leading-relaxed">
                    Organic price index is up <strong className="text-primary font-bold">+12%</strong>. Keep listing fresh yields!
                  </p>
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="mt-4 px-2 pt-2">
                <div className="bg-[#EBECE7] rounded-3xl p-5 border border-[#eceae3] shadow-inner relative overflow-hidden group">
                  <p className="text-[8px] uppercase font-bold text-secondary mb-2 tracking-[0.2em]">Platform Status</p>
                  <p className="text-[9px] font-bold text-slate-600 leading-none mb-1">
                    MEMBERS: <span className="text-primary font-bold">ACTIVE</span>
                  </p>
                  <p className="text-[9px] text-[#b87333] font-bold">INTEGRATED SMS: OK</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Geolocation Button & Logout at Bottom of Sidebar */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-4 pt-5 border-t border-[#eceae3] w-full mt-auto">
          {role === 'buyer' && (
            <button 
              onClick={onNearMeToggle}
              title={`Near Me Filter: ${nearMeEnabled ? 'Active' : 'Disabled'}`}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${
                nearMeEnabled 
                  ? 'border-primary bg-[#E9EBE6] text-primary scale-110' 
                  : 'border-[#eceae3] bg-white text-slate-400 hover:border-slate-300'
              }`}
            >
              <Globe className="w-4 h-4" />
            </button>
          )}

          {user && (
            <button 
              onClick={logout}
              title="Log Out"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-rose-500 shadow-sm border border-[#eceae3] hover:bg-rose-50 hover:border-rose-100 transition-all duration-300 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-auto space-y-3 pt-5 border-t border-[#eceae3] w-full">
          {role === 'buyer' && (
            <button 
              onClick={onNearMeToggle}
              className={`w-full rounded-2xl p-3.5 border flex items-center gap-3 transition-all text-left group select-none ${
                nearMeEnabled 
                  ? 'border-primary bg-[#E9EBE6] shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                nearMeEnabled ? 'bg-primary text-white animate-bounce' : 'bg-[#F5F4F0] text-slate-400 group-hover:scale-110'
              }`}>
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-800 uppercase tracking-widest">Near Me Filter</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${
                  nearMeEnabled ? 'text-primary' : 'text-slate-400'
                }`}>
                  {nearMeEnabled ? 'Active' : 'Disabled'}
                </p>
              </div>
            </button>
          )}

          {user && (
            <button 
              onClick={logout}
              className="w-full flex items-center gap-4 p-2 pl-2 pr-6 rounded-full transition-all duration-300 hover:bg-rose-50 border border-transparent hover:border-rose-100 font-medium text-rose-500 group"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-rose-500 shadow-sm border border-[#eceae3] group-hover:scale-110 group-hover:text-rose-600 transition-all duration-300 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-xs uppercase tracking-widest text-[#362511]/70 group-hover:text-rose-600">
                Log Out
              </span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
