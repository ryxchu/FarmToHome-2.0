import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, limit, where } from 'firebase/firestore';
import { db, safeSetItem } from '../lib/firebase';
import { Post, UserProfile } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Sparkles, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const SocialFeed: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<(Post & { farmer?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New post creation fields
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // Cache posts for social feed to improve speed and reduce reads
        const cachedPosts = localStorage.getItem('social_feed_posts');
        if (cachedPosts) {
          try {
            setPosts(JSON.parse(cachedPosts));
            setLoading(false);
          } catch (e) {
            localStorage.removeItem('social_feed_posts');
          }
        }

        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(25));
        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post));
        
        // Batch fetch author user profiles
        const uniqueFarmerIds = Array.from(new Set(postsData.map(p => p.farmerId)));
        const farmerCache: Record<string, UserProfile> = {};
        
        // Try to get from individual profile cache first
        const farmersToFetch: string[] = [];
        uniqueFarmerIds.forEach(fid => {
          const cached = localStorage.getItem(`user_profile_${fid}`);
          if (cached) {
            try {
              farmerCache[fid] = JSON.parse(cached);
            } catch (e) {
              farmersToFetch.push(fid);
            }
          } else {
            farmersToFetch.push(fid);
          }
        });

        // Batch fetch remaining profiles if any
        if (farmersToFetch.length > 0) {
          for (let i = 0; i < farmersToFetch.length; i += 10) {
            const batch = farmersToFetch.slice(i, i + 10);
            const farmerQuery = query(collection(db, 'users'), where('uid', 'in', batch));
            const farmerSnapshot = await getDocs(farmerQuery);
            farmerSnapshot.docs.forEach(d => {
              const data = { ...d.data(), uid: d.id } as UserProfile;
              farmerCache[d.id] = data;
              safeSetItem(`user_profile_${d.id}`, JSON.stringify(data));
            });
          }
        }
        
        const enrichedPosts = postsData.map(post => ({
          ...post,
          farmer: farmerCache[post.farmerId]
        }));

        setPosts(enrichedPosts);
        safeSetItem('social_feed_posts', JSON.stringify(enrichedPosts));
      } catch (err) {
        console.error("Social feed error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      const postRef = doc(collection(db, 'posts'));
      const postData: Post = {
        id: postRef.id,
        farmerId: user.uid, // author ID
        content: newPostContent.trim(),
        media: [],
        likes: [],
        createdAt: new Date().toISOString()
      };

      await setDoc(postRef, postData);
      setNewPostContent('');

      // Enrich and inject new post at the top of the feed instantly
      const enrichedNewPost = {
        ...postData,
        farmer: profile || undefined
      };
      setPosts(prev => [enrichedNewPost, ...prev]);

      // Flush feed cache
      localStorage.removeItem('social_feed_posts');
    } catch (err) {
      console.error("Failed to post to feed", err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;

    try {
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) return;

      const targetPost = posts[postIndex];
      const likes = targetPost.likes || [];
      const hasLiked = likes.includes(user.uid);

      const updatedLikes = hasLiked
        ? likes.filter(uid => uid !== user.uid)
        : [...likes, user.uid];

      // Instant local feedback
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: updatedLikes } : p));

      // Push to Firestore
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { likes: updatedLikes });

      localStorage.removeItem('social_feed_posts');
    } catch (err) {
      console.error("Failed to update like status", err);
    }
  };

  if (loading) return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-8 font-sans">
      {/* Premium Create Post Form Panel */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center font-bold text-primary shadow-sm select-none">
              {profile?.fullName?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Co-op Community Board</h4>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={profile?.role === 'buyer' ? "Ask the cooperative for fresh crops, share organic recipes, or post requests..." : "Share crop harvest updates, pricing, or tips..."}
                rows={3}
                className="w-full text-sm font-medium border-none outline-none focus:ring-0 placeholder-slate-450 resize-none pt-1"
                disabled={isSubmittingPost}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Public Board</span>
            </div>
            
            <button
              onClick={handleCreatePost}
              disabled={isSubmittingPost || !newPostContent.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSubmittingPost ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Post Update <Send className="w-3 h-3" /></>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Community Posts */}
      {posts.map(post => {
        const hasLiked = user ? (post.likes || []).includes(user.uid) : false;
        return (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary italic font-serif">
                  {post.farmer?.farmName?.[0] || post.farmer?.fullName?.[0] || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-zinc-900">{post.farmer?.farmName || post.farmer?.fullName || 'Community Member'}</p>
                    {post.farmer?.role === 'buyer' && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8.5px] font-black uppercase rounded-md tracking-wider">Buyer</span>
                    )}
                    {post.farmer?.role === 'farmer' && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8.5px] font-black uppercase rounded-md tracking-wider">Farmer</span>
                    )}
                    {post.farmer?.role === 'admin' && (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-650 text-[8.5px] font-black uppercase rounded-md tracking-wider">Admin</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-full"><MoreHorizontal className="w-5 h-5" /></button>
            </div>

            <div className="px-4 pb-4">
              <p className="text-sm text-zinc-650 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
              {post.media?.length > 0 && (
                <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                  <img src={post.media[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-zinc-50">
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  disabled={!user}
                  className={`flex items-center gap-2 transition-colors ${
                    hasLiked ? 'text-rose-500 scale-105 font-bold' : 'text-zinc-455 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="text-xs font-bold">{post.likes?.length || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-bold">Comment</span>
                </button>
                <button className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors ml-auto">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
      
      {posts.length === 0 && (
         <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-zinc-100">
           <p className="font-serif italic text-zinc-400">The community feed is quiet. Harvest updates coming soon!</p>
         </div>
      )}
    </div>
  );
};
