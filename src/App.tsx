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
import { OrderTracking } from './pages/OrderTracking';
import { AIChatbot } from './components/AIChatbot';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Search, ShoppingBag, Radio, Lock, MapPin } from 'lucide-react';
import { useCart } from './context/CartContext';
import { seedProducts, cleanupDuplicates } from './lib/seed';

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
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot, collection, getDocs, query, limit } from 'firebase/firestore';

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
    openAuth 
  } = useAuth();
  const { isOpen: showCart, setIsOpen: setShowCart } = useCart();
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  
  useEffect(() => {
    if (profile?.status === 'banned') {
      alert('Your account has been banned from the FarmToHome ecosystem.');
      logout();
      setCurrentView('landing');
    }
  }, [profile, logout]);
  
  const [currentView, setCurrentView] = useState<'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile' | 'messages'>('landing');
  const [marketViewMode, setMarketViewMode] = useState<'shop' | 'community'>('shop');
  const [dashboardTab, setDashboardTab] = useState<'inventory' | 'feedback' | 'messages'>('inventory');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

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
    const unsub = onSnapshot(doc(db, 'system', 'config'), (doc) => {
      if (doc.exists()) setSystemConfig(doc.data() as SystemConfig);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'system/config'));
    return () => unsub();
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
      </AnimatePresence>
      <Navbar 
        onAuthClick={() => openAuth('login', 'buyer')} 
        onCartClick={() => setShowCart(true)}
        setView={setCurrentView}
        onDashboardTabChange={setDashboardTab}
        onSearch={setSearchQuery}
      />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {currentView === 'landing' ? (
            <LandingPage 
              onShopClick={() => setCurrentView('home')} 
              onFarmerRegister={() => openAuth('register', 'farmer')}
            />
          ) : (
            <>
            <div className="flex flex-1 overflow-hidden min-h-[calc(100vh-80px)]">
              {(profile?.role !== 'farmer' && profile?.role !== 'admin' || !user) && (
                <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col p-6 shrink-0 h-full">
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="mb-10">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Navigation</h3>
                      <div className="bg-slate-50 p-1.5 rounded-[1.5rem] flex flex-col gap-1 mb-8">
                        <button 
                          onClick={() => { setMarketViewMode('shop'); setCurrentView('home'); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${marketViewMode === 'shop' && currentView === 'home' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-primary hover:bg-white'}`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Market
                        </button>
                        <button 
                          onClick={() => { setMarketViewMode('community'); setCurrentView('home'); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${marketViewMode === 'community' && currentView === 'home' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-primary hover:bg-white'}`}
                        >
                          <Radio className="w-3.5 h-3.5" /> Community
                        </button>
                      </div>
                    </div>

                    <div className="mb-10">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Sectors</h3>
                      <nav className="space-y-1">
                        <SideNavLink icon="🌳" label="All" active={selectedCategory === 'All'} onClick={() => handleCategorySelect('All')} />
                        <SideNavLink icon="🥬" label="Vegetables" active={selectedCategory === 'Vegetables'} onClick={() => handleCategorySelect('Vegetables')} />
                        <SideNavLink icon="🍎" label="Fruits" active={selectedCategory === 'Fruits'} onClick={() => handleCategorySelect('Fruits')} />
                        <SideNavLink icon="🍠" label="Root Crops" active={selectedCategory === 'Root Crops'} onClick={() => handleCategorySelect('Root Crops')} />
                        <SideNavLink icon="🌿" label="Herbs & Spices" active={selectedCategory === 'Herbs & Spices'} onClick={() => handleCategorySelect('Herbs & Spices')} />
                        <SideNavLink icon="🌾" label="Grains" active={selectedCategory === 'Grains'} onClick={() => handleCategorySelect('Grains')} />
                        <SideNavLink icon="🍗" label="Poultry" active={selectedCategory === 'Poultry'} onClick={() => handleCategorySelect('Poultry')} />
                        <SideNavLink icon="🥚" label="Dairy" active={selectedCategory === 'Dairy'} onClick={() => handleCategorySelect('Dairy')} />
                        <SideNavLink icon="✨" label="Others" active={selectedCategory === 'Others'} onClick={() => handleCategorySelect('Others')} />
                      </nav>
                    </div>

                    <div className="mt-8">
                      <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 relative overflow-hidden group">
                        <p className="text-[9px] uppercase font-bold text-primary/60 mb-2 tracking-[0.2em]">Carbon Saved</p>
                        <p className="text-3xl font-bold mb-2 tracking-tighter font-serif italic text-primary">12.5 <span className="text-xs not-italic opacity-60">kg</span></p>
                        <p className="text-[8px] leading-relaxed text-slate-400 font-medium tracking-tight">Eco-friendly logistics.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <button 
                      onClick={handleNearMeClick}
                      className={`w-full bg-white rounded-2xl p-4 border flex items-center gap-4 transition-all text-left ${nearMeEnabled ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-primary/20'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${nearMeEnabled ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-800 uppercase tracking-[0.2em]">Near Me</p>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${nearMeEnabled ? 'text-primary' : 'text-slate-400'}`}>
                          {nearMeEnabled ? 'Active' : 'Disabled'}
                        </p>
                      </div>
                    </button>
                  </div>
                </aside>
              )}

              <main className="flex-1 p-8 lg:p-12 overflow-y-auto flex flex-col no-scrollbar">
                {user && profile?.role === 'farmer' && (currentView === 'home' || currentView === 'dashboard') ? (
                  <FarmerDashboard onEditProfile={() => setCurrentView('profile')} activeTabProp={dashboardTab} onTabChange={setDashboardTab} />
                ) : user && profile?.role === 'admin' && (currentView === 'home' || currentView === 'admin-dashboard') ? (
                  <AdminDashboard />
                ) : (
                  <>
                    {currentView === 'home' && (
                      <BuyerHome 
                        category={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        searchQuery={searchQuery}
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
                      <AdminDashboard />
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
                  <OrderTracking />
                )}
                {currentView === 'profile' && (
                  <Profile />
                )}
                {currentView === 'messages' && (
                  <Messages />
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
      <Cart isOpen={showCart} onClose={() => setShowCart(false)} />
      <AIChatbot />
      
      <footer className="bg-primary text-white pt-16 pb-10 px-8 mt-auto relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-secondary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          <div className="col-span-1 md:col-span-2">
            <div className="h-20 mb-6 cursor-pointer flex items-center" onClick={() => setCurrentView('landing')}>
              <img 
                src="/logo.png" 
                alt="FarmToHome Logo" 
                className="h-full w-auto object-contain brightness-0 invert" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const h3 = document.createElement('h3');
                    h3.className = "text-3xl font-bold tracking-tighter font-serif italic";
                    h3.innerText = 'FarmToHome';
                    parent.appendChild(h3);
                  }
                }}
              />
            </div>
            <p className="text-white/60 max-w-sm leading-relaxed mb-8 text-sm">Connecting local farms directly to your home. Fresh produce, straight to your door.</p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-secondary transition-all cursor-pointer group shadow-inner">
                <Sprout className="w-4 h-4 group-hover:rotate-12 transition-transform text-accent-light" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-secondary transition-all cursor-pointer group shadow-inner">
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform text-accent-light" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-6 text-secondary">The Platform</h4>
            <ul className="space-y-4 text-white/50 font-bold text-[10px] uppercase tracking-widest">
              <li className="hover:text-secondary cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Our Stories</li>
              <li className="hover:text-secondary cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Product Care</li>
              <li className="hover:text-secondary cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Community Impact</li>
              <li className="hover:text-secondary cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Farm Map</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] mb-6 text-secondary">Contact</h4>
            <p className="text-white font-bold mb-2 tracking-tight text-sm">hello@farmtohome.run</p>
            <p className="text-white font-bold mb-6 tracking-tight text-sm">+63 900 000 0000</p>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest leading-relaxed">Manila Base • Support Network for Local Agriculture</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-[9px] font-bold uppercase tracking-[0.3em]">
          <span>© 2026 Local Farmers Network.</span>
          <div className="flex gap-8">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>About Us</span>
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Guidelines</span>
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentView('home'); }}>Certification</span>
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

