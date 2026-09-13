import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { uploadFile } from '@/lib/api';
import { Image as ImageIcon, X, Tag, Sparkles, Loader2, Link2 } from 'lucide-react';
import Avatar from '@/components/UI/Avatar';
import { toast } from '@/components/UI/Toast';

interface PostFormProps {
  onSubmit: (content: string, imageUrl: string, tags: string[]) => Promise<boolean>;
}

const sampleImages = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20butterfly%20on%20flower&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20squirrel%20in%20tree&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20fish%20in%20coral%20reef&image_size=landscape_4_3',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hummingbird%20flying%20near%20flower&image_size=landscape_4_3',
];

const MAX_LENGTH = 500;

export default function PostForm({ onSubmit }: PostFormProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setContent('');
    setImageUrl('');
    setUrlInput('');
    setTags([]);
    setTagInput('');
    setShowImagePanel(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;
    setSubmitting(true);
    const ok = await onSubmit(content.trim(), imageUrl, tags);
    setSubmitting(false);
    if (ok) reset();
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag) && tags.length < 6) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setImageUrl(url);
      setShowImagePanel(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const remaining = MAX_LENGTH - content.length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 mb-3">
          <Avatar src={user?.avatar_url} alt={user?.username || 'user'} />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
              placeholder={`分享你今天见到的生物，${user?.username || '朋友'}...`}
              className="w-full border-none outline-none resize-none text-gray-800 placeholder-gray-400 bg-transparent"
              rows={3}
            />
            {content.length > MAX_LENGTH * 0.8 && (
              <p className={`text-xs text-right ${remaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {remaining}
              </p>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm"
              >
                <Tag className="w-3 h-3" />
                {tag}
                <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-primary-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={tags.length >= 6 ? '最多添加 6 个话题' : '添加话题标签，回车确认'}
              className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
              disabled={tags.length >= 6}
            />
          </div>
        </div>

        {imageUrl && (
          <div className="relative mb-3">
            <img src={imageUrl} alt="预览" className="w-full max-h-80 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showImagePanel && !imageUrl && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg animate-fade-in">
            <p className="text-sm text-gray-600 mb-2 font-medium">从本地上传：</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-3 inline-flex items-center gap-2 px-4 py-2 border border-dashed border-primary-300 text-primary-600 rounded-lg text-sm hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {uploading ? '上传中...' : '选择本地图片（最大 5MB）'}
            </button>

            <p className="text-sm text-gray-600 mb-2 font-medium">或粘贴图片链接：</p>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2 min-w-0"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (urlInput.trim()) {
                    setImageUrl(urlInput.trim());
                    setShowImagePanel(false);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                确定
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-2 font-medium">或选一张示例图：</p>
            <div className="grid grid-cols-4 gap-2">
              {sampleImages.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => {
                    setImageUrl(img);
                    setShowImagePanel(false);
                  }}
                  className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                >
                  <img src={img} alt="示例" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <button
            type="button"
            onClick={() => setShowImagePanel(!showImagePanel)}
            className={`flex items-center gap-2 transition-colors ${showImagePanel ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm font-medium">图片</span>
          </button>
          <button
            type="submit"
            disabled={(!content.trim() && !imageUrl) || submitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </form>
    </div>
  );
}
