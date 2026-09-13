import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { TrendingUp, Users, Award, Calendar } from 'lucide-react';
import type { User, Organism } from '@/types';
import Avatar from '@/components/UI/Avatar';
import FriendButton from '@/components/UI/FriendButton';

export default function Sidebar() {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [dailyOrganism, setDailyOrganism] = useState<Organism | null>(null);

  useEffect(() => {
    if (!user) return;

    api<User[]>(`/api/users/${user.id}/suggestions?limit=4`)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));

    api<{ name: string; count: number }[]>('/api/tags/trending')
      .then(setTags)
      .catch(() => setTags([]));

    api<Organism[]>('/api/organisms')
      .then((list) => {
        if (list.length) {
          const day = Math.floor(Date.now() / 86400000);
          setDailyOrganism(list[day % list.length]);
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <aside className="w-80 hidden lg:block">
      <div className="sticky top-20 space-y-6">
        {user && suggestions.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              你可能感兴趣的人
            </h3>
            <div className="space-y-3">
              {suggestions.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <Link to={`/profile/${u.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 transition-colors min-w-0 flex-1">
                    <Avatar src={u.avatar_url} alt={u.username} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.username}</p>
                      <p className="text-xs text-gray-400 truncate">{u.bio || '生物爱好者'}</p>
                    </div>
                  </Link>
                  <FriendButton targetUserId={u.id} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            热门话题
          </h3>
          {tags.length > 0 ? (
            <div className="space-y-1">
              {tags.slice(0, 6).map((tag, index) => (
                <Link
                  key={tag.name}
                  to={`/feed?tag=${encodeURIComponent(tag.name)}`}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-red-100 text-red-600' :
                    index === 1 ? 'bg-orange-100 text-orange-600' :
                    index === 2 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">#{tag.name}</p>
                    <p className="text-xs text-gray-400">{tag.count} 条讨论</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-2">暂无热门话题</p>
          )}
          <Link
            to="/feed"
            className="block w-full mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium text-center"
          >
            进入朋友圈
          </Link>
        </div>

        <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Award className="w-5 h-5" />
            学习挑战
          </h3>
          <p className="text-sm opacity-90 mb-4">认识生物、参与答题，成为社区里的自然达人</p>
          <div className="flex gap-2">
            <Link
              to="/learn"
              className="flex-1 text-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              去学习
            </Link>
            <Link
              to="/challenge"
              className="flex-1 text-center px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              去挑战
            </Link>
          </div>
        </div>

        {dailyOrganism && (
          <Link
            to="/learn"
            className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              今日推荐
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-primary-50">
                <img src={dailyOrganism.image_url} alt={dailyOrganism.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{dailyOrganism.name}</p>
                <p className="text-xs text-gray-400 truncate">{dailyOrganism.category} · {dailyOrganism.habitat}</p>
              </div>
            </div>
          </Link>
        )}

        <div className="text-center text-xs text-gray-400">
          <p>青科畅学社区</p>
          <p className="mt-1">探索自然，分享生命之美</p>
        </div>
      </div>
    </aside>
  );
}
