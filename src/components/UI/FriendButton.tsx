import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { FriendshipStatus } from '@/types';
import { toast } from '@/components/UI/Toast';
import { UserPlus, Check, Clock, MessageCircle, Loader2 } from 'lucide-react';

interface FriendButtonProps {
  targetUserId: string;
  size?: 'sm' | 'md';
  onChange?: (status: FriendshipStatus) => void;
  className?: string;
}

// 根据好友关系渲染不同按钮：加好友 / 已发送 / 接受+拒绝 / 发消息
export default function FriendButton({ targetUserId, size = 'md', onChange, className = '' }: FriendButtonProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(false);

  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';

  const refresh = async () => {
    if (!user || user.id === targetUserId) {
      setStatus('self');
      return;
    }
    try {
      const data = await api<{ status: FriendshipStatus }>('/api/friendship/status', {
        params: { user_id: user.id, other_id: targetUserId },
      });
      setStatus(data.status);
    } catch {
      // 保持 none
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, user?.id]);

  const update = (next: FriendshipStatus) => {
    setStatus(next);
    onChange?.(next);
  };

  const sendRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api(`/api/users/${user.id}/friends`, {
        method: 'POST',
        body: { friend_id: targetUserId },
      });
      update('pending_sent');
      toast.success('好友请求已发送');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api(`/api/friendships/${targetUserId}`, {
        method: 'DELETE',
        params: { user_id: user.id },
      });
      update('none');
      toast.info('已撤回好友请求');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const respondRequest = async (accept: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api<{ status: FriendshipStatus; record_id?: string }>('/api/friendship/status', {
        params: { user_id: user.id, other_id: targetUserId },
      });
      // 需要拿到请求记录 id：通过好友请求列表查找
      if (!data.record_id) {
        const requests = await api<{ id: string; user_id: string }[]>('/api/friends/requests', {
          params: { user_id: user.id },
        });
        const req = requests.find((r) => r.user_id === targetUserId);
        if (!req) throw new Error('请求不存在或已处理');
        await api(`/api/friends/${req.id}`, {
          method: 'PUT',
          body: { status: accept ? 'accepted' : 'rejected' },
        });
      } else {
        await api(`/api/friends/${data.record_id}`, {
          method: 'PUT',
          body: { status: accept ? 'accepted' : 'rejected' },
        });
      }
      update(accept ? 'friends' : 'none');
      toast.success(accept ? '你们已经是好友了，开始聊天吧' : '已拒绝好友请求');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'self') return null;

  const icon = loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null;

  if (status === 'none') {
    return (
      <button
        onClick={sendRequest}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 ${pad} ${className}`}
      >
        {icon || <UserPlus className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
        加好友
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={cancelRequest}
        disabled={loading}
        title="点击撤回请求"
        className={`inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 ${pad} ${className}`}
      >
        {icon || <Clock className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
        已发送
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          onClick={() => respondRequest(true)}
          disabled={loading}
          className={`inline-flex items-center gap-1 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 ${pad}`}
        >
          {icon || <Check className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
          接受
        </button>
        <button
          onClick={() => respondRequest(false)}
          disabled={loading}
          className={`inline-flex items-center bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 ${pad}`}
        >
          拒绝
        </button>
      </div>
    );
  }

  // friends
  return (
    <Link
      to={`/chat/${targetUserId}`}
      className={`inline-flex items-center gap-1.5 border border-primary-600 text-primary-600 rounded-full font-medium hover:bg-primary-50 transition-colors ${pad} ${className}`}
    >
      <MessageCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      发消息
    </Link>
  );
}
