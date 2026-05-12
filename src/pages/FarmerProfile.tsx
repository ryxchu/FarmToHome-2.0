import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Product } from '../types';
import { MapPin, ShieldCheck, ChevronLeft, Calendar, Leaf, Award, Star, Plus, Sun, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface FarmerProfileProps {
  farmerId: string;
  onBack: () => void;
  onProductClick: (id: string) => void;
}

export const FarmerProfile: React.FC<FarmerProfileProps> = ({ farmerId, onBack, onProductClick }) => {
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const farmerSnap = await getDoc(doc(db, 'users', farmerId));
        if (farmerSnap.exists()) {
          setFarmer({ ...farmerSnap.data(), uid: farmerSnap.id } as UserProfile);
        }

        const q = query(collection(db, 'products'), where('farmerId', '==', farmerId));
        const prodsSnap = await getDocs(q);
        setProducts(prodsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmer();
  }, [farmerId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><p className="animate-pulse">Loading Farm Profile...</p></div>;
  if (!farmer) return <div className="h-screen flex items-center justify-center">Farm Profile Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-slate-500 hover:text-primary mb-12 font-bold transition-all text-xs uppercase tracking-[0.2em]"
      >
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start p-10 banig-pattern rounded-[4rem] border-4 border-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8">
                <div className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-full shadow-xl shadow-amber-500/20 border-2 border-white/50 group">
                  <Sun className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Verified Local Farmer</span>
                </div>
             </div>

             <div className="w-48 h-48 bg-white rounded-[3.5rem] flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white relative group shrink-0">
               <img 
                 src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${farmer.uid}`} 
                 alt={farmer.fullName} 
                 className="w-full h-full object-cover bg-accent-light"
               />
               <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.5em] mb-4 font-serif italic">Verified Farmer</p>
               <h1 className="text-6xl font-bold text-slate-800 tracking-tighter mb-4 font-serif">{farmer.farmName}</h1>
               <div className="flex flex-wrap items-center gap-4 text-slate-500">
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-border shadow-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{farmer.farmAddress}</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-border shadow-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Since {new Date(farmer.createdAt).getFullYear()}</span>
                  </div>
               </div>
             </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border-4 border-white shadow-2xl clay-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <h2 className="text-3xl font-bold text-slate-800 mb-8 font-serif italic">About the Farm</h2>
            <p className="text-xl text-slate-600 leading-relaxed font-serif opacity-80 italic">
              "{farmer.farmStory || "This farm is dedicated to bringing the freshest, most sustainable produce directly to your home. With a focus on heirloom varieties and artisanal growing methods, every harvest is a testament to our commitment to soil health and community well-being."}"
            </p>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-primary text-white p-12 rounded-[4rem] shadow-2xl forest-shadow relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
              <h3 className="text-2xl font-bold mb-10 flex items-center gap-4 font-serif">
                <Leaf className="w-7 h-7 text-accent" />
                Farming Methods
              </h3>
              <div className="space-y-8">
                <div>
                   <p className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] mb-4 opacity-70 italic font-serif">Growing Standards</p>
                   <p className="text-base font-medium opacity-90 leading-relaxed">{farmer.farmingMethods || "Permaculture, Organic Composting, and Natural Pest Management."}</p>
                </div>
                {farmer.certifications && farmer.certifications.length > 0 && (
                   <div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] mb-4 opacity-70 italic font-serif">Certifications</p>
                    <div className="flex flex-wrap gap-3">
                       {farmer.certifications.map(cert => (
                         <span key={cert} className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 backdrop-blur-sm">
                           <Award className="w-4 h-4 text-accent" />
                           {cert}
                         </span>
                       ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
           
           <div className="p-10 bg-accent-light rounded-[4rem] border-4 border-white shadow-xl shadow-accent/5">
              <div className="flex items-center gap-4 mb-6">
                <BadgeCheck className="w-8 h-8 text-secondary" />
                <h4 className="text-lg font-bold text-slate-800 font-serif italic">Verified Local</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-widest">
                This farmer has been verified by the Platform for upholding high farming standards.
              </p>
           </div>
        </div>
      </div>

      {/* Farm Produce */}
      <div>
        <div className="flex justify-between items-end mb-12">
           <div>
             <h2 className="text-4xl font-bold text-slate-800 tracking-tight">Product List</h2>
             <p className="text-slate-400 font-medium mt-2">Currently available products from {farmer.farmName}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
           {products.map(product => (
             <motion.div 
               key={product.id}
               whileHover={{ y: -10 }}
               className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col group cursor-pointer"
               onClick={() => onProductClick(product.id)}
             >
               <div className="aspect-[4/5] relative overflow-hidden">
                 <img src={product.images?.[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                 <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200 shadow-sm">
                   ⭐ {product.rating || 'New'}
                 </div>
               </div>
               <div className="p-8">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 opacity-70">{product.category}</p>
                 <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-4 group-hover:text-primary transition-colors">{product.name}</h3>
                 <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                   <p className="text-2xl font-bold text-slate-800">₱{product.price}<span className="text-xs text-slate-400 font-normal ml-1">/{product.unit}</span></p>
                   <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-all opacity-0 group-hover:opacity-100">
                     <Plus className="w-5 h-5" />
                   </div>
                 </div>
               </div>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
};
