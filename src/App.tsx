/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { BuyerHome } from './pages/BuyerHome';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { ProductDetail } from './pages/ProductDetail';
import { Profile } from './pages/Profile';
import { FarmerProfile } from './pages/FarmerProfile';
import { Messages } from './pages/Messages';
import { Cart } from './components/Cart';
import { MyOrders as OrderTracking } from './pages/OrderTracking';
import { AIChatbot } from './components/AIChatbot';
import { InfoModal, InfoSectionType } from './components/InfoModal';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Search, ShoppingBag, Radio, Lock, MapPin } from 'lucide-react';
import { useCart } from './context/CartContext';
import { seedProducts, cleanupDuplicates } from './lib/seed';
import { UnifiedSidebar } from './components/UnifiedSidebar';
import { MobileNavBar } from './components/MobileNavBar';

const SideNavLink: React.FC<{ icon: string; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-xs transition-all group ${
      active 
        ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' 
        : 'text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-lg hover:translate-x-1'
    }`}
  >
    <span className={`text-xl transition-all duration-300 ${active ? 'scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-125'}`}>{icon}</span>
    <span className="uppercase tracking-widest">{label}</span>
  </button>
);

import { SystemConfig } from './types';
import { db, handleFirestoreError, OperationType, isQuotaError, isOfflineError, safeSetItem } from './lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';

function AppContent() {
  const { 
    user, 
    profile, 
    loading, 
    logout, 
    showAuthModal, 
    setShowAuthModal, 
    authVariant, 
    setAuthVariant,
    openAuth,
    refreshProfile
  } = useAuth();
  const { isOpen: showCart, setIsOpen: setShowCart } = useCart();
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalSection, setInfoModalSection] = useState<InfoSectionType>('about');
  
  useEffect(() => {
    if (profile?.status === 'banned') {
      alert('Your account has been banned from the FarmToHome ecosystem.');
      logout();
      setCurrentView('landing');
    }
  }, [profile, logout]);
  
  const [currentView, setCurrentView] = useState<'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages'>('landing');
  const [marketViewMode, setMarketViewMode] = useState<'shop' | 'community'>('shop');
  const [dashboardTab, setDashboardTab] = useState<'inventory' | 'feedback' | 'messages' | 'community'>('inventory');
  const [adminTab, setAdminTab] = useState<'users' | 'marketplace' | 'logistics' | 'analytics' | 'system'>('users');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dbInterrupted, setDbInterrupted] = useState<{ isQuota: boolean; isOffline: boolean; message: string } | null>(null);

  useEffect(() => {
    const handleInterrupt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDbInterrupted({
        isQuota: detail?.isQuota ?? false,
        isOffline: detail?.isOffline ?? false,
        message: detail?.message ?? ''
      });
    };

    window.addEventListener('firestore-service-interrupted', handleInterrupt);
    return () => window.removeEventListener('firestore-service-interrupted', handleInterrupt);
  }, []);

  const handleNearMeClick = () => {
    if (nearMeEnabled) {
      setNearMeEnabled(false);
      setUserCoords(profile?.coordinates || null);
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setNearMeEnabled(true);
        setSelectedCategory('All');
        setCurrentView('home');
      },
      (error) => {
        alert('Please enable location access to see harvests near you.');
        console.error(error);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentView('home');
  };

  const [wasLoggedIn, setWasLoggedIn] = useState(false);
  
  useEffect(() => {
    // Global check to seed at least once if marketplace is empty
    const checkAndSeed = async () => {
      if (!user || profile?.role !== 'admin') return;
      try {
        await cleanupDuplicates();
        const q = query(collection(db, 'products'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          seedProducts().catch(console.error);
        }
      } catch (err) {
        console.error("Seed check failed:", err);
      }
    };
    checkAndSeed();
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      setWasLoggedIn(true);

      // Seed products if user is a farmer
      if (profile.role === 'farmer') {
        seedProducts(user.uid).catch(console.error);
      }

      if (profile.coordinates) {
        setUserCoords(profile.coordinates);
      }
      if (currentView === 'landing') {
        if (profile.role === 'admin') {
          setCurrentView('admin-dashboard');
        } else if (profile.role === 'farmer') {
          setCurrentView('dashboard');
        } else {
          setCurrentView('home');
        }
      }
    } else if (!user && wasLoggedIn) {
      // User just logged out
      setCurrentView('landing');
      setWasLoggedIn(false);
    }
  }, [user, profile, currentView, wasLoggedIn]);

  useEffect(() => {
    const fetchConfig = async () => {
      // Try local cache first
      const cached = localStorage.getItem('system_config');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setSystemConfig(parsed);
          }
        } catch (e) {
          localStorage.removeItem('system_config');
        }
      }

      try {
        const docSnap = await getDoc(doc(db, 'system', 'config'));
        if (docSnap.exists()) {
          const config = docSnap.data() as SystemConfig;
          setSystemConfig(config);
          safeSetItem('system_config', JSON.stringify(config));
        } else {
          // If config doc doesn't exist, use a basic default
          const defaultConfig: SystemConfig = {
            maintenanceMode: false,
            broadcastMessage: '',
            broadcastType: 'info',
            platformCommissionRate: 5,
            lastUpdated: new Date().toISOString()
          };
          setSystemConfig(defaultConfig);
        }
      } catch (error) {
        if (isQuotaError(error) || isOfflineError(error)) {
          // If we have cached version, use it and don't throw
          if (localStorage.getItem('system_config')) {
            console.warn("Using cached system config due to quota or offline status");
            try {
              const parsed = JSON.parse(localStorage.getItem('system_config')!);
              setSystemConfig(parsed);
              return;
            } catch (e) {}
          }

          // If no cache, use minimal defaults to keep the app working
          console.error("Quota reached or client is offline - Using default system config");
          setSystemConfig({
            maintenanceMode: false,
            broadcastMessage: 'FarmToHome is currently running in offline checkout/cached mode.',
            broadcastType: 'info',
            platformCommissionRate: 5,
            lastUpdated: new Date().toISOString()
          });
        } else {
          handleFirestoreError(error, OperationType.GET, 'system/config');
        }
      }
    };
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const isMaintenance = systemConfig?.maintenanceMode && profile?.role !== 'admin';

  if (isMaintenance) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 font-serif italic mb-4 tracking-tighter">System Sanitization</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8 leading-relaxed">
            The FarmToHome ecosystem is currently undergoing scheduled organic growth (maintenance). We'll be back shortly.
          </p>
          <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xl clay-shadow">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 font-serif">Official Transmission</p>
            <p className="text-sm font-medium text-slate-600">{systemConfig?.broadcastMessage || "System optimization in progress."}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <AnimatePresence>
        {systemConfig?.broadcastMessage && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`${
              systemConfig.broadcastType === 'emergency' ? 'bg-red-500' : 
              systemConfig.broadcastType === 'warning' ? 'bg-amber-500' : 'bg-secondary'
            } text-white px-6 py-3 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] relative z-[99]`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{systemConfig.broadcastMessage}</span>
          </motion.div>
        )}
        {dbInterrupted && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`bg-[#ffefe6]/95 text-[#6c3a1e] border-b-2 border-accent-light px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider relative z-[100]`}
          >
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 animate-pulse text-accent shrink-0" />
              <span className="text-center sm:text-left leading-snug">
                {dbInterrupted.isQuota 
                  ? "Cooperative Hub Sandbox: Demonstration server quota limits reached. Viewing cached catalogs and active ledgers." 
                  : "Agrarian Hub Lanes: Sourced route operating in cached offline lane. Activities will validate once connection restabilizes."}
              </span>
            </div>
            <button 
              onClick={() => setDbInterrupted(null)}
              className="px-3.5 py-1.5 bg-accent-light text-primary hover:bg-white rounded-xl tracking-widest text-[8.5px] uppercase border border-primary/5 shadow-sm transition-all text-xs shrink-0 cursor-pointer active:scale-95"
            >
              Dismiss Notice
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Navbar 
        onAuthClick={() => openAuth('login', 'buyer')} 
        onCartClick={() => setShowCart(true)}
        setView={setCurrentView}
        onDashboardTabChange={setDashboardTab}
        onSearch={setSearchQuery}
      />

      <main className={`flex-grow flex flex-col ${currentView === 'landing' ? '' : 'overflow-hidden'}`}>
        <AnimatePresence mode="wait">
          {currentView === 'landing' ? (
            <LandingPage 
              onShopClick={() => setCurrentView('home')} 
              onFarmerRegister={() => openAuth('register', 'farmer')}
              onFeaturedProductClick={(id) => {
                setSelectedProductId(id);
                setCurrentView('product');
              }}
              onIngredientSearch={(name) => {
                setSearchQuery(name);
                setSelectedCategory('All');
                setMarketViewMode('shop');
                setCurrentView('home');
              }}
            />
          ) : (
            <>
            <div className="flex flex-1 overflow-hidden mt-16 md:mt-20 min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)] h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
              <UnifiedSidebar
                currentView={currentView}
                setView={setCurrentView}
                marketViewMode={marketViewMode}
                setMarketViewMode={setMarketViewMode}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                farmerTab={dashboardTab}
                setFarmerTab={setDashboardTab}
                adminTab={adminTab}
                setAdminTab={setAdminTab}
                nearMeEnabled={nearMeEnabled}
                onNearMeToggle={handleNearMeClick}
              />

              <main className={`flex-1 flex flex-col no-scrollbar ${
                currentView === 'messages' 
                  ? 'h-full overflow-hidden p-0' 
                  : 'p-4 sm:p-8 lg:p-12 pb-28 md:pb-12 overflow-y-auto'
              }`}>
                {user && profile?.role === 'farmer' && currentView === 'dashboard' ? (
                  <FarmerDashboard onEditProfile={() => setCurrentView('profile')} activeTabProp={dashboardTab} onTabChange={setDashboardTab} />
                ) : user && profile?.role === 'admin' && currentView === 'admin-dashboard' ? (
                  <AdminDashboard activeTabProp={adminTab} onTabChange={setAdminTab} />
                ) : (
                  <>
                    {currentView === 'home' && (
                      <BuyerHome 
                        category={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        searchQuery={searchQuery}
                        onSearch={setSearchQuery}
                        viewMode={marketViewMode}
                        onViewModeChange={setMarketViewMode}
                        userCoords={userCoords}
                        nearMeOnly={nearMeEnabled}
                        onProductClick={(id) => {
                          setSelectedProductId(id);
                          setCurrentView('product');
                        }} 
                      />
                    )}
                    {currentView === 'admin-dashboard' && profile?.role === 'admin' && (
                      <AdminDashboard activeTabProp={adminTab} onTabChange={setAdminTab} />
                    )}
                  </>
                )}
                
                {currentView === 'product' && selectedProductId && (
                  <ProductDetail 
                    productId={selectedProductId} 
                    onBack={() => setCurrentView('home')} 
                    onFarmerClick={(farmerId) => {
                      setSelectedFarmerId(farmerId);
                      setCurrentView('farmer-profile');
                    }}
                  />
                )}
                {currentView === 'farmer-profile' && selectedFarmerId && (
                  <FarmerProfile 
                    farmerId={selectedFarmerId} 
                    onBack={() => setCurrentView('product')}
                    onProductClick={(productId) => {
                      setSelectedProductId(productId);
                      setCurrentView('product');
                    }}
                  />
                )}
                {currentView === 'tracking' && (
                  <OrderTracking onBack={() => setCurrentView('home')} />
                )}
                {currentView === 'profile' && (
                  <Profile />
                )}
                {currentView === 'messages' && (
                  <Messages setView={setCurrentView} />
                )}
              </main>
            </div>
            </>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
            initialMode={authVariant.mode}
            initialRole={authVariant.role}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInfoModal && (
          <InfoModal 
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            initialSection={infoModalSection}
          />
        )}
      </AnimatePresence>
      <Cart isOpen={showCart} onClose={() => setShowCart(false)} />
      <AIChatbot />
      
      {user && (
        <MobileNavBar 
          currentView={currentView}
          setView={setCurrentView}
          marketViewMode={marketViewMode}
          setMarketViewMode={setMarketViewMode}
          farmerTab={dashboardTab}
          setFarmerTab={setDashboardTab}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          onCartClick={() => setShowCart(true)}
          onAuthClick={() => openAuth('login', 'buyer')}
        />
      )}
      
      <footer className={`bg-stone-900 text-stone-100 pt-16 ${user ? 'pb-28' : 'pb-10'} md:pb-10 px-8 mt-auto relative overflow-hidden border-t border-stone-800`}>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10 text-center md:text-left">
          <div className="col-span-1 md:col-span-2 flex flex-col items-center md:items-start">
            <div 
              className="h-16 mb-4 cursor-pointer flex items-center justify-center md:justify-start" 
              onClick={() => {
                if (user) {
                  if (profile?.role === 'admin') setCurrentView('admin-dashboard');
                  else if (profile?.role === 'farmer') setCurrentView('dashboard');
                  else setCurrentView('home');
                } else {
                  setCurrentView('landing');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <img 
                src="/logo.png" 
                alt="FarmToHome Logo" 
                className="h-full w-auto object-contain brightness-0 invert opacity-90" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('h3')) {
                    const h3 = document.createElement('h3');
                    h3.className = "text-2xl font-bold tracking-tighter font-serif italic text-accent";
                    h3.innerText = 'FarmToHome';
                    parent.appendChild(h3);
                  }
                }}
              />
            </div>
            <p className="text-stone-400 max-w-sm leading-relaxed mb-6 text-xs md:text-sm">Connecting local farms directly to your home. Fresh produce, straight to your door.</p>
            <div className="flex gap-4 justify-center md:justify-start">
              <div 
                className="w-10 h-10 rounded-xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center hover:bg-stone-700 transition-all cursor-pointer group shadow-inner"
                onClick={() => {
                  if (user) {
                    if (profile?.role === 'admin') setCurrentView('admin-dashboard');
                    else if (profile?.role === 'farmer') setCurrentView('dashboard');
                    else setCurrentView('home');
                  } else {
                    setCurrentView('landing');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Sprout className="w-4 h-4 group-hover:rotate-12 transition-transform text-accent" />
              </div>
              <div 
                className="w-10 h-10 rounded-xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center hover:bg-stone-700 transition-all cursor-pointer group shadow-inner"
                onClick={() => {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => {
                    const searchBox = document.querySelector('input[placeholder*="Search"]');
                    if (searchBox) {
                      (searchBox as HTMLInputElement).focus();
                    }
                  }, 150);
                }}
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform text-accent" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4 text-accent/80">The Platform</h4>
            <ul className="space-y-3.5 text-stone-400 font-bold text-[9px] uppercase tracking-widest">
              <li className="hover:text-accent cursor-pointer transition-colors" onClick={() => { setInfoModalSection('stories'); setShowInfoModal(true); }}>Our Stories</li>
              <li className="hover:text-accent cursor-pointer transition-colors" onClick={() => { setInfoModalSection('care'); setShowInfoModal(true); }}>Product Care</li>
              <li className="hover:text-accent cursor-pointer transition-colors" onClick={() => { setInfoModalSection('impact'); setShowInfoModal(true); }}>Community Impact</li>
              <li className="hover:text-accent cursor-pointer transition-colors" onClick={() => { setInfoModalSection('map'); setShowInfoModal(true); }}>Farm Map</li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4 text-accent/80 cursor-pointer hover:underline" onClick={() => { setInfoModalSection('contact'); setShowInfoModal(true); }}>Contact</h4>
            <p className="text-stone-200 font-bold mb-1.5 tracking-tight text-sm cursor-pointer hover:text-accent transition-colors" onClick={() => { setInfoModalSection('contact'); setShowInfoModal(true); }}>farmtohomee11@gmail.com</p>
            <p className="text-stone-200 font-bold mb-4 tracking-tight text-sm cursor-pointer hover:text-accent transition-colors" onClick={() => { setInfoModalSection('contact'); setShowInfoModal(true); }}>09193604094</p>
            <p className="text-stone-500 text-[8.5px] font-bold uppercase tracking-widest leading-relaxed">Manila Base • Support Network for Local Agriculture</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-stone-800/80 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-500 text-[8.5px] font-bold uppercase tracking-[0.3em]">
          <span>© 2026 Local Farmers Network.</span>
          <div className="flex flex-wrap justify-center gap-6">
            <span className="hover:text-stone-300 cursor-pointer transition-colors" onClick={() => { setInfoModalSection('about'); setShowInfoModal(true); }}>About Us</span>
            <span className="hover:text-stone-300 cursor-pointer transition-colors" onClick={() => { setInfoModalSection('guidelines'); setShowInfoModal(true); }}>Guidelines</span>
            <span className="hover:text-stone-300 cursor-pointer transition-colors" onClick={() => { setInfoModalSection('certifications'); setShowInfoModal(true); }}>Certification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

