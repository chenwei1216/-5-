import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Leaf, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const doLogin = async (username: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: import('@/types').User; token: string }>('/api/auth/signin', {
        method: 'POST',
        body: { username, password },
      });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setError('请输入用户名或邮箱');
      return;
    }
    if (!formData.password) {
      setError('请输入密码');
      return;
    }
    doLogin(formData.username.trim(), formData.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Leaf className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">青科畅学社区</h1>
            <p className="text-gray-500 mt-2">探索自然，分享生命之美</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 / 邮箱
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="请输入用户名或邮箱"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => doLogin('biologist', '123456')}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-primary-200 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            演示账号一键体验（biologist / 123456）
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              还没有账号？{' '}
              <Link
                to="/register"
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          登录即表示同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
