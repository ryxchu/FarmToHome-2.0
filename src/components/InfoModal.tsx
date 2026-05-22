import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Phone, MapPin, Leaf, Sprout, Award, 
  BookOpen, Users, ShieldCheck, Globe, ArrowRight, 
  CheckCircle2, MessageSquare, Heart, Sparkles, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type InfoSectionType = 
  | 'about' 
  | 'guidelines' 
  | 'certifications' 
  | 'contact' 
  | 'stories' 
  | 'care' 
  | 'impact' 
  | 'map';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: InfoSectionType;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, initialSection = 'about' }) => {
  const [activeTab, setActiveTab] = useState<InfoSectionType>(initialSection);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Update active tab when initialSection changes
  useEffect(() => {
    setActiveTab(initialSection);
    setSubmitStatus(null);
  }, [initialSection, isOpen]);

  if (!isOpen) return null;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/contact-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitStatus({ success: true, message: data.message });
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        setSubmitStatus({ success: false, message: data.message || "Failed to send message. Please try again." });
      }
    } catch (err) {
      setSubmitStatus({ success: false, message: "Network connection error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const menuItems = [
    { id: 'about', label: 'About Us', icon: <Users className="w-4 h-4" /> },
    { id: 'guidelines', label: 'Guidelines', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'certifications', label: 'Certifications', icon: <Award className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact Us', icon: <Mail className="w-4 h-4" /> },
    { id: 'stories', label: 'Our Stories', icon: <Heart className="w-4 h-4" /> },
    { id: 'care', label: 'Product Care', icon: <Leaf className="w-4 h-4" /> },
    { id: 'impact', label: 'Community Impact', icon: <Sprout className="w-4 h-4" /> },
    { id: 'map', label: 'Farm Map', icon: <MapPin className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-6xl h-full max-h-[85vh] md:max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all border border-slate-100 hover:rotate-90 active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sidebar / Left Column */}
        <div className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 p-6 md:p-8 shrink-0 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                <Sprout className="w-5 h-5 animate-pulse" />
              </div>
              <span className="font-serif italic font-black text-xl tracking-tight text-slate-800">FarmToHome</span>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Information Hub</p>
            <nav className="space-y-1 mb-8">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSubmitStatus(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all text-left ${
                      isActive 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 translate-x-1' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                    }`}
                  >
                    <span className={isActive ? 'scale-110' : 'opacity-75'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden md:block pt-6 border-t border-slate-100 text-[10px] uppercase font-bold tracking-widest text-slate-400">
            <p className="text-slate-500 mb-1">Support Active Hours</p>
            <p className="text-primary font-serif italic text-xs mb-3">7:00 AM - 9:00 PM</p>
            <p className="text-[8px] italic opacity-60">Empowering Local Farms</p>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-grow p-6 md:p-10 overflow-y-auto bg-slate-50/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {/* === ABOUT US === */}
              {activeTab === 'about' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Our Organic Seed</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">What is FarmToHome</h2>
                  </div>

                  <p className="text-slate-600 text-base leading-relaxed font-normal">
                    FarmToHome is an ecosystem dedicated to bridging the agricultural divide in the Philippines. By eliminating supply chain bottlenecks and intermediary links, we connect local hardworking farmers directly with families, restaurants, and food lovers in the city.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-primary mb-4">
                        <Globe className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 font-serif italic text-base mb-2">Our Mission</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        To offer consumers unparalleled harvest freshness and high organic standards, while securing fair wholesale prices and economic livelihoods directly for agricultural farmers.
                      </p>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-primary mb-4">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 font-serif italic text-base mb-2">Our Core Value</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Complete transparency, direct community support, minimal organic carbon packaging, and deep gratitude for the individuals feeding our families.
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100 flex flex-col md:flex-row gap-6 items-center">
                    <div className="text-3xl font-bold font-serif italic text-primary shrink-0">100% Local</div>
                    <div className="text-xs text-slate-600 leading-relaxed font-medium">
                      Every order supports farming cooperatives from Benguet, Bulacan, Quezon, Batangas, and surrounding rural provinces. We take pride in honoring their heritage.
                    </div>
                  </div>
                </div>
              )}

              {/* === GUIDELINES === */}
              {activeTab === 'guidelines' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Core Protocols</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Community Guidelines</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* For Buyers */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-emerald-50 pb-3">
                        <span className="text-xl">🛒</span>
                        <h3 className="font-serif italic font-bold text-xl text-slate-800">For Home Buyers</h3>
                      </div>
                      
                      <ol className="space-y-3 text-slate-600 text-xs">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">1</span>
                          <span><strong>Direct Communication:</strong> Maintain friendly and respectful exchanges with our farmers and courier partners.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">2</span>
                          <span><strong>Accept Natural Seasonality:</strong> Fresh crops might differ in appearance from stylized photos. They are organically harvested.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">3</span>
                          <span><strong>Fair Cancellations:</strong> Avoid cancelling orders after shipping, as fresh agricultural harvests degrade and damage rural farmers' hard work.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">4</span>
                          <span><strong>Timely Payments:</strong> Pay promptly digitally or prepare correct cash for Cash on Delivery couriers.</span>
                        </li>
                      </ol>
                    </div>

                    {/* For Farmers */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-amber-50 pb-3">
                        <span className="text-xl">🧑‍🌾</span>
                        <h3 className="font-serif italic font-bold text-xl text-slate-800">For Registered Farmers</h3>
                      </div>
                      
                      <ol className="space-y-3 text-slate-600 text-xs">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">1</span>
                          <span><strong>Harvester Integrity:</strong> Only list produce that was honestly farmed using clean safety and quality standards, representing true size/weight.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">2</span>
                          <span><strong>Organic-First Packaging:</strong> Package harvests carefully with breathable, eco-friendly materials to maintain transit longevity.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">3</span>
                          <span><strong>Price Transparency:</strong> Keep prices reasonable and supportive of local communities; avoiding unfair manipulation or gouging.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-primary font-bold inline-flex items-center justify-center text-[10px] shrink-0">4</span>
                          <span><strong>Order Timeliness:</strong> Fulfill orders correctly within specified dispatch slots to ensure optimal buyer satisfaction.</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* === CERTIFICATIONS === */}
              {activeTab === 'certifications' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Trust & Verification</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Our Safety & Compliance</h2>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    To maintain an safe, verified agricultural marketplace, we mandate our farmers to hold core agricultural safety guidelines. Look for these icons on farmer profiles:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm text-center">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif italic font-bold text-slate-800 text-base mb-2">Verified Organic (F2H-O)</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Issued to farms verified to cultivate harvests completely free of artificial pesticides, GMO seeds, or non-organic chemical fertilizers.
                      </p>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm text-center">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif italic font-bold text-slate-800 text-base mb-2">Pesticide Free (F2H-PF)</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Authorized for farms utilizing natural integrated pest control, ensuring completely trace-free, chemical-free harvests.
                      </p>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm text-center">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4">
                        <Award className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif italic font-bold text-slate-800 text-base mb-2">Gap Registered (F2H-GAP)</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Ensures conformity to Good Agricultural Practices, clean water usage, worker hygiene parameters, and secure compost treatments.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                    Want to declare certifications for your farm? Head over to your Farmer Profile to update credentials.
                  </div>
                </div>
              )}

              {/* === CONTACT US === */}
              {activeTab === 'contact' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Direct Support Channels</span>
                      <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Let's Stay Connected</h2>
                    </div>
                    
                    <div className="flex flex-col gap-1 items-start md:items-end text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold text-slate-800">farmtohomee11@gmail.com</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold text-slate-800">09193604094</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100/50">
                        <h4 className="font-serif italic font-bold text-slate-800 text-base mb-2">Drop us a line!</h4>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">
                          Got questions about logistics, bulk restaurant orders, onboarding your farm, or feedback about fresh orders? Fill in the form. Our support team typically responds within a few hours.
                        </p>
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm text-xs font-bold">📍</div>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Manila, Philippines</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm text-xs font-bold">🌱</div>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Local Farmers' Network Initiative</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3">
                      {submitStatus?.success ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-4">
                          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-3xl">
                            ✓
                          </div>
                          <h4 className="font-serif italic font-bold text-slate-800 text-xl">Thank You!</h4>
                          <p className="text-slate-600 text-xs leading-relaxed max-w-sm mx-auto">
                            {submitStatus.message} Our support team has been notified and we will reach back to you at your email.
                          </p>
                          <button
                            onClick={() => setSubmitStatus(null)}
                            className="px-6 py-2.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-md mt-4"
                          >
                            Send another message
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                          {submitStatus?.success === false && (
                            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                              {submitStatus.message}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 text-left">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Name</label>
                              <input 
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium focus:border-primary transition-colors"
                                placeholder="Your full name"
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                              <input 
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium focus:border-primary transition-colors"
                                placeholder="your.name@gmail.com"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Phone Number (Optional)</label>
                            <input 
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium focus:border-primary transition-colors"
                              placeholder="e.g. 09193604094"
                            />
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Your Message</label>
                            <textarea 
                              name="message"
                              value={formData.message}
                              onChange={e => setFormData({ ...formData, message: e.target.value })}
                              required
                              rows={4}
                              className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium focus:border-primary transition-colors resize-none"
                              placeholder="Write your note, question or order inquiry here..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-slate-800 hover:bg-primary text-white rounded-xl text-[10px] uppercase font-bold tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <span className="animate-spin text-sm">↻</span>
                                <span>Sending message...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Submit Inquiry</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* === STORIES === */}
              {activeTab === 'stories' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Our Harvest, Our Pride</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Farmer Spotlights</h2>
                  </div>

                  <div className="space-y-6">
                    {[
                      {
                        name: 'Mang Juan',
                        location: 'La Trinidad, Benguet',
                        avatar: '🌾',
                        img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
                        quote: "We used to sell cabbage to wholesalers for only 5 pesos a kilo, losing half our savings. Through FarmToHome, we can get stable prices of 35-40 pesos, allowing my daughter to finish college.",
                        harvest: 'Cabbage, Romaine, Carrots'
                      },
                      {
                        name: 'Aling Maria',
                        location: 'Sariaya, Quezon Province',
                        avatar: '🥬',
                        img: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800',
                        quote: "Our native ginger and dynamic spice crops used to rot in the field due to lack of trucking services. Now we just package them right after harvesting, and local logistics riders match straight with city orders.",
                        harvest: 'Herbs & Spices, Ginger, Turmeric'
                      }
                    ].map((farmer, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-48 h-40 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                          <img src={farmer.img} alt={farmer.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{farmer.avatar}</span>
                              <h4 className="font-serif italic font-bold text-slate-800 text-lg">{farmer.name}</h4>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" /> {farmer.location}
                            </p>
                            <p className="text-slate-600 text-xs leading-relaxed italic font-medium mb-4">
                              "{farmer.quote}"
                            </p>
                          </div>
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Focus Crops:</span>
                            <span className="text-primary">{farmer.harvest}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === PRODUCT CARE === */}
              {activeTab === 'care' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Extending Freshness</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Fresh Produce Care Guide</h2>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    Our crops are clean, non-waxed, and free of long-term commercial chemicals. Because they are 100% natural, they should be stored properly to prolong shelf life. Follow our guide:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
                      <span className="text-2xl mb-3 block">🥬</span>
                      <h4 className="font-serif italic font-semibold text-slate-800 text-base mb-2">Leafy Greens & Lettuce</h4>
                      <ul className="space-y-2 text-slate-500 text-[11px] list-disc pl-4 leading-relaxed">
                        <li>Do not wash immediately. Excess moisture leads to quick spoilage.</li>
                        <li>Wrap snugly in damp paper towels to maintain moisture.</li>
                        <li>Store in the crisper drawer of your refrigerator for up to 5-7 days.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
                      <span className="text-2xl mb-3 block">🍠</span>
                      <h4 className="font-serif italic font-semibold text-slate-800 text-base mb-2">Root Crops & Potatoes</h4>
                      <ul className="space-y-2 text-slate-500 text-[11px] list-disc pl-4 leading-relaxed">
                        <li>Keep away from moisture and avoid refrigeration as it turns starches into sugar.</li>
                        <li>Store in a cool, dark, and well-ventilated basket.</li>
                        <li>Isolate onions from potatoes, as onions emit gases that speed up potato sprouting.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
                      <span className="text-2xl mb-3 block">🍅</span>
                      <h4 className="font-serif italic font-semibold text-slate-800 text-base mb-2">Tomatoes & Avocado</h4>
                      <ul className="space-y-2 text-slate-500 text-[11px] list-disc pl-4 leading-relaxed">
                        <li>Ripen completely at warm room temperature.</li>
                        <li>Do not refrigerate tomatoes before they are ripe, as it dampens their organic natural sweetness and breaks down the structure.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
                      <span className="text-2xl mb-3 block">🌱</span>
                      <h4 className="font-serif italic font-semibold text-slate-800 text-base mb-2">Fresh Herbs (Cilantro, Basil)</h4>
                      <ul className="space-y-2 text-slate-500 text-[11px] list-disc pl-4 leading-relaxed">
                        <li>Trim under the stems lightly.</li>
                        <li>Place them upright in a small glass holding fresh water, like a bouquet of flowers.</li>
                        <li>Cover with a light plastic cover loosely to trap moisture and pop into the fridge.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* === IMPACT === */}
              {activeTab === 'impact' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Ecological Footprint</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Direct Community Carbon Metric</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
                      <p className="text-[10px] uppercase font-bold text-primary/60 mb-1 tracking-wider">Carbon Eliminated</p>
                      <p className="text-4xl font-bold tracking-tighter font-serif italic text-primary">1,240 <span className="text-xs not-italic font-sans font-bold text-slate-400">kg CO2</span></p>
                      <p className="text-[10px] text-slate-500 mt-2 font-medium">By cutting down trans-shipment hubs and streamlining regional routes.</p>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
                      <p className="text-[10px] uppercase font-bold text-primary/60 mb-1 tracking-wider">Direct Agri Income increase</p>
                      <p className="text-4xl font-bold tracking-tighter font-serif italic text-primary">+45% <span className="text-xs not-italic font-sans font-bold text-slate-400">Per Harvest</span></p>
                      <p className="text-[10px] text-slate-500 mt-2 font-medium">Eliminating middle-party markups ensures 45% more income stays in farmers' hands.</p>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
                      <p className="text-[10px] uppercase font-bold text-primary/60 mb-1 tracking-wider">Plastic Wastes Reduced</p>
                      <p className="text-4xl font-bold tracking-tighter font-serif italic text-primary">850 <span className="text-xs not-italic font-sans font-bold text-slate-400">kg</span></p>
                      <p className="text-[10px] text-slate-500 mt-2 font-medium">Baskets, organic banana leaf wraps, and reusable packaging are prioritized.</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <h4 className="font-serif italic font-bold text-slate-800 text-base mb-2">Sustainable Food Sovereignty</h4>
                    <p className="text-slate-600 text-xs leading-relaxed font-normal">
                      By purchasing through FarmToHome, you are directly investing in short-mile agricultural supply networks. Shortening food physical distance prevents over-reliance on massive centralized cold-storage facilities and cuts city landfill food waste. Each organic tomato or bundle of bokchoy you enjoy ensures stable livelihoods for local communities.
                    </p>
                  </div>
                </div>
              )}

              {/* === FARM MAP === */}
              {activeTab === 'map' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Geographic Transparency</span>
                    <h2 className="text-4xl font-bold text-slate-800 tracking-tighter font-serif italic">Our Farming Regional Hubs</h2>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    Discover where your fresh produce comes from! We establish direct sourcing agreements across designated microzones:
                  </p>

                  <div className="bg-slate-900 text-white rounded-[2rem] p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[250px] shadow-inner border border-slate-800">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)] opacity-35" />
                    <div className="absolute top-4 left-4 text-[8px] uppercase tracking-[0.3em] font-bold text-slate-500">Stylized Agri Node Plot</div>
                    
                    <div className="relative text-center max-w-sm space-y-4">
                      <div className="flex gap-4 justify-center items-center">
                        <span className="text-sm">🏔️</span>
                        <div className="text-left">
                          <p className="font-serif italic font-bold text-emerald-400">Benguet Uplands Area</p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400">Cabbages, Potatoes, Carrots</p>
                        </div>
                      </div>
                      <div className="flex gap-4 justify-center items-center">
                        <span className="text-sm">🌾</span>
                        <div className="text-left">
                          <p className="font-serif italic font-bold text-emerald-400">Central Luzon Plains (Bulacan/Nueva Ecija)</p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400">Heirloom Rice, Root Crops</p>
                        </div>
                      </div>
                      <div className="flex gap-4 justify-center items-center">
                        <span className="text-sm">🥥</span>
                        <div className="text-left">
                          <p className="font-serif italic font-bold text-emerald-400">Southern Tagatay & Sariaya</p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400">Herbs, Ginger, Spices, Tropical Fruits</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-500 text-[10px] leading-relaxed text-center font-bold uppercase tracking-widest">
                    All partner farms are regularly visited to evaluate safety standard guidelines.
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
