import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import Header from '@/components/Layout/Header';
import PostCard from '@/components/Feed/PostCard';
import FriendButton from '@/components/UI/FriendButton';
import Avatar from '@/components/UI/Avatar';
import { toast } from '@/components/UI/Toast';
import { usePosts } from '@/hooks/usePosts';
import {
  Camera, Edit3, BookOpen, Heart, Leaf, Upload, MessageCircle,
  FileText, Users as UsersIcon, X, Loader2,
} from 'lucide-react';
import type { User, FriendUser, Organism, LearningProgress } from '@/types';

interface UserStats {
  posts_count: number;
  friends_count: number;
  likes_received: number;
  learned_count: number;
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateUser } = useAuthStore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({ posts_count: 0, friends_count: 0, likes_received: 0, learned_count: 0 });
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [learned, setLearned] = useState<{ progress: LearningProgress; organism?: Organism }[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'learning' | 'friends'>('posts');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = currentUser?.id === id;

  const { posts, loading, toggleLike, addComment, syncCommentCount, deletePost } = usePosts({ userId: id });

  const loadProfile = async () => {
    if (!id) return;
    try {
      const [userData, statsData, friendsData] = await Promise.all([
        api<User>(`/api/users/${id}`),
        api<UserStats>(`/api/users/${id}/stats`),
        api<FriendUser[]>(`/api/users/${id}/friends`),
      ]);
      setProfileUser(userData);
      setStats(statsData);
      setFriends(friendsData);
      setEditBio(userData.bio || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '用户信息加载失败');
    }
  };

  useEffect(() => {
    setActiveTab('posts');
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'learning' || !id) return;
    Promise.all([
      api<LearningProgress[]>('/api/learning/progress', { params: { user_id: id } }),
      api<Organism[]>('/api/organisms'),
    ])
      .then(([progressList, organisms]) => {
        setLearned(
          progressList
            .map((p) => ({ progress: p, organism: organisms.find((o) => o.id === p.organism_id) }))
            .filter((item) => item.organism)
            .sort((a, b) => new Date(b.progress.learned_at || 0).getTime() - new Date(a.progress.learned_at || 0).getTime())
        );
      })
      .catch(() => setLearned([]));
  }, [activeTab, id]);

  const handleSaveBio = async () => {
    if (!id) return;
    setSavingBio(true);
    try {
      const data = await api<User>(`/api/users/${id}`, {
        method: 'PUT',
        body: { bio: editBio.trim() },
      });
      setProfileUser(data);
      if (isOwnProfile) updateUser({ bio: data.bio });
      setIsEditingBio(false);
      toast.success('简介已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingBio(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await api<User>(`/api/users/${id}`, { method: 'PUT', body: formData });
      setProfileUser(data);
      if (isOwnProfile) updateUser({ avatar_url: data.avatar_url });
      setShowAvatarUpload(false);
      toast.success('头像已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '头像更新失败');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const joinDate = profileUser ? new Date(profileUser.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) : '';
  const selectedPost = posts.find((p) => p.id === selectedPostId);

  const statItems = [
    { label: '动态', value: stats.posts_count, icon: FileText },
    { label: '好友', value: stats.friends_count, icon: UsersIcon },
    { label: '获赞', value: stats.likes_received, icon: Heart },
    { label: '学习', value: stats.learned_count, icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 资料卡 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-br from-primary-500 to-secondary-500 h-40"></div>

          <div className="relative px-6 pb-6">
            <div className="absolute -top-16 left-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-gray-100">
                  {profileUser?.avatar_url ? (
                    <img src={profileUser.avatar_url} alt={profileUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <Avatar alt="用户" size="xl" />
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setShowAvatarUpload(true)}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 rounded-full border-4 border-white flex items-center justify-center hover:bg-primary-700 transition-colors"
                    title="更换头像"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between ml-40 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-800">{profileUser?.username || '加载中...'}</h1>
                  {profileUser?.role === 'admin' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">管理员</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isOwnProfile ? profileUser?.email : `${joinDate} 加入社区`}
                </p>

                {/* 操作按钮 */}
                {!isOwnProfile && profileUser && (
                  <div className="flex items-center gap-2 mt-3">
                    <FriendButton targetUserId={profileUser.id} />
                    <Link
                      to={`/chat/${profileUser.id}`}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      私信
                    </Link>
                  </div>
                )}

                {isEditingBio ? (
                  <div className="mt-3">
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value.slice(0, 200))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      maxLength={200}
                      placeholder="介绍一下你自己吧..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {savingBio && <Loader2 className="w-4 h-4 animate-spin" />}
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBio(false);
                          setEditBio(profileUser?.bio || '');
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-2">
                    <p className="text-gray-600 text-sm">{profileUser?.bio || '这个人很神秘，还没有填写简介'}</p>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditingBio(true)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        title="编辑简介"
                      >
                        <Edit3 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 统计 */}
            <div className="flex items-center gap-8 mt-6 flex-wrap">
              {statItems.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <stat.icon className="w-4 h-4 text-primary-600" />
                    <span className="text-xl font-bold text-gray-800">{stat.value}</span>
                  </div>
                  <span className="text-sm text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            {([
              { key: 'posts', label: `动态 ${stats.posts_count}` },
              { key: 'learning', label: `学习 ${stats.learned_count}` },
              { key: 'friends', label: `好友 ${stats.friends_count}` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3.5 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* 动态 */}
            {activeTab === 'posts' && (
              loading ? (
                <div className="flex justify-center py-16 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
                </div>
              ) : posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group text-left"
                    >
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt="动态图片"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full p-3 flex flex-col bg-gradient-to-br from-primary-50 to-secondary-50 group-hover:from-primary-100 group-hover:to-secondary-100 transition-colors">
                          <FileText className="w-5 h-5 text-primary-400 mb-2" />
                          <p className="text-sm text-gray-700 line-clamp-5 whitespace-pre-wrap">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-4 text-white font-medium">
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-5 h-5 fill-current" />
                            {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="w-5 h-5" />
                            {post.comments_count}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Leaf className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">{isOwnProfile ? '你还没有发布动态' : 'TA 还没有发布动态'}</p>
                  {isOwnProfile && (
                    <Link to="/" className="text-primary-600 font-medium text-sm hover:text-primary-700">
                      发布第一条动态 →
                    </Link>
                  )}
                </div>
              )
            )}

            {/* 学习记录 */}
            {activeTab === 'learning' && (
              learned.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {learned.map(({ progress, organism }) => (
                    <Link
                      key={progress.id}
                      to="/learn"
                      className="bg-gray-50 rounded-xl p-3 hover:shadow-md transition-shadow block"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-200">
                        {organism?.image_url && (
                          <img src={organism.image_url} alt={organism.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <p className="font-medium text-gray-800">{organism?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {progress.learned_at
                          ? `学于 ${new Date(progress.learned_at).toLocaleDateString('zh-CN')}`
                          : '已学习'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">{isOwnProfile ? '还没有学习记录' : 'TA 还没有学习记录'}</p>
                  <Link to="/learn" className="text-primary-600 font-medium text-sm hover:text-primary-700">
                    去认识生物 →
                  </Link>
                </div>
              )
            )}

            {/* 好友 */}
            {activeTab === 'friends' && (
              friends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors gap-3"
                    >
                      <Link to={`/profile/${friend.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar src={friend.avatar_url} alt={friend.username} size="lg" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{friend.username}</p>
                          <p className="text-xs text-gray-400 truncate">{friend.bio || '生物爱好者'}</p>
                        </div>
                      </Link>
                      <Link
                        to={`/chat/${friend.id}`}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-full text-xs font-medium hover:bg-primary-700 transition-colors flex-shrink-0 inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        聊天
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <UsersIcon className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">{isOwnProfile ? '还没有好友' : 'TA 还没有好友'}</p>
                  {isOwnProfile && (
                    <Link to="/chat" className="text-primary-600 font-medium text-sm hover:text-primary-700">
                      去发现好友 →
                    </Link>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* 头像上传弹窗 */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">更换头像</h3>
              <button onClick={() => setShowAvatarUpload(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 text-sm">选择一张本地图片作为新头像</p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                选择图片
              </label>
              <p className="text-xs text-gray-400 mt-3">支持 JPG、PNG 格式，最大 5MB</p>
            </div>
          </div>
        </div>
      )}

      {/* 动态详情弹窗 */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedPostId(null)}
        >
          <div
            className="w-full max-w-2xl sm:my-8 my-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button
                onClick={() => setSelectedPostId(null)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PostCard
              post={selectedPost}
              onToggleLike={toggleLike}
              onAddComment={addComment}
              onDeletePost={async (postId) => {
                const ok = await deletePost(postId);
                if (ok) setSelectedPostId(null);
                return ok;
              }}
              onCommentCountChange={syncCommentCount}
              defaultShowComments
            />
          </div>
        </div>
      )}
    </div>
  );
}
