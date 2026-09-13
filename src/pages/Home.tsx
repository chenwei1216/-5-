import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import PostCard from '@/components/Feed/PostCard';
import PostForm from '@/components/Feed/PostForm';
import { usePosts } from '@/hooks/usePosts';
import { Compass, Loader2 } from 'lucide-react';

export default function Home() {
  const { posts, loading, createPost, toggleLike, addComment, syncCommentCount, deletePost } = usePosts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-6 h-6 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-800">发现广场</h1>
              <span className="text-sm text-gray-400">看看大家都在观察什么生物</span>
            </div>

            <PostForm onSubmit={createPost} />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
                <p className="text-sm">动态加载中...</p>
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onToggleLike={toggleLike}
                  onAddComment={addComment}
                  onDeletePost={deletePost}
                  onCommentCountChange={syncCommentCount}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl p-12 text-center">
                <Compass className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-1">还没有动态</p>
                <p className="text-gray-400 text-sm">发布第一条动态，开启你的自然观察记录吧</p>
              </div>
            )}
          </div>
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
