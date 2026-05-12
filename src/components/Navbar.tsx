import React from 'react';
import { ShoppingCart, User, Sprout, Search, MapPin, Home, History, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

interface NavbarProps {
  onAuthClick: () => void;
  onCartClick: () => void;
  setView: (view: 'landing' | 'home' | 'dashboard' | 'admin-dashboard' | 'product' | 'tracking' | 'profile' | 'farmer-profile') => void;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAuthClick, onCartClick, setView, onSearch }) => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
    setView('home'); // Ensure we are on home view when searching
  };

  return (
    <>
      <nav className={`z-50 transition-all ${!user ? 'h-24 bg-transparent border-none fixed w-full' : 'h-24 sticky top-0 bg-background/80 backdrop-blur-xl border-b border-white/40'} px-8 flex items-center`}>
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
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
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10"
          >
            <Sprout className="w-6 h-6 text-accent-light" />
          </motion.div>
          <span className={`text-2xl font-bold tracking-tighter font-serif ${!user ? 'text-white' : 'text-slate-900'}`}>FarmToHome</span>
        </div>

        {!user ? (
          <div className="hidden lg:flex items-center gap-10">
            <button onClick={() => setView('landing')} className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">Our Story</button>
            <button onClick={() => setView('home')} className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">Marketplace</button>
            <button onClick={() => setView('landing')} className="text-[10px] font-black text-white hover:text-accent-light uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px] active:scale-95">About Us</button>
            <div className="h-4 w-px bg-white/20 mx-2" />
            <button onClick={onAuthClick} className="text-[10px] font-black text-white uppercase tracking-[0.4em] hover:text-accent-light transition-all hover:translate-y-[-2px] active:scale-95">Sign In</button>
            <button 
              onClick={onAuthClick}
              className="px-8 py-3.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-2xl active:scale-95 border-2 border-white/20"
            >
              Start Order
            </button>
          </div>
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
                
                <div className="h-8 w-px bg-border hidden sm:block" />

                <div className="relative group/profile">
                  <button className="flex items-center gap-4 group/btn">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Member</p>
                      <p className="text-sm font-bold text-slate-900">{profile?.fullName.split(' ')[0]}</p>
                    </div>
                    <div className="w-12 h-12 rounded-[1.25rem] bg-accent-light p-1 group-hover/btn:scale-110 transition-all duration-500 shadow-sm border border-primary/5">
                      <div className="w-full h-full rounded-[1rem] bg-primary/20 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
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
                        onClick={() => auth.signOut()}
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
      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 bg-gradient-to-t from-background via-background to-transparent">
          <div className="bg-background/80 backdrop-blur-2xl border-4 border-white rounded-[2.5rem] shadow-[0_-20px_40px_rgba(45,79,30,0.1)] p-3 flex items-center justify-around clay-shadow">
            <button 
              onClick={() => setView('home')}
              className="flex flex-col items-center gap-1.5 p-3 group transition-transform active:scale-90"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-all group-hover:-translate-y-1">
                <Home className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Home</span>
            </button>
            
            {profile?.role === 'farmer' ? (
              <button 
                onClick={() => setView('dashboard')}
                className="flex flex-col items-center gap-1.5 p-3 group transition-transform active:scale-90"
              >
                <div className="w-10 h-10 rounded-2xl bg-secondary/5 flex items-center justify-center group-hover:bg-secondary/20 transition-all group-hover:-translate-y-1">
                  <LayoutDashboard className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-secondary transition-colors">Dashboard</span>
              </button>
            ) : (
              <button 
                onClick={() => setView('tracking')}
                className="flex flex-col items-center gap-1.5 p-3 group transition-transform active:scale-90"
              >
                <div className="w-10 h-10 rounded-2xl bg-accent/5 flex items-center justify-center group-hover:bg-accent/20 transition-all group-hover:-translate-y-1">
                  <History className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-accent transition-colors">Orders</span>
              </button>
            )}

            <button 
              onClick={() => setView('profile')}
              className="flex flex-col items-center gap-1.5 p-3 group transition-transform active:scale-90"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-200 transition-all group-hover:-translate-y-1">
                <User className="w-5 h-5 text-slate-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">Profile</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
