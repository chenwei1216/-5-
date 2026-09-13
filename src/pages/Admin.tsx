import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api, uploadFile } from '@/lib/api';
import Header from '@/components/Layout/Header';
import { toast } from '@/components/UI/Toast';
import {
  Shield, Plus, Pencil, Trash2, X, Upload, Loader2, Search,
  BookOpen, Trophy, Info,
} from 'lucide-react';
import type { Organism } from '@/types';

interface FormState {
  name: string;
  scientific_name: string;
  category: string;
  description: string;
  habitat: string;
  characteristics: string;
  image_url: string;
}

const emptyForm: FormState = {
  name: '',
  scientific_name: '',
  category: '',
  description: '',
  habitat: '',
  characteristics: '',
  image_url: '',
};

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  const fetchOrganisms = async () => {
    setLoading(true);
    try {
      const data = await api<Organism[]>('/api/organisms');
      setOrganisms(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '资料加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchOrganisms();
  }, [isAdmin]);

  const categories = [...new Set(organisms.map((o) => o.category))];

  const filtered = keyword.trim()
    ? organisms.filter(
        (o) =>
          o.name.includes(keyword.trim()) ||
          o.category.includes(keyword.trim()) ||
          o.scientific_name.toLowerCase().includes(keyword.trim().toLowerCase())
      )
    : organisms;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (o: Organism) => {
    setEditingId(o.id);
    setForm({
      name: o.name,
      scientific_name: o.scientific_name || '',
      category: o.category,
      description: o.description,
      habitat: o.habitat || '',
      characteristics: (o.characteristics || []).join('，'),
      image_url: o.image_url,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, image_url: url }));
      toast.success('图片上传成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.description.trim()) {
      toast.error('请填写名称、分类和简介');
      return;
    }
    if (!form.image_url.trim()) {
      toast.error('请上传图片或填写图片地址');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        scientific_name: form.scientific_name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        habitat: form.habitat.trim(),
        characteristics: form.characteristics.trim(),
        image_url: form.image_url.trim(),
      };

      if (editingId) {
        await api(`/api/admin/organisms/${editingId}`, { method: 'PUT', body: payload });
        toast.success('资料已更新');
      } else {
        await api('/api/admin/organisms', { method: 'POST', body: payload });
        toast.success('新生物已添加，已同步到今日学习和挑战题库');
      }
      setShowForm(false);
      fetchOrganisms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o: Organism) => {
    if (!window.confirm(`确定删除「${o.name}」吗？相关学习记录也会一并清除，此操作不可恢复。`)) return;
    setDeletingId(o.id);
    try {
      await api(`/api/admin/organisms/${o.id}`, { method: 'DELETE' });
      toast.success(`已删除「${o.name}」`);
      setOrganisms((prev) => prev.filter((item) => item.id !== o.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // 非管理员：无权限提示
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">需要管理员权限</h1>
          <p className="text-gray-500 text-sm mb-6">生物资料库仅对管理员开放，请使用管理员账号登录。</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            返回首页
          </button>
        </main>
      </div>
    );
  }

  const inputClass =
    'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 标题区 */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">生物资料库管理</h1>
              <p className="text-gray-500 text-sm">共 {organisms.length} 种生物，新增的资料会自动进入学习与挑战</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加生物
          </button>
        </div>

        {/* 提示条 */}
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-primary-800">
            在这里添加或编辑的生物，会立刻出现在
            <span className="font-medium">「今日学习」</span>
            <BookOpen className="w-4 h-4 inline mx-1 -mt-0.5" />
            的分类卡片和
            <span className="font-medium">「挑战」</span>
            <Trophy className="w-4 h-4 inline mx-1 -mt-0.5" />
            的随机题库中。图片建议上传清晰的正方形或 4:3 实拍照片。
          </p>
        </div>

        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索生物名称、学名或分类..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl py-16 text-center text-gray-400 text-sm">
            {keyword ? '没有找到匹配的生物' : '资料库为空，点击右上角添加第一种生物吧'}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y">
              {filtered.map((o) => (
                <div key={o.id} className="flex items-center gap-4 p-3.5 hover:bg-gray-50 transition-colors">
                  <img
                    src={o.image_url}
                    alt={o.name}
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = '1';
                        target.src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23d1d5db' width='100' height='100' rx='12'/></svg>";
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{o.name}</p>
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full">{o.category}</span>
                    </div>
                    <p className="text-xs text-gray-400 italic truncate mt-0.5">{o.scientific_name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{o.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(o)}
                      className="p-2 text-gray-500 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                    </button>
                    <button
                      onClick={() => handleDelete(o)}
                      disabled={deletingId === o.id}
                      className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      title="删除"
                    >
                      {deletingId === o.id ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Trash2 className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 新增/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl sm:my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-800">{editingId ? '编辑生物资料' : '添加新生物'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 图片 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">生物图片 *</label>
                <div className="flex items-start gap-4">
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {form.image_url ? (
                      <img src={form.image_url} alt="预览" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="organism-image" />
                    <label
                      htmlFor="organism-image"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      从本地上传图片
                    </label>
                    <input
                      type="text"
                      value={form.image_url.startsWith('http://localhost:3001/uploads/') ? '' : form.image_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                      placeholder="...或粘贴图片网址（http/https）"
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-400">支持 JPG、PNG，最大 5MB；上传后保存在服务器，重启不丢失</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">中文名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="例如：大熊猫"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">学名（拉丁名）</label>
                  <input
                    type="text"
                    value={form.scientific_name}
                    onChange={(e) => setForm({ ...form, scientific_name: e.target.value })}
                    className={inputClass}
                    placeholder="例如：Ailuropoda melanoleuca"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类 *</label>
                <input
                  type="text"
                  list="organism-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                  placeholder="例如：哺乳动物 / 鸟类 / 昆虫 / 植物"
                  maxLength={12}
                />
                <datalist id="organism-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">简介 *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  rows={3}
                  maxLength={500}
                  placeholder="介绍这种生物的特点、习性等（最多 500 字）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">栖息地</label>
                <input
                  type="text"
                  value={form.habitat}
                  onChange={(e) => setForm({ ...form, habitat: e.target.value })}
                  className={inputClass}
                  placeholder="例如：中国四川、陕西的山林中"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">特征标签</label>
                <input
                  type="text"
                  value={form.characteristics}
                  onChange={(e) => setForm({ ...form, characteristics: e.target.value })}
                  className={inputClass}
                  placeholder="多个特征用逗号分隔，例如：黑白毛色，爱吃竹子，独居"
                  maxLength={200}
                />
                {form.characteristics.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.characteristics
                      .split(/[,，、]/)
                      .map((c) => c.trim())
                      .filter(Boolean)
                      .map((c, i) => (
                        <span key={i} className="px-2.5 py-1 bg-primary-50 text-primary-600 text-xs rounded-full">
                          {c}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
