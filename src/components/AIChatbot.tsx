import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Bot, User, Loader2, Languages, Globe,
  Bell, CheckCircle, ShieldAlert, Sparkles, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { FARMTOHOME_KNOWLEDGE_BASE } from '../data/chatbotKnowledgeBase';

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
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Verify Gemini API key is available in environment on component mount
  useEffect(() => {
    const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!key || key.trim() === '') {
      setIsApiKeyMissing(true);
    } else {
      setIsApiKeyMissing(false);
    }
  }, []);

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
    const msg = message.toLowerCase().trim();
    const isTagalog = language === 'tl' || msg.includes('kumusta') || msg.includes('salamat') || msg.includes('nasaan') || msg.includes('magsasaka') || msg.includes('paano') || msg.includes('benta') || msg.includes('tagalog');

    // 1. Greetings & Politeness
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('kumusta')) {
      if (isTagalog) {
        return `Kumusta! Ako ang iyong FarmToHome AI Assistant. 🧑‍🌾 Paano kita matutulungan ngayon?`;
      }
      return `Hi! I'm your FarmToHome AI Assistant. 🧑‍🌾 How can I help you today?`;
    }

    if (msg.includes('thank') || msg.includes('salamat') || msg.includes('thanks') || msg.includes('ty')) {
      if (isTagalog) {
        return `Walang anuman! Masaya akong makatulong sa iyo. Sabihin mo lang kung mayroon ka pang ibang katanungan.`;
      }
      return `You're very welcome! Glad I could help. Let me know if you have any other questions!`;
    }

    // 2. Listing Crops / Selling
    if (msg.includes('post product') || msg.includes('how to post') || msg.includes('sell') || msg.includes('magbenta') || msg.includes('benta') || msg.includes('pananim') || msg.includes('add crop')) {
      if (isTagalog) {
        return `Upang magbenta o mag-post ng iyong mga pananim o gulay sa FarmToHome:
1. Siguraduhing naka-login ka gamit ang isang **Farmer Account**.
2. Mag-upload ng iyong Certification Documents sa iyong [Go to Farmer Dashboard](page:dashboard).
3. Matapos ma-approve ng admin ang iyong dokumento, i-click lamang ang **"Add Crop"** button sa iyong dashboard upang mag-post ng pananim. Lalabas agad ito sa shop [Go to Shop/Marketplace](page:home)!`;
      }
      return `To list or publish your organic crops/products on FarmToHome:
1. Ensure you are registered and logged into a **Farmer Account**.
2. Head over to your [Go to Farmer Dashboard](page:dashboard) and upload proof of land ownership/credentials.
3. Once the admin team approves your certifications, click **"Add Crop"** to upload product details, pricing, and stock. Your items will instantly go live in the marketplace [Go to Shop/Marketplace](page:home)!`;
    }

    // 3. User Profile / Settings
    if (msg.includes('profile') || msg.includes('account') || msg.includes('address') || msg.includes('nasaan ang profile')) {
      if (isTagalog) {
        return `Maaari mong baguhin ang iyong personal na detalye, address presets, at contact info:
- Pumunta sa iyong profile settings dito: [View Account Profile](page:profile).
- Dito mo rin mae-edit ang default physical delivery address para sa mga dumarating na order.`;
      }
      return `You can manage your coordinates, profile details, and track active order statuses:
- Navigate to your account settings here: [View Account Profile](page:profile).
- Here you can update your physical delivery address presets and contact details easily.`;
    }

    // 4. Register or Sign Up
    if (msg.includes('register') || msg.includes('sign up') || msg.includes('create') || msg.includes('rehistro') || msg.includes('pumili') || msg.includes('register account')) {
      if (isTagalog) {
        return `Madali lamang gumawa ng account sa FarmToHome:
1. Piliin kung ikaw ay **Buyer** o **Farmer** sa login modal.
2. Ilagay ang iyong Email address.
3. Ilagay ang 6-digit OTP code na ipapadala namin sa iyong email upang makapasok nang ligtas at walang password!`;
      }
      return `To create an account or sign up on FarmToHome:
1. Choose either the **Buyer** or **Farmer** role at the login section.
2. Enter your validated Email address.
3. Enter the secure 6-digit OTP code sent directly to your inbox to log in password-free!`;
    }

    // 5. Payments
    if (msg.includes('payment') || msg.includes('bayad') || msg.includes('gcash') || msg.includes('cod') || msg.includes('magbayad')) {
      if (isTagalog) {
        return `Para sa ligtas na transaksyon sa FarmToHome, sumusuporta kami sa:
- **Cash on Delivery (COD)** o manu-manong pag-upload ng **GCash reference details** kapag nagpapatunay ng iyong order. Upang mapanatiling zero ang service fee ng ating mga magsasaka, hindi kami gumagamit ng mga awtomatikong credit card gateways.`;
      }
      return `For secure payments and trade transactions:
- FarmToHome supports **Cash on Delivery (COD)** or manual uploads of **GCash transaction receipts** during checkout. We do not use automated third-party card processors to avoid service charges and keep fees completely free for our local farming community!`;
    }

    // 6. Programming (ChatGPT Core Fallback helper)
    if (msg.includes('code') || msg.includes('programming') || msg.includes('javascript') || msg.includes('python') || msg.includes('typescript')) {
      return `Here is some quick coding assistance from your AI engine:\n\n\`\`\`javascript\n// Simple FarmToHome transaction listing helper\nfunction listCrop(name, price) {\n  console.log("Listing brand new crop:", name, "for ₱" + price);\n  return true;\n}\nlistCrop("Sweet Guimaras Mangoes", 150);\n\`\`\``;
    }

    // 7. General Fallback Answers
    if (isTagalog) {
      return `Salamat sa iyong katanungan! Ako ang iyong FarmToHome assistant. Maaari mo akong tanungin tungkol sa pagbili ng mga sariwang gulay o prutas, pagre-register bilang magsasaka, pag-track ng mga order, o tungkol sa anumang paksa na nais mong malaman. Paano kita magagabayan ngayon?`;
    }
    return `Thank you for your message! I'm your conversational FarmToHome support assistant. Feel free to ask me anything about browsing the marketplace, registering as a farmer, how order tracking works, or general/technical topics. What can I help you with today?`;
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

    let response: Response | undefined = undefined;

    try {
      // 1. API Key Check: Ensure VITE_GEMINI_API_KEY is defined in environment before any API call
      const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!envKey || envKey.trim() === '') {
        throw new Error("VITE_GEMINI_API_KEY is missing or undefined at runtime. Please configure your hosting environment environment variables.");
      }

      // Create latest snapshots of history safely containing the new message
      const latestHistory = [...messages, newUserMsgObj];

      // Format history turns precisely as the Gemini generateContent API expects
      const formattedContents = latestHistory.map((item) => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.parts?.[0]?.text || '' }]
      }));

      const languageInstruction = (currentLanguage.toUpperCase() === 'TL' || currentLanguage === 'tl')
        ? 'Always respond in Filipino/Tagalog. Translate all answers from the knowledge base into natural conversational Filipino.'
        : 'Always respond in English.';

      const systemInstructionText = `You are a helpful support assistant for FarmToHome, a Filipino farm-to-consumer marketplace.
Use ONLY the following knowledge base to answer questions.
If the answer is not in the knowledge base, say: "I'm not sure about that. Please contact our support team for help."
Never repeat your introduction as an answer. Always read the user's actual message and respond to it directly and conversationally.

KNOWLEDGE BASE:
${FARMTOHOME_KNOWLEDGE_BASE}

${languageInstruction}

PLATFORM NAVIGATION INTEGRATION (Provide exact redirection markdown links only when highly relevant to the query):
- [Go to Shop/Marketplace](page:home) - to let users browse and purchase fresh crops.
- [Go to Farmer Dashboard](page:dashboard) - for farmers to upload land certifications, post crops, and view earnings.
- [Go to Inbox/Messages](page:messages) - to chat in real-time with farmers/buyers.
- [Track Delivery Progress](page:tracking) - to view delivery statuses of active orders.
- [View Account Profile](page:profile) - to edit delivery addresses, contact details, and account settings.`;

      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${envKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: formattedContents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          }
        })
      });
      
      // 2. Response validation: Check HTTP status is 200 first
      if (!response || response.status !== 200) {
        throw new Error(`HTTP Error Status ${response ? response.status : 'unknown'}: Failed to execute support chat operation.`);
      }

      // Validate response is actually valid JSON instead of HTML error fallbacks
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new TypeError(`Expected response Content-Type to be 'application/json' but received '${contentType}', representing a server exception page.`);
      }

      const data = await response.json();

      // Extract response content securely using the specific candidates structure
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (replyText) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: replyText }] }]);
      } else {
        throw new Error("Invalid response schema from Gemini API: missing candidates content parts text.");
      }
    } catch (err: any) {
      // 4. Detailed error handling and logging for production diagnostics
      console.error("[Chatbot Error Handler] Production API Error details:", {
        message: err?.message || String(err),
        status: response?.status || 'No Response'
      });
      
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
                  {isApiKeyMissing && (
                    <div className="p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-lg text-amber-800 shadow-xs leading-normal" id="api-key-warning-box">
                      <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-wider text-amber-600 mb-1">
                        <ShieldAlert className="w-4 h-4" /> VITE_GEMINI_API_KEY Unavailable
                      </div>
                      <p className="text-[11px] text-amber-700 font-medium">
                        The chatbot has detected that VITE_GEMINI_API_KEY is undefined in this environment. Direct AI requests are routed through local offline backup modes.
                      </p>
                    </div>
                  )}

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
