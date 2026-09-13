import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import PostCard from '@/components/Feed/PostCard';
import PostForm from '@/components/Feed/PostForm';
import { usePosts } from '@/hooks/usePosts';
import { Users, Loader2, X } from 'lucide-react';

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag') || '';
  const [scope, setScope] = useState<'friends' | 'all'>('friends');

  const friendsFeed = usePosts({ friendsOnly: true, tag });
  const allFeed = usePosts({ friendsOnly: false, tag });

  const active = scope === 'friends' ? friendsFeed : allFeed;

  const tabs = useMemo(
    () => [
      { key: 'friends' as const, label: '好友动态', icon: Users },
      { key: 'all' as const, label: '全部广场', icon: Users },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-800">朋友圈</h1>
              <p className="text-gray-400 text-sm mt-0.5">分享你见到的生物，与朋友们互动</p>
            </div>

            <div className="flex gap-2 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setScope(tab.key)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    scope === tab.key
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-primary-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {tag && (
                <button
                  onClick={() => setSearchParams({})}
                  className="ml-auto inline-flex items-center gap-1 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100 transition-colors"
                >
                  #{tag}
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <PostForm onSubmit={scope === 'friends' ? friendsFeed.createPost : allFeed.createPost} />

            {active.loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
                <p className="text-sm">动态加载中...</p>
              </div>
            ) : active.posts.length > 0 ? (
              active.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onToggleLike={active.toggleLike}
                  onAddComment={active.addComment}
                  onDeletePost={active.deletePost}
                  onCommentCountChange={active.syncCommentCount}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                {scope === 'friends' ? (
                  <>
                    <p className="text-gray-500 font-medium mb-1">好友圈还没有动态</p>
                    <p className="text-gray-400 text-sm mb-4">添加更多好友，或切换到「全部广场」看看</p>
                    <button
                      onClick={() => setScope('all')}
                      className="px-5 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      去广场看看
                    </button>
                  </>
                ) : tag ? (
                  <>
                    <p className="text-gray-500 font-medium mb-1">没有找到 #{tag} 相关动态</p>
                    <button
                      onClick={() => setSearchParams({})}
                      className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      清除话题筛选
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">还没有任何动态</p>
                )}
              </div>
            )}
          </div>
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
