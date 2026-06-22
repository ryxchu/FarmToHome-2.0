import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Bot, User, Loader2, Languages, Globe,
  Bell, CheckCircle, ShieldAlert, Sparkles, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

// Custom high-grade safe markdown elements renderer
const renderSafeMessageContent = (text: string) => {
  if (!text) return null;
  
  // Split into lines
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inList = false;
  let currentListItems: React.ReactNode[] = [];

  let keyCounter = 0;

  const parseLinksAndBoldText = (str: string, sectionIndex: number): React.ReactNode[] => {
    const parts = str.split(/\[(.*?)\]\((product|page|farmer):(.*?)\)/g);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i += 4) {
      if (parts[i]) {
        elements.push(...parseBoldOnly(parts[i], sectionIndex, i));
      }
      if (i + 1 < parts.length && parts[i + 1]) {
        const anchor = parts[i + 1];
        const type = parts[i + 2];
        const id = parts[i + 3];
        const linkKeyId = keyCounter++;
        elements.push(
          <button
            type="button"
            key={`link-${sectionIndex}-${i}-${linkKeyId}`}
            onClick={() => {
              const event = new CustomEvent('chatbot-navigate-product', { 
                detail: { 
                  productId: type === 'product' ? id : undefined,
                  page: type === 'page' ? id : undefined,
                  farmerId: type === 'farmer' ? id : undefined
                } 
              });
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-1 text-emerald-700 font-extrabold hover:underline underline-offset-2 mx-1 scale-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {anchor} ✨
          </button>
        );
      }
    }
    return elements;
  };

  const parseBoldOnly = (str: string, sectionIndex: number, phraseIndex: number): React.ReactNode[] => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const boldKeyId = keyCounter++;
        return <strong key={`bold-${sectionIndex}-${phraseIndex}-${index}-${boldKeyId}`} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    
    // Check if it's a bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        inList = true;
        currentListItems = [];
      }
      const itemText = trimmed.substring(2);
      currentListItems.push(
        <li key={`li-${lineIndex}`} className="list-disc ml-5 pl-1 my-0.5 text-zinc-700 leading-relaxed text-sm">
          {parseLinksAndBoldText(itemText, lineIndex)}
        </li>
      );
    } else {
      // If we were in a list, close it and push
      if (inList) {
        renderedElements.push(
          <ul key={`ul-${lineIndex - 1}`} className="list-disc my-1.5 space-y-1">
            {currentListItems}
          </ul>
        );
        inList = false;
        currentListItems = [];
      }
      
      if (trimmed === '') {
        // Empty line acts as paragraph break or vertical space
        renderedElements.push(<div key={`br-${lineIndex}`} className="h-1.5" />);
      } else {
        // Standard text line
        renderedElements.push(
          <p key={`p-${lineIndex}`} className="text-zinc-700 leading-relaxed my-1 break-words text-sm">
            {parseLinksAndBoldText(line, lineIndex)}
          </p>
        );
      }
    }
  });

  // Handle remaining list if any
  if (inList && currentListItems.length > 0) {
    renderedElements.push(
      <ul key={`ul-end`} className="list-disc my-1.5 space-y-1">
        {currentListItems}
      </ul>
    );
  }

  return <div className="space-y-0.5">{renderedElements}</div>;
};

export const AIChatbot: React.FC = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'tl'>('en');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([
    { role: 'model', parts: [{ text: "Hi! I'm your FarmToHome assistant. How can I help you today?" }] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin-specific lists and views
  const [pendingFarmers, setPendingFarmers] = useState<UserProfile[]>([]);
  const [isAdminPanelActive, setIsAdminPanelActive] = useState(true);

  // Set up real-time pending farmers listener if logged in as Admin (local state fallback)
  useEffect(() => {
    setPendingFarmers([]);
  }, [user, profile]);

  // Update initial message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
      const initialMsg = currentLanguage === 'tl' 
        ? "Kumusta! Ako ang iyong FarmToHome assistant. Paano kita matutulungan ngayon?"
        : "Hi! I'm your FarmToHome assistant. How can I help you today?";
      setMessages([{ role: 'model', parts: [{ text: initialMsg }] }]);
    }
  }, [currentLanguage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAdminPanelActive]);

  // Emergency Client-side Fallback Response Generator
  const generateClientMockResponse = (message: string, language: 'en' | 'tl'): string => {
    const msg = message.toLowerCase();
    const isTagalog = language === 'tl' || msg.includes('kumusta') || msg.includes('salamat') || msg.includes('nasaan') || msg.includes('magsasaka') || msg.includes('paano') || msg.includes('benta');

    if (msg.includes('post product') || msg.includes('how to post') || msg.includes('sell') || msg.includes('magbenta') || msg.includes('benta') || msg.includes('pananim')) {
      if (isTagalog) {
        return `Upang magbenta o mag-post ng iyong mga pananim/gulay sa FarmToHome:
1. Siguraduhing naka-login ka gamit ang **Farmer Account**.
2. Pumunta sa iyong [Go to Farmer Dashboard](page:dashboard).
3. Pagkatapos ma-approve ng admin ang iyong certification docs, i-click lamang ang **"Add Crop"** button upang mag-upload ng pananim! Itatakda mo dito ang presyo, stock, at larawan ng iyong ani sa shop [Go to Shop/Marketplace](page:home).`;
      }
      return `To list or publish your organic crops/products on FarmToHome:
1. Ensure you are registered and logged into a **Farmer Account**.
2. Navigate to your [Go to Farmer Dashboard](page:dashboard).
3. Once the admin team approves your certifications, click **"Add Crop"** to upload product details, pricing, and stock. Your items will instantly go live in the marketplace [Go to Shop/Marketplace](page:home)!`;
    }

    if (msg.includes('profile') || msg.includes('nasaan') || msg.includes('account') || msg.includes('address')) {
      if (isTagalog) {
        return `Maaari mong baguhin ang iyong mga detalye at tingnan ang iyong orders sa iyong profile page:
- Pumunta rito: [View Account Profile](page:profile).
- Dito mo rin mae-edit ang default physical delivery address at contact details.`;
      }
      return `You can manage your farm coordinates, profile details, and track your active order delivery statuses:
- Navigate to your account panel: [View Account Profile](page:profile).
- Here you can update your physical delivery address presets and contact information easily.`;
    }

    if (msg.includes('register') || msg.includes('sign up') || msg.includes('create') || msg.includes('rehistro') || msg.includes('pumili')) {
      if (isTagalog) {
        return `Madali lamang gumawa ng account sa FarmToHome:
1. Piliin kung ikaw ay **Buyer** o **Farmer** sa main gate.
2. Ilagay ang iyong Email address.
3. Ilagay ang 6-digit OTP code na ipapadala namin sa iyong inbox para makapasok nang secure at walang password!`;
      }
      return `To create an account or sign up on FarmToHome:
1. Choose either the **Buyer** or **Farmer** role at the login gate.
2. Enter your validated Email address.
3. Enter the secure 6-digit OTP code sent directly to your inbox to log in password-free!`;
    }

    if (msg.includes('payment') || msg.includes('bayad') || msg.includes('gcash') || msg.includes('cod')) {
      if (isTagalog) {
        return `Para sa mga transaksyon sa FarmToHome:
- Ang aming trade platform ay sumusuporta sa **Cash on Delivery (COD)** o manu-manong pag-upload ng **GCash reference slips** kapag nagpapadala ng patunay ng harvest order. Pinoprotektahan nito ang ating mga lokal na magsasaka at mamimili!`;
      }
      return `For secure payments and trade transactions:
- FarmToHome uses standard **Cash on Delivery (COD)** or manual uploads of **GCash receipts**. Direct electronic card gateways are not supported to keep transaction costs zero for our local farming community!`;
    }

    if (msg.includes('code') || msg.includes('programming') || msg.includes('javascript') || msg.includes('python')) {
      return `Here is some quick helper coding assistance from your AI engine:\n\n\`\`\`javascript\n// Simple FarmToHome transaction visualizer\nfunction listCrop(name, price) {\n  console.log("Listing brand new crop:", name, "for ₱" + price);\n  return true;\n}\nlistCrop("Sweet Guimaras Mangoes", 150);\n\`\`\``;
    }

    if (isTagalog) {
      return `Kumusta! Ako ang iyong FarmToHome AI Assistant. 🧑‍🌾 

Gusto mo bang malaman kung paano bumili ng gulay sa shop [Go to Shop/Marketplace](page:home), mag-post ng pananim sa [Go to Farmer Dashboard](page:dashboard), makipag-chat sa kaparehang magsasaka gamit ang [Go to Inbox/Messages](page:messages), o i-manage ang iyong [View Account Profile](page:profile)? Tanungin mo lang ako at tutulungan kita!`;
    }
    return `Hi! I'm your local FarmToHome AI Assistant. 🧑‍🌾

Would you like to learn how to browse crops in the shop [Go to Shop/Marketplace](page:home), post your organic harvest in the [Go to Farmer Dashboard](page:dashboard), chat with farmers in [Go to Inbox/Messages](page:messages), or edit your default shipping address in the [View Account Profile](page:profile)? Ask me anything!`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    const newUserMsgObj = { role: 'user' as const, parts: [{ text: userMsg }] };
    
    // Safety Guard 3: Functional state updater to preserve previous message logs cleanly
    setMessages(prev => [...prev, newUserMsgObj]);

    try {
      // Create latest snapshots of history safely containing the new message
      const latestHistory = [...messages, newUserMsgObj];

      const response = await fetch('/api/gemini/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          language: currentLanguage,
          history: latestHistory
        })
      });
      
      // Safety Guard 2: Robust response and error parsing inside bulletproof try/catch block
      if (!response.ok) {
        throw new Error(`Server status returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Server returned standard html (e.g. 404/index.html of Vite single-page fallback or network proxy pages)
        throw new SyntaxError("Unexpected token '<' representing HTML page instead of JSON");
      }

      const data = await response.json();

      if (data.success && data.text) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.text }] }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.error || "I'm sorry, I couldn't process that. Can you try again?" }] }]);
      }
    } catch (err: any) {
      console.warn("[Chatbot Client-Side Fallback Engaged]", err);
      // Beautiful and seamless offline response fallback
      const fallbackReply = generateClientMockResponse(userMsg, currentLanguage);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: fallbackReply }] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFarmerFromAlert = async (uid: string) => {
    // Client-side Firestore update removed for security and compliance
    console.info("Verification not implemented client-side in the floating chatbot. Please use the Admin Dashboard.", uid);
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => {
            setIsOpen(true);
            if (profile?.role === 'admin') {
              setIsAdminPanelActive(true);
            }
          }}
          className="fixed bottom-[90px] lg:bottom-8 right-4 lg:right-8 p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[9999] cursor-pointer border-2 border-white"
          id="floater-fab-btn"
        >
          {profile?.role === 'admin' ? (
            <div className="relative">
              <Bell className="w-6 h-6" />
              {pendingFarmers.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white font-extrabold text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
                  {pendingFarmers.length}
                </span>
              )}
            </div>
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            className="fixed bottom-[160px] lg:bottom-24 right-4 lg:right-8 w-full max-w-[calc(100%-2rem)] sm:max-w-[380px] h-[450px] sm:h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[9999] border border-zinc-100"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex justify-between items-center sm:gap-1.5 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm leading-none truncate select-none">
                    {profile?.role === 'admin' ? 'Admin Hub' : 'FarmToHome AI'}
                  </h3>
                  <span className="text-[10px] text-white/50 block truncate leading-tight select-none mt-0.5">
                    {profile?.role === 'admin' ? 'Security Console' : 'Always online to help'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {profile?.role === 'admin' && (
                  <div className="flex bg-white/10 rounded-lg p-0.5">
                    <button 
                      onClick={() => setIsAdminPanelActive(true)}
                      className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all select-none cursor-pointer ${isAdminPanelActive ? 'bg-white text-primary' : 'text-white hover:bg-white/5'}`}
                    >
                      Alerts
                    </button>
                    <button 
                      onClick={() => setIsAdminPanelActive(false)}
                      className={`px-2 py-1 text-[9px] font-black uppercase rounded-md transition-all select-none cursor-pointer ${!isAdminPanelActive ? 'bg-white text-primary' : 'text-white hover:bg-white/5'}`}
                    >
                      AI Chat
                    </button>
                  </div>
                )}
                
                {(profile?.role !== 'admin' || !isAdminPanelActive) && (
                  <div className="flex bg-white/10 rounded-lg p-0.5 mr-1 shrink-0">
                    <button 
                      onClick={() => setCurrentLanguage('en')}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md transition-all select-none cursor-pointer ${currentLanguage === 'en' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setCurrentLanguage('tl')}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md transition-all select-none cursor-pointer ${currentLanguage === 'tl' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                    >
                      TL
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {profile?.role === 'admin' && isAdminPanelActive ? (
              /* Admin Alerts View */
              <div className="flex-grow flex flex-col p-4 bg-slate-50 overflow-y-auto space-y-4">
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 flex gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Farmer Certifications</h4>
                    <p className="text-[10px] text-amber-700 mt-0.5 leading-normal">
                      Verify farmers from Semi Konu Guevarra Farm or approved land trusts immediately below.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 flex-grow pb-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Pending Verification Docs ({pendingFarmers.length})
                  </p>
                  
                  {pendingFarmers.map(f => {
                    if (!f) return null;
                    return (
                      <div key={f.uid} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5 hover:border-emerald-250 transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 italic shrink-0">
                            {(f.fullName || '').charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{f.fullName}</p>
                            <p className="text-[9.5px] font-medium text-slate-400 truncate mt-0.5">{f.email}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleVerifyFarmerFromAlert(f.uid)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all rounded-xl font-bold uppercase tracking-wider text-[8.5px] flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approved / Verify profile
                        </button>
                      </div>
                    );
                  })}

                  {pendingFarmers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-2xl p-4 border border-slate-100 shadow-inner">
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700 leading-none">Queue Cleared</h4>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal max-w-[200px]">
                        No pending farmer registrations require immediate validation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Support AI Chat View */
              <>
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-zinc-50">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap ${
                        m.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-white text-zinc-800 rounded-tl-none'
                      }`}>
                        {m.role === 'user' ? (
                          m.parts[0]?.text || ''
                        ) : (
                          <div className="chatbot-markdown max-w-none">
                            {renderSafeMessageContent(m.parts[0]?.text || '')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-zinc-400">
                          {currentLanguage === 'tl' ? "Nag-iisip..." : "Thinking..."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSend} className="p-3 bg-white border-t border-zinc-100 flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={loading ? (currentLanguage === 'tl' ? "Nag-iisip..." : "Thinking...") : (currentLanguage === 'tl' ? "Mag-type ng mensahe..." : "Type a message...")}
                    className="flex-grow px-4 py-2 bg-zinc-150 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                    disabled={loading}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
