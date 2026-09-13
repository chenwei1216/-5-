import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import {
  Leaf, Home, Compass, BookOpen, Trophy, MessageCircle, User, LogOut,
  Search, Bell, Heart, UserPlus, Check, Loader2, Shield,
} from 'lucide-react';
import type { AppNotification, Conversation, Post } from '@/types';
import Avatar from '@/components/UI/Avatar';
import { toast } from '@/components/UI/Toast';

const navItems = [
  { icon: Home, path: '/', label: '首页' },
  { icon: Compass, path: '/feed', label: '朋友圈' },
  { icon: BookOpen, path: '/learn', label: '今日学习' },
  { icon: Trophy, path: '/challenge', label: '挑战' },
  { icon: MessageCircle, path: '/chat', label: '消息' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuthStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ users: { id: string; username: string; avatar_url?: string; bio?: string }[]; posts: Post[]; tags: { name: string; count: number }[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSearchResult, setShowSearchResult] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const bellBoxRef = useRef<HTMLDivElement>(null);

  const fetchBadges = async () => {
    if (!user) return;
    try {
      const [notifData, convData] = await Promise.all([
        api<{ list: AppNotification[]; unreadCount: number }>('/api/notifications', {
          params: { user_id: user.id },
        }),
        api<Conversation[]>('/api/chat/conversations', { params: { user_id: user.id } }),
      ]);
      setNotifications(notifData.list);
      setUnreadCount(notifData.unreadCount);
      setUnreadMessages(convData.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch {
      // 静默处理轮询失败
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchBadges();
    const timer = setInterval(fetchBadges, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id]);

  // 搜索防抖
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api('/api/search', { params: { q: searchQuery.trim() } });
        setSearchResult(data as typeof searchResult);
      } catch {
        setSearchResult(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchResult(false);
      }
      if (bellBoxRef.current && !bellBoxRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && unreadCount > 0 && user) {
      try {
        await api('/api/notifications/read', { method: 'POST', params: { user_id: user.id } });
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // ignore
      }
    }
  };

  const respondFriendRequest = async (notification: AppNotification, accept: boolean) => {
    try {
      const requests = await api<{ id: string; user_id: string }[]>('/api/friends/requests', {
        params: { user_id: user!.id },
      });
      const req = requests.find((r) => r.user_id === notification.from_user_id);
      if (!req) {
        toast.error('请求不存在或已处理');
        fetchBadges();
        return;
      }
      await api(`/api/friends/${req.id}`, {
        method: 'PUT',
        body: { status: accept ? 'accepted' : 'rejected' },
      });
      toast.success(accept ? '已添加好友' : '已拒绝请求');
      fetchBadges();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const notificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-4 h-4 text-primary-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800 hidden sm:block">青科畅学社区</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      active ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.path === '/chat' && unreadMessages > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-amber-50 text-amber-600'
                      : 'text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                  }`}
                  title="生物资料库管理"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">管理</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* 搜索 */}
            <div ref={searchBoxRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 w-56 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
                {searching ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" /> : <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResult(true);
                  }}
                  onFocus={() => setShowSearchResult(true)}
                  placeholder="搜索用户、话题..."
                  className="bg-transparent border-none outline-none text-sm w-full min-w-0"
                />
              </div>

              {showSearchResult && searchQuery.trim() && searchResult && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-50 max-h-[28rem] overflow-y-auto animate-fade-in">
                  {searchResult.users.length === 0 && searchResult.posts.length === 0 && searchResult.tags.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">没有找到「{searchQuery}」相关内容</p>
                  )}

                  {searchResult.users.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-400 font-medium px-3 py-1.5">用户</p>
                      {searchResult.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            navigate(`/profile/${u.id}`);
                            setShowSearchResult(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <Avatar src={u.avatar_url} alt={u.username} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{u.username}</p>
                            {u.bio && <p className="text-xs text-gray-400 truncate">{u.bio}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResult.tags.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-400 font-medium px-3 py-1.5">话题</p>
                      {searchResult.tags.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => {
                            navigate(`/feed?tag=${encodeURIComponent(t.name)}`);
                            setShowSearchResult(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <span className="text-sm text-primary-600 font-medium">#{t.name}</span>
                          <span className="text-xs text-gray-400">{t.count} 条</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResult.posts.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium px-3 py-1.5">动态</p>
                      {searchResult.posts.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate('/feed');
                            setShowSearchResult(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <p className="text-sm text-gray-700 line-clamp-2">{p.content}</p>
                          <p className="text-xs text-gray-400 mt-0.5">@{p.user?.username}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 通知 */}
            {isLoggedIn && (
              <div ref={bellBoxRef} className="relative">
                <button
                  onClick={openNotifications}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="通知"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-fade-in overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <p className="font-semibold text-gray-800">消息通知</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => user && api('/api/notifications/read', { method: 'POST', params: { user_id: user.id } }).then(() => {
                            setUnreadCount(0);
                            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                          })}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          全部已读
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${n.read ? '' : 'bg-primary-50/40'}`}
                          >
                            <Link to={`/profile/${n.from_user_id}`} className="flex-shrink-0">
                              <Avatar src={n.from_user?.avatar_url} alt={n.from_user?.username || '用户'} size="sm" />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-700">
                                  <Link to={`/profile/${n.from_user_id}`} className="font-medium text-gray-800 hover:underline">
                                    {n.from_user?.username || '未知用户'}
                                  </Link>{' '}
                                  <span className="inline-flex items-center gap-1 align-middle">{notificationIcon(n.type)}</span>{' '}
                                  {n.preview}
                                </p>
                              </div>
                              {n.post_content && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1 bg-gray-50 rounded px-2 py-1">{n.post_content}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>

                              {n.type === 'friend_request' && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => respondFriendRequest(n, true)}
                                    className="px-3 py-1 bg-primary-600 text-white text-xs rounded-full hover:bg-primary-700 transition-colors inline-flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    接受
                                  </button>
                                  <button
                                    onClick={() => respondFriendRequest(n, false)}
                                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200 transition-colors"
                                  >
                                    拒绝
                                  </button>
                                </div>
                              )}
                              {n.type === 'friend_accept' && (
                                <Link
                                  to={`/chat/${n.from_user_id}`}
                                  className="inline-block mt-2 px-3 py-1 bg-primary-50 text-primary-700 text-xs rounded-full hover:bg-primary-100 transition-colors"
                                >
                                  去打个招呼 →
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">暂无通知</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/profile/${user?.id}`}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-full pr-3 pl-1 py-1 transition-colors"
                >
                  <Avatar src={user?.avatar_url} alt={user?.username || 'user'} size="sm" />
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[8rem] truncate">
                    {user?.username}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">登录</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className="md:hidden bg-white border-t">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-primary-600 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
              {item.path === '/chat' && unreadMessages > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`relative flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                location.pathname.startsWith('/admin') ? 'text-amber-600' : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-xs">管理</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
