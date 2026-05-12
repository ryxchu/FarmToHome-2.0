import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Leaf, Heart, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onShopClick: () => void;
  onFarmerRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onShopClick, onFarmerRegister }) => {
  return (
    <div className="relative min-h-screen bg-background amakan-pattern">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center text-center px-4 overflow-hidden rounded-b-[5rem] shadow-2xl pt-24">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
            alt="Farm Harvesting" 
            className="w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-10 shadow-xl"
          >
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#b87333]" />
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.5em]">
              Direct from local farms
            </span>
          </motion.div>

          {/* Headings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h1 className="text-6xl md:text-[8.5rem] font-bold text-white mb-8 tracking-tighter leading-[0.8] font-serif">
              Fresh From <br /> 
              <span className="text-accent underline decoration-accent/30 underline-offset-[20px] italic">Farm to Home</span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-2xl text-white/80 mb-16 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Direct from farms to your family. High-quality local products you can trust.
            Freshly harvested and delivered fast.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
          >
            <button 
              onClick={onShopClick}
              className="px-12 py-6 bg-primary text-white rounded-full font-bold text-xl hover:bg-primary/90 transition-all flex items-center gap-4 group shadow-2xl shadow-primary/40 hover:scale-105 hover:rotate-1 active:scale-95 border-2 border-white/10"
            >
              Shop Local Produce
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('farmers-info')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-12 py-6 bg-secondary text-white rounded-full font-bold text-xl hover:bg-secondary/90 transition-all shadow-2xl shadow-secondary/40 hover:scale-105 hover:-rotate-1 active:scale-95 border-2 border-white/10"
            >
              Farmer Registration
            </button>
          </motion.div>

          {/* Floating Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="hidden lg:flex absolute top-1/2 -right-24 -translate-y-1/2 flex-col items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-2xl"
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold leading-tight">Fresh Daily</p>
              <p className="text-white/60 text-xs font-medium uppercase tracking-tighter">Harvested for You</p>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-3 gap-8 mt-24 pt-12 border-t border-white/10 max-w-3xl mx-auto"
          >
            <div className="text-left">
              <p className="text-2xl md:text-3xl font-bold text-white leading-none mb-2">500+</p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-tight italic">Local Farmers</p>
            </div>
            <div className="text-left border-x border-white/10 px-8">
              <p className="text-2xl md:text-3xl font-bold text-white leading-none mb-2">12</p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-tight italic">Locations Served</p>
            </div>
            <div className="text-left">
              <p className="text-2xl md:text-3xl font-bold text-white leading-none mb-2">0</p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-tight italic">Resellers</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Narrative Section */}
      <section className="py-40 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-secondary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <div className="relative group">
              <div className="aspect-[4/5] rounded-[5rem] overflow-hidden shadow-2xl relative border-[12px] border-white clay-shadow">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 grayscale hover:grayscale-0" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
              </div>
              <motion.div 
                whileHover={{ y: -10, scale: 1.02 }}
                className="absolute -bottom-16 -right-16 banig-pattern p-12 rounded-[4rem] shadow-2xl border-4 border-white max-w-sm hidden xl:block"
              >
                <p className="text-secondary font-bold mb-6 flex items-center gap-3">
                  <Leaf className="w-6 h-6" /> 
                  <span className="text-[10px] uppercase tracking-[0.4em] leading-none font-serif italic">Our Promise</span>
                </p>
                <p className="text-slate-800 font-bold text-2xl leading-snug tracking-tight mb-8 font-serif italic">"We don't just ship products; we share the heart of our local farms."</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20">MB</div>
                  <div>
                    <p className="text-base font-bold text-slate-800 font-serif">Mang Ben</p>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Rice Farmer</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="space-y-16">
              <div>
                <div className="w-12 h-2 bg-secondary rounded-full mb-10" />
                <h2 className="text-6xl md:text-7xl font-bold text-slate-900 tracking-tighter mb-10 font-serif leading-[1] italic">Fresh Produce: <br /> <span className="text-primary not-italic">From Local Fields</span></h2>
                <p className="text-2xl text-slate-600 leading-relaxed font-medium font-serif opacity-80">
                  FarmToHome connects you directly with farmers across the Philippines. We prioritize sustainable farming and high-quality local products.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-12 bg-white rounded-[4rem] border-4 border-white group hover:border-primary/20 transition-all hover:shadow-2xl shadow-xl clay-shadow">
                  <div className="w-16 h-16 bg-secondary/10 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                    <CheckCircle2 className="w-8 h-8 text-secondary" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-4 text-2xl tracking-tight font-serif italic">Fast Delivery</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Direct from the farm to your door. No unnecessary middleman or storage delays.</p>
                </div>
                <div className="p-12 bg-white rounded-[4rem] border-4 border-white group hover:border-primary/20 transition-all hover:shadow-2xl shadow-xl clay-shadow">
                  <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 group-hover:-rotate-12 transition-transform">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-4 text-2xl tracking-tight font-serif italic">Sustainable</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Smarter delivery routes reduce our carbon footprint while supporting local agriculture.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Farmers Section */}
      <section id="farmers-info" className="py-32 px-8 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-secondary/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter mb-8 font-serif italic">For Our <span className="text-secondary not-italic">Local Farmers</span></h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Join a growing network of sustainable farms and reach more families in the city.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: 'Fair Pricing', desc: 'Set your own prices and keep a higher percentage of the sale value.', icon: <CheckCircle2 className="w-6 h-6" /> },
              { title: 'Wider Reach', desc: 'Access customers across Metro Manila without managing logistics.', icon: <CheckCircle2 className="w-6 h-6" /> },
              { title: 'Direct Impact', desc: 'Build real relationships with the families you provide for.', icon: <CheckCircle2 className="w-6 h-6" /> }
            ].map((feature, i) => (
              <div key={i} className="p-12 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 hover:shadow-2xl transition-all h-full">
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-8">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4 font-serif italic">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 text-center">
            <button 
              onClick={onFarmerRegister}
              className="px-16 py-8 bg-secondary text-white rounded-full font-bold text-2xl hover:bg-secondary/90 transition-all shadow-2xl shadow-secondary/20 hover:scale-110 hover:-rotate-1 active:scale-95 active:rotate-0"
            >
              Start Your Farm Store
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
