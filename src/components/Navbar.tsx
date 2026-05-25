import React from 'react';
import { ShoppingCart, User, Sprout, Search, MapPin, Home, History, LayoutDashboard, MessageSquare, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onAuthClick: () => void;
  onCartClick: () => void;
  setView: (view: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages') => void;
  onDashboardTabChange?: (tab: 'inventory' | 'feedback' | 'messages') => void;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAuthClick, onCartClick, setView, onDashboardTabChange, onSearch }) => {
  const { user, profile, logout } = useAuth();
  const { items } = useCart();
  const [searchValue, setSearchValue] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!user || !profile) return;

    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setNotifications(docs);
        setUnreadCount(docs.filter((n: any) => !n.read).length);
      } catch (err) {
        console.log('Notifications fetch error');
      }
    };

    fetchNotifications();

    // Check every 5 minutes instead of real-time
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, profile]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
    setView('home'); // Ensure we are on home view when searching
  };

  return (
    <>
      <nav className={`z-50 transition-all duration-500 ${
        !user 
          ? `h-16 md:h-20 fixed w-full ${scrolled ? 'bg-primary/95 backdrop-blur-2xl shadow-2xl' : 'bg-transparent border-none'}` 
          : 'h-16 md:h-20 sticky top-0 bg-background/80 backdrop-blur-xl border-b border-white/40 shadow-sm'
      } px-4 sm:px-8 flex items-center`}>
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
            whileHover={{ scale: 1.05 }}
            className="h-10 md:h-12 flex items-center"
          >
            <img 
              src="/logo.png" 
              alt="FarmToHome Logo" 
              className="h-full w-auto object-contain"
              onError={(e) => {
                // Fallback if logo.png is not yet uploaded
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = `text-2xl font-bold tracking-tighter font-serif ${!user ? 'text-white' : 'text-slate-900'}`;
                  span.innerText = 'FarmToHome';
                  parent.appendChild(span);
                }
              }}
            />
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
                className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95"
              >
                Our Story
              </button>
              <button onClick={() => setView('home')} className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">Marketplace</button>
              <button 
                onClick={() => {
                  setView('landing');
                  setTimeout(() => {
                    document.getElementById('about-us')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} 
                className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95"
              >
                About Us
              </button>
              <div className="h-4 w-px bg-white/20 mx-2" />
              <button onClick={onAuthClick} className="text-[10px] font-black text-white uppercase tracking-[0.4em] hover:text-accent-light transition-all hover:translate-y-[-2px] active:scale-95">Sign In</button>
              <button 
                onClick={onAuthClick}
                className="px-8 py-3.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-2xl active:scale-95 border-2 border-white/20"
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
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search harvests e.g. 'Heirloom Rice'..." 
                className="block w-full pl-14 pr-4 py-4 bg-slate-50 border border-border rounded-3xl text-[11px] font-bold uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>

            <div className="flex items-center gap-4 sm:gap-8">
              <div className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-accent-light rounded-2xl border border-primary/10">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Metro Manila, PH</span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                {profile?.role === 'buyer' && (
                  <button className="relative p-2.5 text-slate-400 hover:text-secondary transition-all hover:scale-110" onClick={onCartClick}>
                    <ShoppingCart className="w-6 h-6" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-4 ring-white">
                        {items.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Mobile-Only direct Message icon above */}
                {user && (
                  <button 
                    onClick={() => {
                      if (profile?.role === 'farmer') {
                        onDashboardTabChange?.('messages');
                        setView('dashboard');
                      } else {
                        setView('messages');
                      }
                    }} 
                    className="block md:hidden p-2.5 text-slate-400 hover:text-primary transition-all active:scale-95"
                    aria-label="Messages"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </button>
                )}
                
                <div className="h-8 w-px bg-border hidden md:block" />

                {(profile?.role === 'buyer' || profile?.role === 'farmer') && (
                  <div className="relative hidden md:block">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2.5 text-slate-400 hover:text-primary transition-all hover:scale-110 relative"
                    >
                      <Bell className="w-6 h-6" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
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
                                          onDashboardTabChange?.('inventory');
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
                
                <div className="h-8 w-px bg-border hidden md:block" />

                <div className="relative group/profile hidden md:block">
                  <button className="flex items-center gap-4 group/btn">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Member</p>
                      <p className="text-sm font-bold text-slate-900">{profile?.fullName.split(' ')[0]}</p>
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
                        onClick={() => setView('messages')}
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
                        onClick={() => {
                          logout();
                          setView('landing');
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
