import React from 'react';
import { ShoppingCart, User, Sprout, Search, MapPin, Home, History, LayoutDashboard, MessageSquare, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useConfirm } from '../context/ConfirmContext';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onAuthClick: () => void;
  onCartClick: () => void;
  setView: (view: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages') => void;
  onDashboardTabChange?: (tab: 'inventory' | 'feedback' | 'messages' | 'community' | 'logs') => void;
  onSearch?: (query: string) => void;
  onOrderNotificationClick?: (orderId: string) => void;
  nearMeEnabled?: boolean;
  userCoords?: { lat: number, lng: number } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onAuthClick, 
  onCartClick, 
  setView, 
  onDashboardTabChange, 
  onSearch, 
  onOrderNotificationClick,
  nearMeEnabled,
  userCoords
}) => {
  const { user, profile, logout } = useAuth();
  const { items } = useCart();
  const { confirm } = useConfirm();
  const [searchValue, setSearchValue] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [displayLocation, setDisplayLocation] = React.useState('Metro Manila, PH');

  React.useEffect(() => {
    if (nearMeEnabled && userCoords) {
      const { lat, lng } = userCoords;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.municipality || data.address.city_district || data.address.village || data.address.province || data.address.state || 'Local Area';
            setDisplayLocation(`${city}, PH (Near Me)`);
          } else {
            setDisplayLocation(`Coords: ${lat.toFixed(2)}, ${lng.toFixed(2)} (Near Me)`);
          }
        })
        .catch(() => {
          setDisplayLocation(`GPS: ${lat.toFixed(2)}, ${lng.toFixed(2)} (Near Me)`);
        });
    } else if (profile?.address) {
      setDisplayLocation(profile.address);
    } else {
      setDisplayLocation('Metro Manila, PH');
    }
  }, [nearMeEnabled, userCoords, profile?.address]);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!user || !profile) return;

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
      console.log('Notifications fetch error:', err);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
    setView('home'); // Ensure we are on home view when searching
  };

  return (
    <>
      <nav className="h-16 md:h-20 fixed top-0 w-full z-50 bg-primary/95 backdrop-blur-xl border-b border-primary/20 shadow-lg px-4 sm:px-8 flex items-center">
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            if (user) {
              if (profile?.role === 'admin') setView('admin-dashboard');
              else if (profile?.role === 'farmer') setView('dashboard');
              else setView('home');
            } else {
              setView('landing');
            }
            setSearchValue('');
            onSearch?.('');
          }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2.5"
          >
            <img 
               src="/logo.png" 
              alt="FarmToHome Logo" 
              className="h-9 w-9 md:h-11 md:w-11 object-contain rounded-xl shadow-inner border border-white/10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-xl md:text-2xl font-serif italic font-bold tracking-tight text-white">
              FarmToHome
            </span>
          </motion.div>
        </div>

        {!user ? (
          <>
            <div className="hidden lg:flex items-center gap-10">
              <button 
                onClick={() => {
                  setView('landing');
                  setTimeout(() => {
                    document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} 
                className="text-[10px] font-black text-white/80 hover:text-white uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95"
              >
                Our Story
              </button>
              <button onClick={() => setView('home')} className="text-[10px] font-black text-white/80 hover:text-white uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">Marketplace</button>
              <button 
                onClick={() => {
                  setView('landing');
                  setTimeout(() => {
                    document.getElementById('about-us')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} 
                className="text-[10px] font-black text-white/80 hover:text-white uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95"
              >
                About Us
              </button>
              <div className="h-4 w-px bg-white/20 mx-2" />
              <button onClick={onAuthClick} className="text-[10px] font-black text-white/80 hover:text-white uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">Sign In</button>
              <button 
                onClick={onAuthClick}
                className="px-8 py-3.5 bg-accent text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-md border border-white/15"
              >
                Start Order
              </button>
            </div>

            {/* Mobile hamburger menu toggle */}
            <div className="flex lg:hidden items-center gap-3">
              <button 
                onClick={() => setView('home')}
                className="px-3 py-1.5 text-white text-[9px] font-black uppercase tracking-[0.2em] hover:text-accent-light transition-all"
              >
                Market
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 bg-white text-primary rounded-xl transition-all shadow-md active:scale-95 border border-slate-100 flex items-center justify-center"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

            {/* Premium mobile drawer dropdown for guest view */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-16 md:top-20 left-4 right-4 bg-primary/95 backdrop-blur-2xl border border-white/20 shadow-2xl p-6 flex flex-col gap-6 z-50 rounded-[2rem] text-white"
                >
                  <div className="flex flex-col gap-1 text-center border-b border-white/10 pb-4">
                    <p className="font-serif italic font-black text-2xl tracking-tighter text-accent">FarmToHome</p>
                    <p className="text-[8px] text-white/50 uppercase tracking-[0.3em] font-bold">Philippines</p>
                  </div>

                  <div className="flex flex-col gap-2 text-center">
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setView('landing');
                        setTimeout(() => {
                          document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }} 
                      className="py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:text-accent transition-all hover:translate-x-1"
                    >
                      Our Story
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setView('home');
                      }} 
                      className="py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:text-accent transition-all hover:translate-x-1"
                    >
                      Marketplace
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setView('landing');
                        setTimeout(() => {
                          document.getElementById('about-us')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }} 
                      className="py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:text-accent transition-all hover:translate-x-1"
                    >
                      About Us
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onAuthClick();
                      }}
                      className="w-full py-4 bg-white text-primary rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-slate-100 active:scale-95 text-center shadow-lg"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onAuthClick();
                      }}
                      className="w-full py-4 bg-accent text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-accent/90 transition-all active:scale-95 text-center shadow-inner border border-white/20"
                    >
                      Start Order
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            <div className="hidden md:flex flex-1 max-w-xl mx-20 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input 
                type="text" 
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search harvests e.g. 'Heirloom Rice'..." 
                className="block w-full pl-14 pr-4 py-4 bg-white/10 border border-white/10 rounded-3xl text-[11px] text-white font-bold uppercase tracking-widest placeholder-white/50 focus:outline-none focus:bg-white/15 focus:ring-4 focus:ring-white/5 transition-all"
              />
            </div>

            <div className="flex items-center gap-4 sm:gap-8">
              <div className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-2xl border border-white/10">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{displayLocation}</span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                {profile?.role === 'buyer' && (
                  <button className="relative p-2.5 text-white/80 hover:text-white transition-all hover:scale-110" onClick={onCartClick}>
                    <ShoppingCart className="w-6 h-6" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-4 ring-primary">
                        {items.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Mobile-Only direct Message icon above */}
                {user && (
                  <div className="flex items-center gap-2 md:gap-4 md:hidden">
                    <button 
                      onClick={() => {
                        if (profile?.role === 'farmer') {
                          onDashboardTabChange?.('messages');
                          setView('dashboard');
                        } else {
                          setView('messages');
                        }
                      }} 
                      className="p-2 text-white/80 hover:text-white transition-all active:scale-95 relative cursor-pointer"
                      aria-label="Messages"
                    >
                      <MessageSquare className="w-6 h-6" />
                    </button>

                    {profile?.role === 'farmer' && (
                      <button 
                        onClick={() => setView('profile')}
                        className="w-8 h-8 rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/20 active:scale-95 transition-all cursor-pointer focus:outline-none shrink-0"
                        aria-label="Edit Profile"
                      >
                        <div className="w-full h-full rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center">
                          {user.photoURL || profile.photoURL ? (
                            <img src={user.photoURL || profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                )}
                
                <div className="h-8 w-px bg-white/20 hidden md:block" />

                {(profile?.role === 'buyer' || profile?.role === 'farmer') && (
                  <div className="relative hidden md:block">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2.5 text-white/80 hover:text-white transition-all hover:scale-110 relative"
                    >
                      <Bell className="w-6 h-6" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-primary rounded-full" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-4 w-80 bg-white rounded-[2.5rem] shadow-2xl border border-border p-6 z-[70] overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-800">Notifications</h3>
                            <button 
                              onClick={async () => {
                                const unread = notifications.filter(n => !n.read);
                                for (const n of unread) {
                                  await updateDoc(doc(db, 'notifications', n.id), { read: true });
                                }
                              }}
                              className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline"
                            >
                              Mark all as read
                            </button>
                          </div>
                          
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {notifications.length === 0 ? (
                              <div className="py-12 text-center">
                                <Bell className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No new notifications</p>
                                <p className="text-[9px] text-slate-400 mt-2 font-medium">We'll alert you here when something happens.</p>
                              </div>
                            ) : (
                              notifications.map((notif) => (
                                  <button 
                                    key={notif.id} 
                                    onClick={async () => {
                                      const nId = notif.id;
                                      const nType = notif.type;
                                      const wasUnread = !notif.read;
                                      
                                      // 1. Close menu immediately
                                      setShowNotifications(false);
                                      
                                      // 2. Perform navigation
                                      if (nType === 'message') {
                                        if (profile?.role === 'farmer') {
                                          onDashboardTabChange?.('messages');
                                          setView('dashboard');
                                        } else {
                                          setView('messages');
                                        }
                                      } else if (nType === 'order') {
                                        if (profile?.role === 'farmer') {
                                          if (notif.relatedId) {
                                            onOrderNotificationClick?.(notif.relatedId);
                                          }
                                          onDashboardTabChange?.('logs');
                                          setView('dashboard');
                                        } else if (profile?.role === 'buyer') {
                                          setView('tracking');
                                        }
                                      } else if (nType === 'system') {
                                        if (profile?.role === 'farmer') {
                                          onDashboardTabChange?.('feedback');
                                          setView('dashboard');
                                        }
                                      }

                                      // 3. Mark as read in background
                                      if (wasUnread) {
                                        try {
                                          await updateDoc(doc(db, 'notifications', nId), { read: true });
                                        } catch (err) {
                                          console.error("Failed to mark notification as read", err);
                                        }
                                      }
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border ${notif.read ? 'bg-slate-50 border-slate-100' : 'bg-accent-light border-primary/10'} transition-all hover:scale-[1.02] active:scale-95 group`}
                                  >
                                  <p className="text-xs font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">{notif.title}</p>
                                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-2">{notif.message}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                      {new Date(notif.createdAt?.toDate?.() || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {!notif.read && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                <div className="h-8 w-px bg-white/20 hidden md:block" />

                <div className="relative group/profile hidden md:block">
                  <button className="flex items-center gap-4 group/btn">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">Member</p>
                      <p className="text-sm font-bold text-white">{profile?.fullName.split(' ')[0]}</p>
                    </div>
                    <div className="w-12 h-12 rounded-[1.25rem] bg-accent-light p-1 group-hover/btn:scale-110 transition-all duration-500 shadow-sm border border-primary/5">
                      <div className="w-full h-full rounded-[1rem] bg-primary/20 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-contain bg-accent-light" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all translate-y-4 group-hover/profile:translate-y-0 z-[60]">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-border p-3 w-64 overflow-hidden">
                      <button 
                        onClick={() => setView('profile')}
                        className="w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-accent-light hover:text-primary flex items-center gap-4 rounded-2xl transition-all group/item hover:translate-x-2"
                      >
                        <User className="w-4 h-4 text-primary group-hover/item:scale-110 group-hover/item:rotate-12 transition-transform" />
                        My Profile
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (profile?.role === 'farmer') {
                            onDashboardTabChange?.('messages');
                            setView('dashboard');
                          } else {
                            setView('messages');
                          }
                        }}
                        className="w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-accent-light hover:text-primary flex items-center gap-4 rounded-2xl transition-all group/item hover:translate-x-2"
                      >
                        <MessageSquare className="w-4 h-4 text-primary group-hover/item:scale-110 group-hover/item:rotate-12 transition-transform" />
                        My Messages
                      </button>
                      
                      {profile?.role === 'buyer' && (
                        <button 
                          onClick={() => setView('tracking')}
                          className="w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-accent-light hover:text-primary flex items-center gap-4 rounded-2xl transition-all group/item hover:translate-x-2"
                        >
                          <History className="w-4 h-4 text-primary group-hover/item:scale-110 group-hover/item:rotate-12 transition-transform" />
                          Order Tracking
                        </button>
                      )}

                      {profile?.role === 'admin' && (
                        <button 
                          onClick={() => setView('admin-dashboard')}
                          className="w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-accent-light hover:text-secondary flex items-center gap-4 rounded-2xl transition-all group/item hover:translate-x-2"
                        >
                          <LayoutDashboard className="w-4 h-4 text-secondary group-hover/item:scale-110 group-hover/item:rotate-12 transition-transform" />
                          Admin Console
                        </button>
                      )}

                      <button 
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Are you sure you want to logout???',
                            message: 'You are logging out from your Farm To Home session. You will need to use your OTP next time you register or log in.',
                            confirmText: 'Yes, Logout',
                            cancelText: 'Cancel',
                            type: 'logout'
                          });
                          if (confirmed) {
                            logout();
                            setView('landing');
                          }
                        }}
                        className="w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/5 flex items-center gap-4 rounded-2xl transition-all group/item hover:translate-x-2"
                      >
                        <Sprout className="w-4 h-4 group-hover/item:rotate-12 group-hover/item:scale-110 transition-transform" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
    </>
  );
};
