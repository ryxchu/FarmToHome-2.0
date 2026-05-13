import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Leaf, Heart, CheckCircle2, ShoppingBag, Star, Quote, Sprout } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

interface LandingPageProps {
  onShopClick: () => void;
  onFarmerRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onShopClick, onFarmerRegister }) => {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'products'), where('isPublished', '==', true), limit(4));
        const snapshot = await getDocs(q);
        setFeaturedProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (error) {
        console.error('Error fetching featured products:', error);
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
          </motion.div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group cursor-pointer h-full flex flex-col"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=500'} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <p className="text-primary font-bold text-sm italic font-serif">₱{product.price}</p>
                    </div>
                  </div>
                  <div className="p-8 flex-grow flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{product.category}</p>
                    <h4 className="text-xl font-bold text-slate-800 mb-3 font-serif italic leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-auto">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="text-xs font-bold text-slate-600">4.9 (24)</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials / Our Story */}
      <section id="our-story" className="py-40 px-8 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-4 block">Our Story</span>
            <h2 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter font-serif italic">From the Heart of the <span className="text-primary not-italic">Farmer</span></h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
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
                className="bg-accent-light/30 p-12 rounded-[5rem] border-4 border-white shadow-xl relative group"
              >
                <div className="absolute -top-6 left-12 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Quote className="w-6 h-6" />
                </div>
                <div className="mb-10">
                  <p className="text-lg text-slate-700 font-medium font-serif italic leading-relaxed">"{testimony.text}"</p>
                </div>
                <div className="flex items-center gap-5 border-t border-primary/10 pt-8">
                  <img src={testimony.img} alt={testimony.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white" />
                  <div>
                    <h4 className="font-bold text-slate-800 font-serif italic text-xl">{testimony.name}</h4>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{testimony.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-32 text-center bg-primary p-20 rounded-[5rem] shadow-3xl text-white relative overflow-hidden group">
            <div className="absolute inset-0 banig-pattern opacity-10" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="text-4xl md:text-5xl font-bold font-serif italic mb-8">Come, Let’s Support Local</h3>
              <p className="text-xl opacity-80 mb-12 font-medium">Every purchase you make helps our community.</p>
              <button 
                onClick={onShopClick}
                className="px-16 py-8 bg-white text-primary rounded-full font-bold text-2xl hover:bg-slate-50 transition-all shadow-2xl active:scale-95 flex items-center gap-6 mx-auto"
              >
                Buy Now
                <ShoppingBag className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

