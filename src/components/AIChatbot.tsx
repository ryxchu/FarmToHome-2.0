import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Bot, Loader2, Languages,
  Bell, CheckCircle, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

// Quick-reply chips per role and language so users know what to ask
const QUICK_REPLIES: Record<string, Record<'english' | 'tagalog', string[]>> = {
  buyer: {
    english: [
      'How do I place an order?',
      'How do I track my order?',
      'Can I cancel my order?',
      'What payment methods are accepted?',
      'How does delivery work?',
    ],
    tagalog: [
      'Paano mag-order?',
      'Paano ko ma-track ang order ko?',
      'Puwede ba akong mag-cancel?',
      'Anong paraan ng bayad?',
      'Paano ang delivery?',
    ],
  },
  farmer: {
    english: [
      'How do I list a product?',
      'How do I manage my orders?',
      'How does payment work for farmers?',
      'What certifications do I need?',
      'How do I get verified?',
    ],
    tagalog: [
      'Paano mag-lista ng produkto?',
      'Paano pamahalaan ang mga order?',
      'Paano ang bayad para sa magsasaka?',
      'Anong certifications ang kailangan?',
      'Paano maging verified?',
    ],
  },
  admin: {
    english: [
      'How do I verify a farmer?',
      'How do I manage users?',
      'How do I handle disputes?',
      'Platform commission rates?',
    ],
    tagalog: [
      'Paano mag-verify ng magsasaka?',
      'Paano pamahalaan ang mga user?',
      'Paano harapin ang mga dispute?',
      'Anong komisyon ng platform?',
    ],
  },
  guest: {
    english: [
      'What is FarmToHome?',
      'How do I sign up?',
      'Is this available in my area?',
      'How fresh are the products?',
    ],
    tagalog: [
      'Ano ang FarmToHome?',
      'Paano mag-sign up?',
      'Available ba ito sa aking lugar?',
      'Gaano kasariwa ang mga produkto?',
    ],
  },
};

export const AIChatbot: React.FC = () => {
  const { user, profile } = useAuth();
  const role = profile?.role || 'guest';
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'english' | 'tagalog'>('english');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin-specific pending farmers list
  const [pendingFarmers, setPendingFarmers] = useState<UserProfile[]>([]);
  const [isAdminPanelActive, setIsAdminPanelActive] = useState(true);

  // Greeting message per role and language
  const getGreeting = (lang: 'english' | 'tagalog') => {
    const greetings: Record<string, Record<'english' | 'tagalog', string>> = {
      buyer: {
        english: "Hi! 👋 I'm your FarmToHome assistant. I can help you with orders, delivery, products, and anything about the platform. What can I help you with today?",
        tagalog: "Kumusta! 👋 Ako ang iyong FarmToHome assistant. Makakatulong ako sa mga order, delivery, produkto, at lahat ng tungkol sa platform. Paano kita matutulungan ngayon?",
      },
      farmer: {
        english: "Hi Farmer! 👋 I'm your FarmToHome assistant. I can help you with listings, orders, verification, and platform guidelines. What do you need?",
        tagalog: "Kumusta Magsasaka! 👋 Ako ang iyong FarmToHome assistant. Makakatulong ako sa listings, orders, verification, at mga alituntunin ng platform. Ano ang kailangan mo?",
      },
      admin: {
        english: "Welcome, Admin! I'm the FarmToHome AI assistant. I can help with platform policies, user management guidance, and support procedures.",
        tagalog: "Maligayang pagdating, Admin! Ako ang FarmToHome AI assistant. Makakatulong ako sa mga patakaran ng platform, pamamahala ng users, at mga support procedures.",
      },
      guest: {
        english: "Hi! 👋 I'm the FarmToHome assistant. I can answer questions about our platform, how to sign up, how ordering works, and more. Ask me anything!",
        tagalog: "Kumusta! 👋 Ako ang FarmToHome assistant. Maaari akong sumagot ng mga tanong tungkol sa aming platform, paano mag-sign up, paano mag-order, at marami pa. Magtanong ka na!",
      },
    };
    return greetings[role]?.[lang] || greetings.guest[lang];
  };

  // Reset messages and show greeting when chat opens or language changes
  useEffect(() => {
    setMessages([{ role: 'bot', text: getGreeting(language) }]);
    setShowQuickReplies(true);
  }, [language, role]);

  // Admin: real-time pending farmers listener
  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      setPendingFarmers([]);
      return;
    }
    const q = query(collection(db, 'users'), where('role', '==', 'farmer'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter(u => u.status === 'pending' || !u.status);
      setPendingFarmers(list);
    }, (err) => {
      console.warn('Admin alert subscription error:', err);
    });
    return () => unsubscribe();
  }, [user, profile]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isAdminPanelActive]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setShowQuickReplies(false);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language,
          userRole: role,
          userName: profile?.fullName || user?.displayName || null,
          history: messages,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend not responding.');
      }

      const data = await response.json();

      if (data.success && data.text) {
        setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: language === 'tagalog'
            ? 'Paumanhin, hindi ko masagot yan. Subukan ulit.'
            : "Sorry, I couldn't process that. Please try again.",
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: language === 'tagalog'
          ? 'Hindi ako makakonekta ngayon. Pakisubukan muli maya-maya.'
          : "I'm having trouble connecting right now. Please try again shortly.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const handleReset = () => {
    setMessages([{ role: 'bot', text: getGreeting(language) }]);
    setShowQuickReplies(true);
    setInput('');
  };

  const handleVerifyFarmer = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'verified' });
    } catch (err) {
      console.error('Verification error:', err);
    }
  };

  const quickReplies = QUICK_REPLIES[role]?.[language] || QUICK_REPLIES.guest[language];

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          if (profile?.role === 'admin') setIsAdminPanelActive(true);
        }}
        className="fixed bottom-[90px] lg:bottom-8 right-4 lg:right-8 p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] cursor-pointer"
        id="floater-fab-btn"
        aria-label="Open FarmToHome assistant"
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed bottom-[160px] lg:bottom-24 right-4 lg:right-8 w-full max-w-[calc(100%-2rem)] sm:max-w-[390px] h-[500px] sm:h-[540px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[100] border border-zinc-100"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-white rounded-xl p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src="/logo.png"
                    alt="FarmToHome"
                    className="w-full h-full object-contain"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm leading-none truncate select-none">
                    {profile?.role === 'admin' ? 'Admin Hub' : 'FarmToHome AI'}
                  </h3>
                  <span className="text-[10px] text-white/60 block leading-tight select-none mt-0.5">
                    {profile?.role === 'admin' ? 'Platform Control' : 'Ask me anything about FarmToHome'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Admin tab toggle */}
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

                {/* Language toggle — only for chat view */}
                {(profile?.role !== 'admin' || !isAdminPanelActive) && (
                  <div className="flex bg-white/10 rounded-lg p-0.5 shrink-0">
                    <button
                      onClick={() => setLanguage('english')}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md transition-all select-none ${language === 'english' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('tagalog')}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md transition-all select-none ${language === 'tagalog' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                    >
                      TL
                    </button>
                  </div>
                )}

                {/* Reset chat */}
                {(profile?.role !== 'admin' || !isAdminPanelActive) && (
                  <button
                    onClick={handleReset}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                    title="Reset chat"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                  aria-label="Close chat"
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
                      Review and verify pending farmer registrations below.
                    </p>
                  </div>
                </div>

                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Pending Verification ({pendingFarmers.length})
                </p>

                <div className="space-y-3 flex-grow pb-4">
                  {pendingFarmers.map(f => (
                    <div key={f.uid} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 italic shrink-0">
                          {f.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 leading-tight truncate">{f.fullName}</p>
                          <p className="text-[9.5px] font-medium text-slate-400 truncate mt-0.5">{f.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleVerifyFarmer(f.uid)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all rounded-xl font-bold uppercase tracking-wider text-[8.5px] flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve & Verify
                      </button>
                    </div>
                  ))}

                  {pendingFarmers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-2xl p-4 border border-slate-100">
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">Queue Cleared</h4>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal max-w-[200px]">
                        No pending farmer registrations at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* AI Chat View */
              <>
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-3 bg-zinc-50">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'bot' && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mr-2 mt-1">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                        m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-white text-zinc-800 rounded-tl-none border border-zinc-100'
                      }`}>
                        {m.role === 'user' ? (
                          <span className="text-[13px] leading-relaxed">{m.text}</span>
                        ) : (
                          <div className="chatbot-markdown prose prose-sm max-w-none text-[13px] leading-relaxed">
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-zinc-100 flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {language === 'tagalog' ? 'Nag-iisip...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quick reply chips — shown only at the start */}
                  {showQuickReplies && !loading && messages.length <= 1 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {quickReplies.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickReply(q)}
                          className="px-3 py-1.5 text-[11px] font-medium bg-white border border-primary/20 text-primary rounded-full hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-zinc-100 flex gap-2 shrink-0 items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={language === 'tagalog' ? 'Mag-type ng mensahe...' : 'Ask about FarmToHome...'}
                    className="flex-grow px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
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