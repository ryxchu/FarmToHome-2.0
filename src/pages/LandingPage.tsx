import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Leaf, Heart, CheckCircle2, ShoppingBag, Star, Quote, Sprout, 
  Calendar, Sparkles, ChefHat, BookOpen, Search, HelpCircle, Utensils
} from 'lucide-react';
import { db, isQuotaError } from '../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

interface LandingPageProps {
  onShopClick: () => void;
  onFarmerRegister: () => void;
  onIngredientSearch?: (name: string) => void;
  onFeaturedProductClick?: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onShopClick, 
  onFarmerRegister,
  onIngredientSearch,
  onFeaturedProductClick
}) => {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('dryPeak');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const seasons = [
    {
      id: 'dryPeak',
      name: 'Dry Harvest Peak (Mar - Jun)',
      badge: 'Current Season ☀️',
      highlights: ['Abundant yellow mangoes', 'Tomatoes at lowest rates', 'Leafy greens peak freshness'],
      crops: [
        { name: 'Mangoes', desc: 'Carabao mangoes, sweet, yellow & organic.', emoji: '🥭', price: '₱180/kg' },
        { name: 'Tomatoes', desc: 'Vine-ripened red tomatoes of supreme grade.', emoji: '🍅', price: '₱120/kg' },
        { name: 'Pechay', desc: 'Crisp green Chinese cabbage, highly nutritious.', emoji: '🥬', price: '₱90/kg' }
      ]
    },
    {
      id: 'wetSeason',
      name: 'Wet Season Inflow (Jul - Oct)',
      badge: 'Upcoming Wet Cycle 🌧️',
      highlights: ['Ginger root replenishment', 'Local native onions harvested', 'Starch-heavy sweet potatoes'],
      crops: [
        { name: 'Ginger', desc: 'Fleshy roots gathered from upland Cordillera regions.', emoji: '🥔', price: '₱210/kg' },
        { name: 'Onions', desc: 'Freshly dug native local red bulb onions.', emoji: '🧅', price: '₱155/kg' },
        { name: 'Ginger', desc: 'Organic wild ginger rhizomes, intense flavor.', emoji: '🌿', price: '₱210/kg' }
      ]
    },
    {
      id: 'coolDry',
      name: 'Cool Breeze Harvest (Nov - Feb)',
      badge: 'Benguet Strawberry Season ❄️',
      highlights: ['Strawberries peak in north', 'Cool valley green lettuce', 'Winter native garlic bulbs'],
      crops: [
        { name: 'Strawberries', desc: 'Mountain-picked fresh strawberries, sweet & light.', emoji: '🍓', price: '₱250/kg' },
        { name: 'Onions', desc: 'Pungent local red onions, rich scent.', emoji: '🧅', price: '₱155/kg' },
        { name: 'Tomatoes', desc: 'Cool-weather plump cherry tomato harvests.', emoji: '🍅', price: '₱120/kg' }
      ]
    }
  ];

  const recipes = [
    {
      id: 'pinakbet',
      name: 'Traditional Pinakbet Stew',
      emoji: '🍛',
      desc: 'Comforting local vegetable stew seasoned with ancestral condiments and fresh garden crops.',
      time: '35 mins',
      difficulty: 'Easy Prep',
      ingredients: ['Tomatoes', 'Pechay', 'Onions', 'Ginger']
    },
    {
      id: 'sinigang',
      name: 'Sour Sautéed Sinigang Tamarind Broth',
      emoji: '🍲',
      desc: 'Comfort-food hot sour soup showcasing crisp leafy crops and garden root crops.',
      time: '45 mins',
      difficulty: 'Medium Dish',
      ingredients: ['Pechay', 'Tomatoes', 'Onions', 'Ginger']
    },
    {
      id: 'mango_salad',
      name: 'Carabao Mango & Tomato Salsa Salad',
      emoji: '🥗',
      desc: 'Refreshing, juicy summer salad matching sweet mangoes, green tomatoes, and crisp local onions.',
      time: '15 mins',
      difficulty: 'Fast & Raw',
      ingredients: ['Mangoes', 'Tomatoes', 'Onions']
    }
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      const cached = localStorage.getItem('featured_products');
      if (cached) {
        try {
          setFeaturedProducts(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem('featured_products');
        }
      }

      try {
        const q = query(collection(db, 'products'), where('isPublished', '==', true), limit(4));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setFeaturedProducts(products);
        localStorage.setItem('featured_products', JSON.stringify(products));
      } catch (error) {
        if (!isQuotaError(error)) {
          console.error('Error fetching featured products:', error);
        } else {
          console.warn("Using cached featured products due to quota limit");
        }
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="relative min-h-screen bg-background amakan-pattern">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center px-4 overflow-hidden rounded-b-[5rem] shadow-2xl pt-32 pb-20">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
            alt="Farm Harvesting" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8 shadow-xl"
          >
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#b87333]" />
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.5em]">
              Fresh Harvest From Fields
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 w-full"
          >
            <h1 className="text-6xl md:text-[8rem] font-bold text-white mb-6 tracking-tighter leading-[0.85] font-serif">
              Fresh From <br /> 
              <span className="text-accent underline decoration-accent/30 underline-offset-[16px] italic">Farm To Home</span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed font-light font-serif italic"
          >
            Bring the best harvest from our local farmers straight to your dining table with absolute confidence.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full"
          >
            <button 
              onClick={onShopClick}
              className="px-12 py-6 bg-white text-primary rounded-full font-bold text-xl hover:bg-slate-50 transition-all flex items-center gap-4 group shadow-2xl active:scale-95"
            >
              Start Shopping
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button 
              onClick={onFarmerRegister}
              className="px-12 py-6 bg-primary/20 backdrop-blur-md text-white border-2 border-white/30 rounded-full font-bold text-xl hover:bg-white/10 transition-all active:scale-95 shadow-xl"
            >
              Join as Farmer
            </button>
          </motion.div>
        </div>
      </section>

      {/* 🌟 INTERACTIVE AGRI-HUB SECTION (Makes Home distinct, engaging, and dynamic) */}
      <section className="py-24 px-4 sm:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-start">
        {/* Left Side: Seasonal Philippine Harvest Tracker */}
        <div className="lg:col-span-7 bg-white rounded-[3rem] p-6 sm:p-10 border border-stone-200/80 shadow-2xl shadow-stone-250/10 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="px-4 py-1.5 bg-amber-50 rounded-full text-amber-700 text-[9px] font-bold uppercase tracking-widest border border-amber-200/50 inline-block mb-3.5">
                📅 Regional Harvesting Guide
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif italic tracking-tight text-slate-850">Seasonal Tracker</h2>
              <p className="text-xs text-slate-450 font-medium mt-1">Know when crops peak in sweetness, maximum abundance, and lowest costs.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Season Selector Tabs */}
          <div className="flex overflow-x-auto gap-2.5 pb-2 -mx-2 px-2 no-scrollbar scroll-smooth">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season.id)}
                className={`py-3 px-5 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap border-2 transition-all select-none shrink-0 ${
                  selectedSeason === season.id
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.03]'
                    : 'bg-stone-50 border-stone-200/60 text-slate-500 hover:bg-stone-100 hover:text-slate-700'
                }`}
              >
                {season.name}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <AnimatePresence mode="wait">
            {seasons.filter(s => s.id === selectedSeason).map((season) => (
              <motion.div
                key={season.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Highlights Summary */}
                <div className="bg-emerald-500/5 border border-primary/10 rounded-2.5xl p-5">
                  <div className="flex items-center gap-2 mb-3.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{season.badge} Highlights</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {season.highlights.map((hlt) => (
                      <li key={hlt} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>{hlt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Seasonal Crop Cards with Search Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {season.crops.map((crop) => (
                    <div 
                      key={crop.name}
                      className="bg-stone-50 hover:bg-emerald-500/5 hover:border-primary/20 p-5 rounded-2.5xl border border-stone-200/70 transition-all flex flex-col group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-3xl select-none">{crop.emoji}</span>
                        <span className="text-[11px] font-black text-primary italic font-serif bg-white px-2.5 py-1 rounded-full border border-stone-200/50 shadow-sm">{crop.price}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight mb-1">{crop.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mb-4 flex-grow">{crop.desc}</p>
                      
                      <button
                        onClick={() => onIngredientSearch?.(crop.name)}
                        className="w-full py-2.5 bg-white group-hover:bg-primary group-hover:text-white group-hover:border-primary text-slate-600 font-black text-[9px] uppercase tracking-wider rounded-xl border border-stone-200 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 select-none active:scale-95 shadow-sm"
                      >
                        <Search className="w-3 h-3 group-hover:scale-110 transition-all" /> 
                        Find Fresh
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right Side: Interactive Recipe Builder & Grocery Shortcuts */}
        <div className="lg:col-span-5 bg-stone-50 rounded-[3rem] p-6 sm:p-10 border border-stone-200/60 shadow-xl space-y-6">
          <div>
            <span className="px-4 py-1.5 bg-emerald-50 rounded-full text-primary text-[9px] font-bold uppercase tracking-widest border border-primary/20 inline-block mb-3.5">
              🍳 Farm-To-Table Planner
            </span>
            <h2 className="text-3xl font-bold font-serif italic tracking-tight text-slate-850">Dish Recipe Shortcuts</h2>
            <p className="text-xs text-slate-450 font-medium mt-1">Select a dish to automatically query and aggregate fresh ingredients in our marketplace!</p>
          </div>

          {/* Recipes Stack list */}
          <div className="space-y-3.5">
            {recipes.map((rcp) => {
              const isSelected = selectedRecipe === rcp.id;
              return (
                <div 
                  key={rcp.id}
                  className={`rounded-2.5xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected 
                      ? 'bg-white border-primary shadow-xl ring-2 ring-primary/10' 
                      : 'bg-white/40 border-stone-200/60 hover:bg-white hover:border-stone-300'
                  }`}
                  onClick={() => setSelectedRecipe(isSelected ? null : rcp.id)}
                >
                  <div className="p-4 sm:p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl select-none shadow-sm border border-stone-150 relative">
                      {rcp.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="text-sm font-black text-slate-800 truncate tracking-tight">{rcp.name}</h4>
                        <span className="text-[8px] font-black tracking-widest text-primary uppercase font-mono">{rcp.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{rcp.desc}</p>
                    </div>
                  </div>

                  {/* Expanded Recipe Ingredient Shortcuts */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="bg-stone-50/50 px-5 pb-5 pt-1 border-t border-stone-150"
                      >
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3.5 block">🥕 Tap ingredient to source directly from farm:</p>
                        <div className="flex flex-wrap gap-2">
                          {rcp.ingredients.map((ing) => (
                            <button
                              key={ing}
                              onClick={(e) => {
                                e.stopPropagation();
                                onIngredientSearch?.(ing);
                              }}
                              className="px-3.5 py-2.5 bg-white hover:bg-primary hover:text-white font-extrabold text-[9px] uppercase tracking-wider text-slate-700 rounded-xl border border-stone-250 hover:border-primary/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 select-none"
                            >
                              <Search className="w-3 h-3 text-slate-400 hover:text-inherit shrink-0" />
                              {ing}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="pt-4 text-center">
            <button 
              onClick={onShopClick}
              className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 select-none flex items-center justify-center gap-2"
            >
              <Utensils className="w-4 h-4" /> Go Straight to Shop
            </button>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-32 px-8 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">Get to Know Us</span>
              <h2 className="text-5xl font-bold text-slate-800 tracking-tighter font-serif italic mb-8">What is Farm To Home</h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium mb-10">
                We are a team with one dream: to bring fresh food closer to every Filipino while supporting our local heroes—the farmers. We've removed middlemen to ensure higher income for farmers and lower prices for you.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Direct From Farmer', icon: <Leaf className="w-5 h-5" /> },
                  { title: 'Ensuring Freshness', icon: <Heart className="w-5 h-5" /> },
                  { title: 'Supporting Local Economy', icon: <Sprout className="w-5 h-5" /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-primary shadow-sm">
                      {item.icon || <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-slate-800 font-serif italic text-lg">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000" 
                  alt="Farmer" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 bg-primary p-8 rounded-[2.5rem] shadow-2xl text-white max-w-xs border-4 border-white">
                <p className="text-2xl font-bold font-serif italic mb-2">100% Local</p>
                <p className="text-sm opacity-80 font-medium">Every product reflects the hard work and perseverance of the Filipino farmer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Preview */}
      {featuredProducts.length > 0 && (
        <section className="py-32 px-8 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">This Season</span>
                <h2 className="text-5xl font-bold text-slate-800 tracking-tighter font-serif italic">From Our Farm</h2>
              </div>
              <button 
                onClick={onShopClick}
                className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[11px] group"
              >
                See All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {featuredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -10 }}
                  onClick={() => onFeaturedProductClick?.(product.id)}
                  className="bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group cursor-pointer h-full flex flex-col"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=500'} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-3 py-1 sm:px-4 sm:py-2 rounded-full shadow-lg">
                      <p className="text-primary font-bold text-xs sm:text-sm italic font-serif">₱{product.price}</p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 flex-grow flex flex-col">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1 sm:mb-2">{product.category}</p>
                    <h4 className="text-sm sm:text-xl font-bold text-slate-800 mb-2 sm:mb-3 font-serif italic leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-auto">
                      <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-600">4.9 (24)</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials / Our Story */}
      <section id="our-story" className="py-16 px-4 sm:py-40 sm:px-8 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10 sm:mb-20">
            <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-3 block">Our Story</span>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter font-serif italic text-balance">From the Heart of the <span className="text-primary not-italic">Farmer</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
            {[
              {
                name: "Mang Ben",
                role: "Magsasaka ng Palay",
                text: "Dati, kailangan naming maghintay ng mga middleman at madalas na binabarat ang aming ani. Dahil sa FarmToHome, diretso na kaming nakakapag-benta. Mas masaya kami dahil alam naming napupunta sa tamang kamay ang aming pinagpaguran.",
                img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"
              },
              {
                name: "Aling Mary",
                role: "Nagtitinda ng Gulay",
                text: "Napaka-importante sa amin ng kasariwaan. Dito sa FarmToHome, kitang-kita namin na kahapon lang pinitas ang mga gulay at ngayon ay nasa hapag-kainan na. Malaking tulong ito para sa aming kalusugan.",
                img: "https://images.unsplash.com/photo-1595273670150-db0a3d39074f?auto=format&fit=crop&q=80&w=400"
              },
              {
                name: "Mang Jose",
                role: "Organic Farmer",
                text: "Hindi lang pagebebenta ang ginagawa namin dito, kundi pagpapakita rin ng tunay na kalidad ng pagkaing Pilipino. Salamat sa suporta ninyo sa mga lokal na magsasaka gaya ko.",
                img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
              }
            ].map((testimony, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -15 }}
                className="bg-accent-light/30 p-6 sm:p-12 rounded-3xl sm:rounded-[5rem] border-4 border-white shadow-xl relative group"
              >
                <div className="absolute -top-5 left-6 sm:left-12 w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Quote className="w-5 h-5 sm:w-6 h-6" />
                </div>
                <div className="mb-6 sm:mb-10">
                  <p className="text-sm sm:text-lg text-slate-700 font-medium font-serif italic leading-relaxed">"{testimony.text}"</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 border-t border-primary/10 pt-6 sm:pt-8">
                  <img src={testimony.img} alt={testimony.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-lg border-2 border-white" />
                  <div>
                    <h4 className="font-bold text-slate-800 font-serif italic text-base sm:text-xl">{testimony.name}</h4>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{testimony.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 sm:mt-32 text-center bg-primary p-10 sm:p-20 rounded-[2rem] sm:rounded-[5rem] shadow-3xl text-white relative overflow-hidden group">
            <div className="absolute inset-0 banig-pattern opacity-10" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif italic mb-4 sm:mb-8 text-balance">Come, Let’s Support Local</h3>
              <p className="text-base sm:text-xl opacity-80 mb-6 sm:mb-12 font-medium">Every purchase you make helps our community.</p>
              <button 
                onClick={onShopClick}
                className="px-8 py-4 sm:px-16 sm:py-8 bg-white text-primary rounded-full font-bold text-base sm:text-2xl hover:bg-slate-50 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 sm:gap-6 mx-auto w-full sm:w-auto select-none"
              >
                Buy Now
                <ShoppingBag className="w-5 h-5 sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

