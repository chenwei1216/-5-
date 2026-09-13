import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Post, Comment } from '@/types';
import { toast } from '@/components/UI/Toast';

interface UsePostsOptions {
  userId?: string;
  friendsOnly?: boolean;
  tag?: string;
}

export function usePosts(options: UsePostsOptions = {}) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api<Post[]>('/api/posts', {
        params: {
          user_id: options.userId,
          friends_only: options.friendsOnly,
          tag: options.tag,
        },
      });
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.friendsOnly, options.tag]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(
    async (content: string, imageUrl: string, tags: string[]) => {
      try {
        const newPost = await api<Post>('/api/posts', {
          method: 'POST',
          body: { content, image_url: imageUrl || undefined, tags },
        });
        setPosts((prev) => [newPost, ...prev]);
        toast.success('发布成功');
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败');
        return false;
      }
    },
    []
  );

  // 乐观更新点赞，失败时回滚
  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const current = posts.find((p) => p.id === postId);
    if (!current) return;

    const liked = current.is_liked;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !liked,
              likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)),
            }
          : p
      )
    );

    try {
      const updated = await api<Post>(`/api/posts/${postId}/likes`, { method: 'POST', body: {} });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (error) {
      // 回滚
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: liked, likes_count: current.likes_count }
            : p
        )
      );
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  }, [posts, user]);

  const addComment = useCallback(
    async (postId: string, content: string, imageUrl?: string): Promise<Comment | null> => {
      if (!user) return null;
      try {
        const newComment = await api<Comment>(`/api/posts/${postId}/comments`, {
          method: 'POST',
          body: { content, image_url: imageUrl },
        });
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
        );
        return newComment;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '评论失败');
        return null;
      }
    },
    [user]
  );

  const syncCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p
      )
    );
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) return false;
    try {
      await api(`/api/posts/${postId}`, {
        method: 'DELETE',
        body: { user_id: user.id, is_admin: user.role === 'admin' },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('动态已删除');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
      return false;
    }
  }, [user]);

  return {
    posts,
    loading,
    refresh: fetchPosts,
    createPost,
    toggleLike,
    addComment,
    syncCommentCount,
    deletePost,
  };
}
