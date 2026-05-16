import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isQuotaError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { InlineChat } from '../components/InlineChat';
import { MessageSquare, User, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Messages: React.FC = () => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', profile.uid),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const convs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        convs.sort((a, b) => {
          const dateA = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
          const dateB = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setConversations(convs);
      } catch (error) {
        if (!isQuotaError(error)) {
          handleFirestoreError(error, OperationType.LIST, 'conversations');
        } else {
          console.warn("Conversations list hit quota - items may be missing");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Check every minute instead of real-time
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleOpenConversation = async (conv: any) => {
    if (selectedConversation?.conv?.id === conv.id) return;
    
    setLoading(true);
    try {
      const recipientId = conv.participants.find((id: string) => id !== profile?.uid);
      const docSnap = await getDoc(doc(db, 'users', recipientId));
      if (docSnap.exists()) {
        setSelectedConversation({ conv, recipient: { ...docSnap.data(), uid: docSnap.id } });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'recipient_profile');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.buyerId === profile?.uid ? conv.farmerName : conv.buyerName;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full h-[calc(100vh-73px)] flex flex-col bg-slate-50/30">
      <div className="px-8 py-6 bg-white border-b border-slate-100">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tighter font-serif italic">Messages</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-1">Real-time Trading Communication</p>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-96 lg:w-[450px] border-r border-slate-100 flex flex-col bg-white">
          <div className="p-6 border-b border-slate-50">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search conversations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading && conversations.length === 0 ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-50" />
              ))
            ) : filteredConversations.length === 0 ? (
              <div className="py-20 text-center px-6">
                <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  {searchQuery ? "No matches found" : "No conversations yet"}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const recipientName = conv.buyerId === profile?.uid ? conv.farmerName : conv.buyerName;
                const isSelected = selectedConversation?.conv?.id === conv.id;
                const lastDate = conv.lastMessageAt?.toDate?.() || new Date(conv.lastMessageAt || 0);
                
                return (
                  <button 
                    key={conv.id}
                    onClick={() => handleOpenConversation(conv)}
                    className={`w-full p-4 rounded-2xl transition-all flex items-center gap-4 text-left group ${
                      isSelected 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent-light p-0.5 overflow-hidden flex-shrink-0 shadow-sm border border-white/20">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participants.find((id: string) => id !== profile?.uid)}`} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <p className={`text-base font-bold truncate tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {recipientName}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {lastDate.getTime() > 0 ? (new Date().getTime() - lastDate.getTime() < 86400000 ? lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : lastDate.toLocaleDateString()) : ''}
                        </span>
                      </div>
                      <p className={`text-sm truncate italic transition-opacity ${isSelected ? 'bg-white/10 text-white/90 p-1.5 px-3 rounded-lg' : 'text-slate-400 opacity-80'}`}>
                        {conv.lastMessage || 'New connection'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col bg-white">
          {selectedConversation ? (
            <InlineChat 
              conversationId={selectedConversation.conv.id} 
              recipientProfile={selectedConversation.recipient} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-slate-50/10">
              <div className="w-24 h-24 bg-white rounded-[2rem] border-4 border-slate-50 flex items-center justify-center mb-8 shadow-xl text-primary/20 rotate-6 transition-transform hover:rotate-0">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-serif italic mb-2">Select a Conversation</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                Choose a connection from the left to view your history and messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
