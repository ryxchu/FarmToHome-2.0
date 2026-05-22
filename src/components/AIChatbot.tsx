import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Languages, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'english' | 'tagalog'>('english');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "Hi! I'm your FarmToHome assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update initial message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'bot') {
      const initialMsg = language === 'tagalog' 
        ? "Kumusta! Ako ang iyong FarmToHome assistant. Paano kita matutulungan ngayon?"
        : "Hi! I'm your FarmToHome assistant. How can I help you today?";
      setMessages([{ role: 'bot', text: initialMsg }]);
    }
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          language,
          history: messages
        })
      });
      const data = await response.json();

      if (data.success && data.text) {
        setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: data.error || "I'm sorry, I couldn't process that. Can you try again?" }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100]"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            className="fixed bottom-24 right-6 w-full max-w-[380px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[100] border border-zinc-100"
          >
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none">FarmToHome AI</h3>
                  <span className="text-[10px] text-white/60">Always online to help</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-white/10 rounded-lg p-1 mr-2">
                  <button 
                    onClick={() => setLanguage('english')}
                    className={`px-2 py-1 text-[10px] rounded-md transition-all ${language === 'english' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLanguage('tagalog')}
                    className={`px-2 py-1 text-[10px] rounded-md transition-all ${language === 'tagalog' ? 'bg-white text-primary font-bold' : 'text-white hover:bg-white/5'}`}
                  >
                    TL
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white text-zinc-800 rounded-tl-none'
                  }`}>
                    {m.role === 'user' ? (
                      m.text
                    ) : (
                      <div className="chatbot-markdown max-w-none">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
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
                      {language === 'tagalog' ? "Nag-iisip..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={language === 'tagalog' ? "Mag-type ng mensahe..." : "Type a message..."}
                className="flex-grow px-4 py-2 bg-zinc-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
              />
              <button 
                type="submit"
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                disabled={loading}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
