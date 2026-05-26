import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc, limit, where, onSnapshot } from 'firebase/firestore';
import { db, safeSetItem } from '../lib/firebase';
import { Post, UserProfile } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Sparkles, Smile, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface EnrichedPost extends Post {
  farmer?: UserProfile;
  comments?: {
    id: string;
    userId: string;
    userName: string;
    userRole?: string;
    farmName?: string;
    content: string;
    createdAt: string;
  }[];
  sharesCount?: number;
}

export const SocialFeed: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New post creation fields
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Custom interactive states
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [showShareToast, setShowShareToast] = useState<string | null>(null);
  
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Initial cache load for instant render
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
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post));
      
      // Batch fetch author user profiles
      const uniqueFarmerIds = Array.from(new Set(postsData.map(p => p.farmerId)));
      const farmerCache: Record<string, UserProfile> = {};
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

      if (farmersToFetch.length > 0) {
        try {
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
        } catch (err) {
          console.warn("Error fetching profiles for community posts", err);
        }
      }

      const enrichedPosts = postsData.map(post => ({
        ...post,
        farmer: farmerCache[post.farmerId]
      }));

      setPosts(enrichedPosts);
      safeSetItem('social_feed_posts', JSON.stringify(enrichedPosts));
      setLoading(false);
    }, (error) => {
      console.error("Social feed real-time listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
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
      setPosts(prev => {
        if (prev.some(p => p.id === enrichedNewPost.id)) {
          return prev;
        }
        return [enrichedNewPost, ...prev];
      });

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

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this community post?")) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
      setPosts(prev => prev.filter(p => p.id !== postId));
      localStorage.removeItem('social_feed_posts');
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  const handleStartEdit = (post: EnrichedPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setActiveMenuPostId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { content: editContent.trim() });
      
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent.trim() } : p));
      setEditingPostId(null);
      setEditContent('');
      localStorage.removeItem('social_feed_posts');
    } catch (err) {
      console.error("Failed to save post edit", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleComments = (postId: string) => {
    setOpenCommentsPostId(openCommentsPostId === postId ? null : postId);
  };

  const handleSubmitComment = async (postId: string) => {
    const text = commentTextMap[postId] || '';
    if (!text.trim() || !user) return;

    setSubmittingCommentId(postId);
    try {
      const commentId = Math.random().toString(36).slice(2, 11);
      const newComment = {
        id: commentId,
        userId: user.uid,
        userName: profile?.fullName || 'Anonymous User',
        userRole: profile?.role || 'buyer',
        farmName: profile?.farmName || undefined,
        content: text.trim(),
        createdAt: new Date().toISOString()
      };

      const targetPost = posts.find(p => p.id === postId);
      const existingComments = targetPost?.comments || [];
      const updatedComments = [...existingComments, newComment];

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { comments: updatedComments });

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
      setCommentTextMap(prev => ({ ...prev, [postId]: '' }));
      localStorage.removeItem('social_feed_posts');
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const handleShare = async (post: EnrichedPost) => {
    try {
      const textToCopy = `🌾 FarmToHome Co-op Update from ${post.farmer?.farmName || post.farmer?.fullName || 'Community Member'}:\n\n"${post.content}"\n\nTrack local farming and fresh trade on FarmToHome!`;
      await navigator.clipboard.writeText(textToCopy);
      
      setShowShareToast(post.id);
      
      const currentSharesCount = post.sharesCount || 0;
      const updatedSharesCount = currentSharesCount + 1;
      
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, sharesCount: updatedSharesCount } : p));
      
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, { sharesCount: updatedSharesCount });
      localStorage.removeItem('social_feed_posts');
      
      setTimeout(() => {
        setShowShareToast(null);
      }, 2500);
    } catch (err) {
      console.error("Failed to share", err);
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

      {/* Community Posts - Divided Modern Timeline Layout */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
        {posts.map(post => {
          const hasLiked = user ? (post.likes || []).includes(user.uid) : false;
          const isAuthorOrAdmin = user && (post.farmerId === user.uid || profile?.role === 'admin');

          return (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-white flex items-start gap-3 text-left w-full transition-colors hover:bg-slate-50/40"
            >
              {/* Left Column: Fixed-size Circular Avatar Badge */}
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 font-extrabold flex items-center justify-center shrink-0 border border-emerald-100/50 select-none text-sm uppercase">
                {post.farmer?.farmName?.[0] || post.farmer?.fullName?.[0] || 'U'}
              </div>

              {/* Right Column: Full content stacking vertically */}
              <div className="flex-1 min-w-0">
                
                {/* Metadata Header with 3-Dots Menu */}
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 leading-tight">
                      {post.farmer?.farmName || post.farmer?.fullName || 'Community Member'}
                    </span>
                    
                    {/* Persona Badge Compact Pill Next to Name */}
                    {post.farmer?.role === 'buyer' ? (
                      <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-blue-100">
                        BUYER
                      </span>
                    ) : post.farmer?.role === 'admin' ? (
                      <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-rose-100">
                        ADMIN
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-emerald-100">
                        FARMER
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      • {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Options Menu Button & Overlay */}
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                      className="p-1 px-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {activeMenuPostId === post.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuPostId(null)} />
                        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-20 text-[11px] font-bold">
                          {isAuthorOrAdmin ? (
                            <>
                              <button
                                onClick={() => handleStartEdit(post)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-705 transition-colors flex items-center gap-2"
                              >
                                <span>✏️ Edit Post</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuPostId(null);
                                  handleDeletePost(post.id);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 transition-colors flex items-center gap-2"
                              >
                                <span>🗑️ Delete Post</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(post.content);
                                  alert("Post content copied to clipboard!");
                                  setActiveMenuPostId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-705 transition-colors flex items-center gap-2"
                              >
                                <span>📋 Copy Text</span>
                              </button>
                              <button
                                onClick={() => {
                                  alert("Thank you! Our moderators will review this post shortly.");
                                  setActiveMenuPostId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-705 transition-colors flex items-center gap-2"
                              >
                                <span>⚠️ Report Post</span>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Post Content message text */}
                <div className="mb-3.5 pr-1">
                  {editingPostId === post.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 focus:border-primary rounded-xl p-3 focus:ring-4 focus:ring-primary/5 outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={isSavingEdit || !editContent.trim()}
                          className="px-3.5 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          {isSavingEdit ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{post.content}</p>
                  )}
                </div>

                {/* Media Image Attachment */}
                {post.media && post.media.length > 0 && (
                  <div className="aspect-video rounded-xl overflow-hidden mb-3 border border-slate-100">
                    <img src={post.media[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}

                {/* Borderless Action Toolbar */}
                <div className="flex items-center gap-6 pt-2 border-t border-slate-50/60 relative">
                  {/* Like Action */}
                  <button 
                    onClick={() => handleToggleLike(post.id)}
                    disabled={!user}
                    className={`flex items-center gap-1.5 transition-all text-xs font-semibold focus:outline-none cursor-pointer ${
                      hasLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    <span>{post.likes?.length || 0}</span>
                  </button>

                  {/* Comment Action */}
                  <button 
                    onClick={() => handleToggleComments(post.id)}
                    className={`flex items-center gap-1.5 transition-all text-xs font-semibold focus:outline-none cursor-pointer ${
                      openCommentsPostId === post.id ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'
                    }`}
                  >
                    <MessageCircle className={`w-4 h-4 ${openCommentsPostId === post.id ? 'text-emerald-600 fill-emerald-50' : 'text-slate-400'}`} />
                    <span>
                      {post.comments && post.comments.length > 0 ? post.comments.length : 'Comment'}
                    </span>
                  </button>

                  {/* Share Action with Float Toast */}
                  <div className="relative ml-auto shrink-0 flex items-center">
                    <button 
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title="Copy update link to share"
                    >
                      <Share2 className="w-4 h-4" />
                      {post.sharesCount ? (
                        <span className="text-[10px] font-bold text-slate-400">{post.sharesCount}</span>
                      ) : null}
                    </button>

                    <AnimatePresence>
                      {showShareToast === post.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: -35, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.9 }}
                          className="absolute right-0 bg-slate-950 text-white text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50 flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-400" /> Copied link!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Collapsible Comments Section with matching timeline padding */}
                <AnimatePresence>
                  {openCommentsPostId === post.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3.5 pt-3.5 border-t border-slate-50 space-y-3.5 overflow-hidden w-full"
                    >
                      {/* Comments Feed */}
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                        {(post.comments || []).map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2.5 bg-slate-50/55 p-2.5 rounded-xl border border-slate-100">
                            <div className="w-7 h-7 rounded-full bg-[#ecf3ea] text-emerald-800 font-extrabold flex items-center justify-center font-serif text-[10px] shrink-0 select-none uppercase">
                              {comment.farmName?.[0] || comment.userName?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-800">{comment.farmName || comment.userName}</span>
                                {comment.userRole === 'farmer' && (
                                  <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 text-[7px] font-bold uppercase rounded border border-emerald-100">Farmer</span>
                                )}
                                {comment.userRole === 'admin' && (
                                  <span className="px-1 py-0.2 bg-rose-50 text-rose-700 text-[7px] font-bold uppercase rounded border border-rose-100">Admin</span>
                                )}
                                <span className="text-[8px] text-slate-400 font-medium ml-auto">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap leading-relaxed font-medium">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        {(post.comments || []).length === 0 && (
                          <p className="text-center text-[10px] text-slate-400 font-serif italic py-1">No comments yet. Start the conversation!</p>
                        )}
                      </div>

                      {/* Comment Input Field */}
                      {user && (
                        <div className="flex gap-2 items-center mt-2.5">
                          <input
                            type="text"
                            value={commentTextMap[post.id] || ''}
                            onChange={(e) => setCommentTextMap(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a supportive comment..."
                            className="flex-1 text-xs px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-150 focus:border-primary focus:outline-none rounded-xl font-medium transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSubmitComment(post.id)}
                            disabled={submittingCommentId === post.id || !(commentTextMap[post.id] || '').trim()}
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 shrink-0 shadow-sm cursor-pointer"
                          >
                            {submittingCommentId === post.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          );
        })}
      </div>
      
      {posts.length === 0 && (
         <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-zinc-100">
           <p className="font-serif italic text-zinc-400">The community feed is quiet. Harvest updates coming soon!</p>
         </div>
      )}
    </div>
  );
};
