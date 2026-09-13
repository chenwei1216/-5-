import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Tag, Image as ImageIcon,
  Trash2, X, Link2, Check, Send, Loader2,
} from 'lucide-react';
import type { Post, Comment, User } from '@/types';
import Avatar from '@/components/UI/Avatar';
import { toast } from '@/components/UI/Toast';

interface PostCardProps {
  post: Post;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, content: string, imageUrl?: string) => Promise<Comment | null>;
  onDeletePost: (postId: string) => Promise<boolean> | void;
  onCommentCountChange?: (postId: string, delta: number) => void;
  defaultShowComments?: boolean;
}

interface FriendLike extends User {
  status?: string;
  record_id?: string;
}

export default function PostCard({
  post,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onCommentCountChange,
  defaultShowComments = false,
}: PostCardProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [friends, setFriends] = useState<FriendLike[]>([]);
  const commentFileRef = useRef<HTMLInputElement>(null);

  const canDelete = user && (user.id === post.user_id || user.role === 'admin');

  const fetchComments = async () => {
    try {
      const data = await api<Comment[]>(`/api/posts/${post.id}/comments`);
      setComments(data);
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  useEffect(() => {
    if (defaultShowComments) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultShowComments]);

  // 点击空白处关闭弹层
  useEffect(() => {
    if (!showShare && !showMoreMenu) return;
    const close = () => {
      setShowShare(false);
      setShowMoreMenu(false);
    };
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [showShare, showMoreMenu]);

  const triggerLike = () => {
    if (!post.is_liked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    onToggleLike(post.id);
  };

  const handleDoubleClickImage = () => {
    if (!post.is_liked) triggerLike();
    else {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentImage) return;
    setSendingComment(true);
    const newComment = await onAddComment(post.id, commentText.trim(), commentImage || undefined);
    setSendingComment(false);
    if (newComment) {
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setCommentImage(null);
      if (!showComments) setShowComments(true);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      await api(`/api/comments/${commentId}`, {
        method: 'DELETE',
        body: {
          user_id: user.id,
          is_admin: user.role === 'admin',
          post_user_id: post.user_id,
        },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(post.id, -1);
      toast.success('评论已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const openShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShare(!showShare);
    if (!showShare) {
      try {
        const data = await api<FriendLike[]>(`/api/users/${user?.id}/friends`);
        setFriends(data);
      } catch {
        setFriends([]);
      }
    }
  };

  const handleShareToFriend = async (friendId: string, friendName: string) => {
    if (!user) return;
    try {
      await api('/api/chat/messages', {
        method: 'POST',
        body: {
          sender_id: user.id,
          receiver_id: friendId,
          content: `分享了一条动态：${post.content.slice(0, 60)}`,
        },
      });
      setShowShare(false);
      toast.success(`已分享给 ${friendName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '分享失败');
    }
  };

  const copyLink = async () => {
    const link = `${window.location.origin}/feed`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await api<{ url: string }>('/api/upload', { method: 'POST', body: formData });
      setCommentImage(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      if (commentFileRef.current) commentFileRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-4 animate-slide-up hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* 用户信息 */}
        <div className="flex items-center justify-between mb-3">
          <Link to={`/profile/${post.user.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 transition-colors">
            <Avatar src={post.user.avatar_url} alt={post.user.username} />
            <div>
              <p className="font-medium text-gray-800">{post.user.username}</p>
              <p className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}</p>
            </div>
          </Link>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showMoreMenu && (
              <div
                className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-2 z-20 w-40 border border-gray-100 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    copyLink();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="text-sm">复制链接</span>
                </button>
                {canDelete && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">删除动态</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 正文 */}
        {post.content && <p className="text-gray-800 mb-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>}

        {/* 话题 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/feed?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                <Tag className="w-3 h-3" />
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* 图片（双击点赞） */}
        {post.image_url && (
          <div className="relative rounded-lg overflow-hidden mb-3 bg-gray-100">
            <img
              src={post.image_url}
              alt="动态图片"
              className="w-full h-auto max-h-[28rem] object-cover cursor-pointer select-none"
              onDoubleClick={handleDoubleClickImage}
              draggable={false}
            />
            {heartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-24 h-24 text-white fill-red-500 stroke-red-500 drop-shadow-lg animate-bounce" />
              </div>
            )}
          </div>
        )}

        {/* 操作栏 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-6">
            <button
              onClick={triggerLike}
              className={`flex items-center gap-2 py-1 transition-all active:scale-125 ${
                post.is_liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
              title="点赞"
            >
              <Heart className={`w-5 h-5 transition-all ${post.is_liked ? 'fill-current scale-110' : ''}`} />
              <span className="text-sm font-medium">{post.likes_count}</span>
            </button>
            <button
              onClick={() => {
                const next = !showComments;
                setShowComments(next);
                if (next) fetchComments();
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors py-1"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post.comments_count}</span>
            </button>
          </div>

          <div className="relative">
            <button
              onClick={openShare}
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors py-1"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">分享</span>
            </button>
            {showShare && (
              <div
                className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-3 z-20 w-64 border border-gray-100 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">分享给好友</p>
                  <button onClick={copyLink} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制链接'}
                  </button>
                </div>
                {friends.length > 0 ? (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => handleShareToFriend(friend.id, friend.username)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Avatar src={friend.avatar_url} alt={friend.username} size="sm" />
                        <span className="text-sm text-gray-700">{friend.username}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 mb-2">还没有好友</p>
                    <Link to="/chat" className="text-xs text-primary-600 hover:text-primary-700">
                      去添加好友 →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 评论区 */}
      {showComments && (
        <div className="px-4 pb-4 border-t bg-gray-50 rounded-b-xl animate-fade-in">
          <div className="mt-3 space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const canDeleteComment = user && (
                  user.id === comment.user_id || user.id === post.user_id || user.role === 'admin'
                );
                return (
                  <div key={comment.id} className="flex items-start gap-3 group">
                    <Link to={`/profile/${comment.user.id}`}>
                      <Avatar src={comment.user.avatar_url} alt={comment.user.username} size="sm" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="inline-block bg-white rounded-2xl px-3 py-2 border border-gray-100">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link to={`/profile/${comment.user.id}`} className="font-medium text-gray-800 text-sm hover:underline">
                            {comment.user.username}
                          </Link>
                        </div>
                        {comment.image_url && (
                          <img src={comment.image_url} alt="评论图片" className="max-w-[12rem] rounded-lg mb-1" />
                        )}
                        {comment.content && <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-2">{formatRelativeTime(comment.created_at)}</p>
                    </div>
                    {canDeleteComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="删除评论"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-400 text-sm py-3">还没有评论，快来抢沙发吧～</p>
            )}
          </div>

          {commentImage && (
            <div className="mt-3 flex items-center gap-2">
              <img src={commentImage} alt="评论预览" className="w-20 h-20 object-cover rounded-lg" />
              <button onClick={() => setCommentImage(null)} className="text-red-500 hover:text-red-700">
                移除
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="mt-3 flex items-center gap-2">
            <input
              ref={commentFileRef}
              type="file"
              accept="image/*"
              onChange={handleCommentImageUpload}
              className="hidden"
              id={`comment-image-${post.id}`}
            />
            <label
              htmlFor={`comment-image-${post.id}`}
              className="p-2 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-gray-500" />
            </label>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={(!commentText.trim() && !commentImage) || sendingComment}
              className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">确定要删除这条动态吗？点赞和评论也会一起删除，此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  const ok = await onDeletePost(post.id);
                  if (ok) setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
