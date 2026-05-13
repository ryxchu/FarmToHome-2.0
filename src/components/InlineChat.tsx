import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { Send, User } from 'lucide-react';
import { motion } from 'motion/react';

interface InlineChatProps {
  conversationId: string;
  recipientProfile: UserProfile;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export const InlineChat: React.FC<InlineChatProps> = ({ conversationId, recipientProfile }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`));

    return () => unsubscribe();
  }, [conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const content = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      const messageData = {
        senderId: profile.uid,
        content,
        createdAt: serverTimestamp(),
      };
      
      const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      await setDoc(messageRef, { ...messageData, id: messageRef.id });

      // Create notification for recipient
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: recipientProfile.uid,
        title: 'New Message',
        message: `${profile.fullName} sent you a message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        type: 'message',
        relatedId: conversationId,
        read: false,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-center relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-light p-0.5 overflow-hidden border border-slate-100 shadow-sm">
            {recipientProfile.photoURL ? (
              <img src={recipientProfile.photoURL} alt="" className="w-full h-full object-cover bg-white" />
            ) : (
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${recipientProfile.uid}`} className="w-full h-full" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight font-serif italic text-slate-800">{recipientProfile.farmName || recipientProfile.fullName}</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[11px] text-slate-400 capitalize tracking-widest font-bold">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-8 space-y-4 bg-slate-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === profile?.uid;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] p-5 rounded-3xl text-base shadow-sm ${
                    isOwn 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                  }`}
                >
                  <p className="font-medium leading-relaxed">{msg.content}</p>
                  <div className={`text-[10px] mt-1.5 opacity-60 font-bold uppercase tracking-widest ${isOwn ? 'text-right' : 'text-left'}`}>
                    {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-100 bg-white">
        <div className="flex gap-4">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={loading}
            placeholder="Write a message..."
            className="flex-grow px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base focus:outline-none focus:border-primary/20 transition-all font-medium"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="w-16 h-16 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </form>
    </div>
  );
};
