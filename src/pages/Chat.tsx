import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Layout/Header';
import Avatar from '@/components/UI/Avatar';
import FriendButton from '@/components/UI/FriendButton';
import { api } from '@/lib/api';
import { formatChatTime } from '@/lib/utils';
import { toast } from '@/components/UI/Toast';
import {
  MessageCircle, Search, UserPlus, Check, X, Loader2, Users,
} from 'lucide-react';
import type { Conversation, FriendRequest, User } from '@/types';

type Tab = 'messages' | 'requests' | 'add';

export default function Chat() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('messages');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [convData, reqData] = await Promise.all([
        api<Conversation[]>('/api/chat/conversations', { params: { user_id: user.id } }),
        api<FriendRequest[]>('/api/friends/requests', { params: { user_id: user.id } }),
      ]);
      setConversations(convData);
      setRequests(reqData);
    } catch {
      // 轮询静默失败
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 6000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleSearch = async () => {
    const q = searchTerm.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const data = await api<{ users: User[] }>('/api/search', { params: { q } });
      setSearchResults(data.users.filter((u) => u.id !== user?.id));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const respondRequest = async (request: FriendRequest, accept: boolean) => {
    setRespondingId(request.id);
    try {
      await api(`/api/friends/${request.id}`, {
        method: 'PUT',
        body: { status: accept ? 'accepted' : 'rejected' },
      });
      toast.success(accept ? `已接受 ${request.from_user?.username} 的好友请求` : '已拒绝好友请求');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setRespondingId(null);
    }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'messages', label: '消息' },
    { key: 'requests', label: '好友请求', badge: requests.length },
    { key: 'add', label: '添加好友' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">消息</h1>
              <p className="text-gray-500 text-sm">与好友分享你的生物观察</p>
            </div>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span
                  className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 text-[11px] rounded-full flex items-center justify-center font-bold ${
                    activeTab === tab.key ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 消息列表 */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {conversations.length > 0 ? (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    to={`/chat/${conversation.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={conversation.user?.avatar_url} alt={conversation.user?.username || '用户'} size="lg" />
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-semibold text-gray-800 truncate">{conversation.user?.username || '未知用户'}</span>
                        {conversation.latestMessage && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatChatTime(conversation.latestMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                        {conversation.latestMessage ? (
                          <>
                            {conversation.latestMessage.sender_id === user?.id && <span className="text-gray-400">我: </span>}
                            {conversation.latestMessage.image_url ? '[图片]' : conversation.latestMessage.content}
                          </>
                        ) : (
                          <span className="text-gray-400">开始聊天吧</span>
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-14 text-center">
                <MessageCircle className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">还没有消息</p>
                <p className="text-gray-400 text-sm mb-4">添加好友，开始分享你的发现</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  去添加好友
                </button>
              </div>
            )}
          </div>
        )}

        {/* 好友请求 */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {requests.length > 0 ? (
              <div className="divide-y">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center gap-4 p-4">
                    <Link to={`/profile/${request.from_user?.id}`}>
                      <Avatar src={request.from_user?.avatar_url} alt={request.from_user?.username || '用户'} size="lg" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${request.from_user?.id}`}
                        className="font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                      >
                        {request.from_user?.username}
                      </Link>
                      <p className="text-sm text-gray-400 truncate">{request.from_user?.bio || '请求添加你为好友'}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{formatChatTime(request.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => respondRequest(request, true)}
                        disabled={respondingId === request.id}
                        className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {respondingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        接受
                      </button>
                      <button
                        onClick={() => respondRequest(request, false)}
                        disabled={respondingId === request.id}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-14 text-center">
                <Users className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">暂无好友请求</p>
              </div>
            )}
          </div>
        )}

        {/* 添加好友 */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索用户名，回车查找"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {searching && <Loader2 className="w-4 h-4 animate-spin" />}
                搜索
              </button>
            </div>

            <div className="mt-4">
              {searched && !searching && searchResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">没有找到「{searchTerm}」相关用户</p>
              )}

              {searchResults.length > 0 && (
                <div className="divide-y">
                  {searchResults.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 py-3">
                      <Link to={`/profile/${u.id}`}>
                        <Avatar src={u.avatar_url} alt={u.username} size="lg" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${u.id}`} className="font-medium text-gray-800 hover:text-primary-600 transition-colors">
                          {u.username}
                        </Link>
                        <p className="text-xs text-gray-400 truncate">{u.bio || '生物爱好者'}</p>
                      </div>
                      <FriendButton targetUserId={u.id} size="sm" />
                    </div>
                  ))}
                </div>
              )}

              {!searched && (
                <div className="text-center py-8">
                  <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">输入对方的用户名，找到后点击「加好友」</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
