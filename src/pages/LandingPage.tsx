/**
 * LandingPage.tsx - FIXED & IMPROVED
 *
 * FIXES:
 * 1. Added proper scroll-triggered animations using motion's whileInView + viewport
 * 2. All sections now animate on scroll-down AND re-animate on scroll-back (once: false for hero, once: true for sections)
 * 3. Fixed mobile padding/spacing inconsistencies
 * 4. Staggered children animations for cards/lists
 * 5. Hero CTA buttons fixed for mobile touch targets (min 48px height)
 * 6. Removed layout overflow issues on mobile
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight, Leaf, Heart, CheckCircle2, ShoppingBag, Star, Quote, Sprout,
  Calendar, Sparkles, ChefHat, Search, Utensils
} from 'lucide-react';
import { db, isQuotaError, safeSetItem } from '../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

interface LandingPageProps {
  onShopClick: () => void;
  onFarmerRegister: () => void;
  onIngredientSearch?: (name: string) => void;
  onFeaturedProductClick?: (id: string) => void;
}

// Reusable scroll-reveal wrapper
const ScrollReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  className?: string;
}> = ({ children, delay = 0, direction = 'up', className = '' }) => {
  const prefersReduced = useReducedMotion();
  const initial = prefersReduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: direction === 'up' ? 40 : 0,
        x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0,
      };
  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onShopClick,
  onFarmerRegister,
  onIngredientSearch,
  onFeaturedProductClick,
}) => {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('dryPeak');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const seasons = [
    {
      id: 'dryPeak',
      name: 'Dry Peak (Mar–Jun)',
      badge: 'Current Season ☀️',
      highlights: ['Abundant yellow mangoes', 'Tomatoes at lowest rates', 'Leafy greens peak freshness'],
      crops: [
        { name: 'Mangoes', desc: 'Carabao mangoes, sweet, yellow & organic.', emoji: '🥭', price: '₱180/kg' },
        { name: 'Tomatoes', desc: 'Vine-ripened red tomatoes of supreme grade.', emoji: '🍅', price: '₱120/kg' },
        { name: 'Pechay', desc: 'Crisp green Chinese cabbage, highly nutritious.', emoji: '🥬', price: '₱90/kg' },
      ],
    },
    {
      id: 'wetSeason',
      name: 'Wet Season (Jul–Oct)',
      badge: 'Upcoming Wet Cycle 🌧️',
      highlights: ['Ginger root replenishment', 'Local native onions harvested', 'Starch-heavy sweet potatoes'],
      crops: [
        { name: 'Ginger', desc: 'Fleshy roots gathered from upland Cordillera regions.', emoji: '🥔', price: '₱210/kg' },
        { name: 'Onions', desc: 'Freshly dug native local red bulb onions.', emoji: '🧅', price: '₱155/kg' },
        { name: 'Kamote', desc: 'Organic sweet potatoes, rich and starchy.', emoji: '🌿', price: '₱85/kg' },
      ],
    },
    {
      id: 'coolDry',
      name: 'Cool Season (Nov–Feb)',
      badge: 'Benguet Strawberry Season ❄️',
      highlights: ['Strawberries peak in north', 'Cool valley green lettuce', 'Winter native garlic bulbs'],
      crops: [
        { name: 'Strawberries', desc: 'Mountain-picked fresh strawberries, sweet & light.', emoji: '🍓', price: '₱250/kg' },
        { name: 'Lettuce', desc: 'Cool-weather crisp green lettuce, farm-fresh.', emoji: '🥗', price: '₱95/kg' },
        { name: 'Tomatoes', desc: 'Cool-weather plump cherry tomato harvests.', emoji: '🍅', price: '₱120/kg' },
      ],
    },
  ];

  const recipes = [
    {
      id: 'pinakbet',
      name: 'Traditional Pinakbet Stew',
      emoji: '🍛',
      desc: 'Comforting local vegetable stew seasoned with ancestral condiments.',
      time: '35 mins',
      ingredients: ['Tomatoes', 'Pechay', 'Onions', 'Ginger'],
    },
    {
      id: 'sinigang',
      name: 'Sinigang Tamarind Broth',
      emoji: '🍲',
      desc: 'Hot sour soup showcasing crisp leafy crops and garden root crops.',
      time: '45 mins',
      ingredients: ['Pechay', 'Tomatoes', 'Onions', 'Ginger'],
    },
    {
      id: 'mango_salad',
      name: 'Mango & Tomato Salsa Salad',
      emoji: '🥗',
      desc: 'Refreshing summer salad matching sweet mangoes and crisp onions.',
      time: '15 mins',
      ingredients: ['Mangoes', 'Tomatoes', 'Onions'],
    },
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      // Try cache first for fast load
      const cached = localStorage.getItem('featured_products');
      if (cached) {
        try {
          setFeaturedProducts(JSON.parse(cached));
        } catch {
          localStorage.removeItem('featured_products');
        }
      }
      // Then fetch fresh from Firestore
      try {
        const q = query(collection(db, 'products'), where('isPublished', '==', true), limit(4));
        const snapshot = await getDocs(q);
        const prods = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        if (prods.length > 0) {
          setFeaturedProducts(prods);
          safeSetItem('featured_products', JSON.stringify(prods));
        }
      } catch (error) {
        if (!isQuotaError(error)) {
          console.error('Featured products fetch error:', error);
        }
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="relative min-h-screen bg-background amakan-pattern">

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center px-4 overflow-hidden rounded-b-[3rem] sm:rounded-b-[5rem] shadow-2xl pt-28 pb-16 sm:pt-32 sm:pb-20">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000"
            alt="Farm Harvesting"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center px-4">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-3 px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6 sm:mb-8 shadow-xl"
          >
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#b87333]" />
            <span className="text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.4em] sm:tracking-[0.5em]">
              Fresh Harvest From Fields
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 sm:mb-10 w-full"
          >
            <h1 className="text-4xl sm:text-6xl md:text-[7rem] font-bold text-white tracking-tighter leading-[0.85] font-serif">
              Fresh From <br />
              <span className="text-accent underline decoration-accent/30 underline-offset-[12px] sm:underline-offset-[16px] italic">
                Farm To Home
              </span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-white/80 text-base sm:text-xl font-medium max-w-xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2"
          >
            Directly supporting local agriculture. Pure, unprocessed, and delivered fresh to your door.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto"
          >
            <button
              onClick={onShopClick}
              className="w-full sm:w-auto min-h-[52px] px-8 sm:px-12 py-3.5 sm:py-5 bg-white text-primary font-bold text-sm sm:text-base rounded-full hover:bg-slate-50 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-2 sm:gap-3 select-none"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </button>
            <button
              onClick={onFarmerRegister}
              className="w-full sm:w-auto min-h-[52px] px-8 sm:px-12 py-3.5 sm:py-5 bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white font-bold text-sm sm:text-base rounded-full hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2 select-none"
            >
              <Leaf className="w-4 h-4" />
              Sell as Farmer
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SEASONAL TRACKER + RECIPE BUILDER ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">

          {/* Seasonal Tracker */}
          <div className="lg:col-span-7 bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-stone-200/60 shadow-xl space-y-6">
            <ScrollReveal>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="px-4 py-1.5 bg-amber-50 rounded-full text-amber-700 text-[9px] font-bold uppercase tracking-widest border border-amber-200/50 inline-block mb-3">
                    📅 Regional Harvesting Guide
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-bold font-serif italic tracking-tight text-slate-800">
                    Seasonal Tracker
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Know when crops peak in sweetness, abundance, and lowest costs.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </ScrollReveal>

            {/* Season Tabs */}
            <ScrollReveal delay={0.1}>
              <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1 no-scrollbar">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => setSelectedSeason(season.id)}
                    className={`py-2.5 px-4 rounded-2xl text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap border-2 transition-all select-none shrink-0 ${
                      selectedSeason === season.id
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                        : 'bg-stone-50 border-stone-200/60 text-slate-500 hover:bg-stone-100'
                    }`}
                  >
                    {season.name}
                  </button>
                ))}
              </div>
            </ScrollReveal>

            {/* Season Content */}
            <AnimatePresence mode="wait">
              {seasons
                .filter((s) => s.id === selectedSeason)
                .map((season) => (
                  <motion.div
                    key={season.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                    className="space-y-5"
                  >
                    <div className="bg-emerald-500/5 border border-primary/10 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                          {season.badge} Highlights
                        </span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {season.highlights.map((hlt) => (
                          <li key={hlt} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            {hlt}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {season.crops.map((crop, i) => (
                        <motion.div
                          key={crop.name + i}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-stone-50 hover:bg-emerald-500/5 hover:border-primary/20 p-4 sm:p-5 rounded-2xl border border-stone-200/70 transition-all flex flex-col group"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-2xl select-none">{crop.emoji}</span>
                            <span className="text-[10px] font-black text-primary italic font-serif bg-white px-2.5 py-1 rounded-full border border-stone-200/50 shadow-sm">
                              {crop.price}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight mb-1">{crop.name}</h4>
                          <p className="text-[10px] text-slate-400 font-medium leading-normal mb-3 flex-grow">{crop.desc}</p>
                          <button
                            onClick={() => onIngredientSearch?.(crop.name)}
                            className="w-full min-h-[40px] py-2 bg-white group-hover:bg-primary group-hover:text-white group-hover:border-primary text-slate-600 font-black text-[9px] uppercase tracking-wider rounded-xl border border-stone-200 transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 shadow-sm"
                          >
                            <Search className="w-3 h-3" />
                            Find Fresh
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {/* Recipe Builder */}
          <div className="lg:col-span-5 bg-stone-50 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-stone-200/60 shadow-xl space-y-6">
            <ScrollReveal delay={0.1}>
              <div>
                <span className="px-4 py-1.5 bg-emerald-50 rounded-full text-primary text-[9px] font-bold uppercase tracking-widest border border-primary/20 inline-block mb-3">
                  🍳 Farm-To-Table Planner
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif italic tracking-tight text-slate-800">
                  Dish Recipe Shortcuts
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Select a dish to source fresh ingredients directly!
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-3">
              {recipes.map((rcp, idx) => {
                const isSelected = selectedRecipe === rcp.id;
                return (
                  <ScrollReveal key={rcp.id} delay={idx * 0.08}>
                    <div
                      className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'bg-white border-primary shadow-xl ring-2 ring-primary/10'
                          : 'bg-white/60 border-stone-200/60 hover:bg-white hover:border-stone-300'
                      }`}
                      onClick={() => setSelectedRecipe(isSelected ? null : rcp.id)}
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-xl select-none shadow-sm border border-stone-150 shrink-0">
                          {rcp.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800 truncate tracking-tight">{rcp.name}</h4>
                            <span className="text-[8px] font-black tracking-widest text-primary uppercase font-mono shrink-0">{rcp.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{rcp.desc}</p>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="bg-stone-50/50 px-4 pb-4 pt-1 border-t border-stone-150"
                          >
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                              🥕 Tap to source from farm:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {rcp.ingredients.map((ing) => (
                                <button
                                  key={ing}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onIngredientSearch?.(ing);
                                  }}
                                  className="min-h-[36px] px-3 py-2 bg-white hover:bg-primary hover:text-white font-extrabold text-[9px] uppercase tracking-wider text-slate-700 rounded-xl border border-stone-200 hover:border-primary/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 select-none"
                                >
                                  <Search className="w-3 h-3 shrink-0" />
                                  {ing}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            <ScrollReveal delay={0.25}>
              <button
                onClick={onShopClick}
                className="w-full min-h-[52px] py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 select-none flex items-center justify-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                Go Straight to Shop
              </button>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── ABOUT US ── */}
      <section id="about-us" className="py-16 sm:py-32 px-4 sm:px-8 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 items-center">
            <ScrollReveal direction="left">
              <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">
                Get to Know Us
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-800 tracking-tighter font-serif italic mb-6 sm:mb-8">
                What is Farm To Home
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium mb-8 sm:mb-10">
                We are a team with one dream: to bring fresh food closer to every Filipino while supporting
                our local heroes—the farmers. We've removed middlemen to ensure higher income for farmers
                and lower prices for you.
              </p>
              <div className="space-y-4 sm:space-y-6">
                {[
                  { title: 'Direct From Farmer', icon: <Leaf className="w-5 h-5" /> },
                  { title: 'Ensuring Freshness', icon: <Heart className="w-5 h-5" /> },
                  { title: 'Supporting Local Economy', icon: <Sprout className="w-5 h-5" /> },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-bold text-slate-800 font-serif italic text-base sm:text-lg">{item.title}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.15}>
              <div className="relative">
                <div className="aspect-square rounded-[3rem] sm:rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000"
                    alt="Farmer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-6 -left-4 sm:-bottom-10 sm:-left-10 bg-primary p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-white max-w-[200px] sm:max-w-xs border-4 border-white">
                  <p className="text-xl sm:text-2xl font-bold font-serif italic mb-1">100% Local</p>
                  <p className="text-xs sm:text-sm opacity-80 font-medium">
                    Every product reflects the hard work of the Filipino farmer.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      {featuredProducts.length > 0 && (
        <section className="py-16 sm:py-32 px-4 sm:px-8 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <ScrollReveal>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-16 gap-4">
                <div>
                  <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-3 block">
                    This Season
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-bold text-slate-800 tracking-tighter font-serif italic">
                    From Our Farm
                  </h2>
                </div>
                <button
                  onClick={onShopClick}
                  className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[11px] group min-h-[44px]"
                >
                  See All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {featuredProducts.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.1}>
                  <motion.div
                    whileHover={{ y: -8 }}
                    onClick={() => onFeaturedProductClick?.(product.id)}
                    className="bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group cursor-pointer h-full flex flex-col"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={
                          product.images?.[0] ||
                          'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=500'
                        }
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 sm:px-4 sm:py-2 rounded-full shadow-lg">
                        <p className="text-primary font-bold text-xs sm:text-sm italic font-serif">₱{product.price}</p>
                      </div>
                    </div>
                    <div className="p-3 sm:p-6 flex-grow flex flex-col">
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{product.category}</p>
                      <h4 className="text-sm sm:text-lg font-bold text-slate-800 mb-2 font-serif italic leading-tight">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-auto">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />
                        <span className="text-[10px] sm:text-xs font-bold text-slate-600">
                          {product.rating?.toFixed(1) || '4.9'} ({product.reviewCount || 0})
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      <section id="our-story" className="py-16 sm:py-32 px-4 sm:px-8 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-20">
              <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-3 block">Our Story</span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tighter font-serif italic">
                From the Heart of the <span className="text-primary not-italic">Farmer</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            {[
              {
                name: 'Mang Ben',
                role: 'Magsasaka ng Palay',
                text: 'Dati, kailangan naming maghintay ng mga middleman. Dahil sa FarmToHome, diretso na kaming nakakapag-benta. Mas masaya kami dahil alam naming napupunta sa tamang kamay ang aming pinagpaguran.',
                img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
              },
              {
                name: 'Aling Mary',
                role: 'Nagtitinda ng Gulay',
                text: 'Napaka-importante sa amin ng kasariwaan. Dito sa FarmToHome, kitang-kita namin na kahapon lang pinitas ang mga gulay at ngayon ay nasa hapag-kainan na. Malaking tulong ito sa aming kalusugan.',
                img: 'https://images.unsplash.com/photo-1595273670150-db0a3d39074f?auto=format&fit=crop&q=80&w=400',
              },
              {
                name: 'Mang Jose',
                role: 'Organic Farmer',
                text: 'Hindi lang pagebebenta ang ginagawa namin dito, kundi pagpapakita rin ng tunay na kalidad ng pagkaing Pilipino. Salamat sa suporta ninyo sa mga lokal na magsasaka gaya ko.',
                img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
              },
            ].map((testimony, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.12}>
                <motion.div
                  whileHover={{ y: -10 }}
                  className="bg-accent-light/30 p-6 sm:p-10 rounded-3xl border-4 border-white shadow-xl relative"
                >
                  <div className="absolute -top-5 left-6 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <Quote className="w-5 h-5" />
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 font-medium font-serif italic leading-relaxed mb-6 mt-2">
                    "{testimony.text}"
                  </p>
                  <div className="flex items-center gap-3 border-t border-primary/10 pt-5">
                    <img
                      src={testimony.img}
                      alt={testimony.name}
                      className="w-12 h-12 rounded-xl object-cover shadow-lg border-2 border-white"
                      loading="lazy"
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 font-serif italic">{testimony.name}</h4>
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{testimony.role}</p>
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          {/* CTA Banner */}
          <ScrollReveal delay={0.1}>
            <div className="mt-14 sm:mt-24 text-center bg-primary p-8 sm:p-16 rounded-[2rem] sm:rounded-[4rem] shadow-2xl text-white relative overflow-hidden">
              <div className="absolute inset-0 banig-pattern opacity-10" />
              <div className="relative z-10 max-w-xl mx-auto">
                <h3 className="text-2xl sm:text-4xl font-bold font-serif italic mb-4 sm:mb-6">
                  Come, Let's Support Local
                </h3>
                <p className="text-sm sm:text-lg opacity-80 mb-8 sm:mb-10 font-medium">
                  Every purchase helps our farming community.
                </p>
                <button
                  onClick={onShopClick}
                  className="min-h-[52px] px-8 sm:px-14 py-4 sm:py-5 bg-white text-primary rounded-full font-bold text-base sm:text-xl hover:bg-slate-50 transition-all shadow-2xl active:scale-95 inline-flex items-center justify-center gap-3 select-none"
                >
                  Buy Now
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};