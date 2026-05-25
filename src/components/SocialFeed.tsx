import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc, limit, where } from 'firebase/firestore';
import { db, safeSetItem } from '../lib/firebase';
import { Post, UserProfile } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

export const SocialFeed: React.FC = () => {
  const [posts, setPosts] = useState<(Post & { farmer?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);

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

        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(15));
        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post));
        
        // Batch fetch farmer profiles
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

        // Batch fetch remaining farmers if any
        if (farmersToFetch.length > 0) {
          // Firestore 'in' query has a limit of 10-30 elements depending on version, 10 is very safe
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

  if (loading) return <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-8">
      {posts.map(post => (
        <motion.div 
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden"
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary italic">
                {post.farmer?.farmName?.[0] || 'F'}
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900">{post.farmer?.farmName || 'Local Farmer'}</p>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <button className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-full"><MoreHorizontal className="w-5 h-5" /></button>
          </div>

          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-600 leading-relaxed mb-4">{post.content}</p>
            {post.media?.length > 0 && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                <img src={post.media[0]} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-6 pt-4 border-t border-zinc-50">
              <button className="flex items-center gap-2 text-zinc-400 hover:text-accent transition-colors">
                <Heart className="w-5 h-5" />
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
      ))}
      
      {posts.length === 0 && (
         <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-zinc-100">
           <p className="font-serif italic text-zinc-400">The community feed is quiet. Harvest updates coming soon!</p>
         </div>
      )}
    </div>
  );
};
