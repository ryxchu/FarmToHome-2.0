import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { Send, X, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  conversationId: string;
  recipientProfile: UserProfile;
  onClose: () => void;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export const Chat: React.FC<ChatProps> = ({ conversationId, recipientProfile, onClose }) => {
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
      // Add message
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

      // Update conversation last message
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
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-8 right-8 w-[400px] max-w-[90vw] h-[600px] max-h-[80vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col z-[150] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary p-6 flex justify-between items-center text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
            {recipientProfile.photoURL ? (
              <img src={recipientProfile.photoURL} alt="" className="w-full h-full object-contain bg-accent-light" />
            ) : (
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${recipientProfile.uid}`} className="w-full h-full" />
            )}
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-sm">{recipientProfile.farmName || recipientProfile.fullName}</h3>
            <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Online</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-4 banig-pattern-light"
      >
        {messages.map((msg) => {
          const isOwn = msg.senderId === profile?.uid;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-4 rounded-3xl text-sm shadow-sm ${
                  isOwn 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                }`}
              >
                {msg.content}
                <div className={`text-[9px] mt-1.5 opacity-40 font-bold uppercase tracking-widest ${isOwn ? 'text-right' : 'text-left'}`}>
                  {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-50 bg-slate-50">
        <div className="flex gap-4">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={loading}
            placeholder="Type a message..."
            className="flex-grow px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
