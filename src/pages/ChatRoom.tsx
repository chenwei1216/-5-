import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Layout/Header';
import Avatar from '@/components/UI/Avatar';
import { api, uploadFile } from '@/lib/api';
import { formatChatTime } from '@/lib/utils';
import { toast } from '@/components/UI/Toast';
import { ArrowLeft, Send, Smile, Image as ImageIcon, X, Loader2, Check, CheckCheck } from 'lucide-react';
import type { Message, User } from '@/types';

const emojis = ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤔', '🙄', '😢', '😭', '👍', '👏', '🎉', '❤️', '🔥', '⭐', '💯', '🦋', '🌿', '🪲'];

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    if (!id) return;
    api<User>(`/api/users/${id}`)
      .then(setOtherUser)
      .catch(() => setNotFound(true));
  }, [id]);

  const fetchMessages = async () => {
    if (!user || !id) return;
    try {
      const data = await api<Message[]>('/api/chat/messages', {
        params: { user_id: user.id, conversation_id: id },
      });
      setMessages(data);
    } catch {
      // 轮询静默失败
    }
  };

  useEffect(() => {
    if (!user || !id) return;
    fetchMessages();
    const timer = setInterval(fetchMessages, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  useEffect(() => {
    if (nearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setPendingImage(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!user || !id || sending) return;
    const text = inputText.trim();
    if (!text && !pendingImage) return;

    setSending(true);
    try {
      const newMessage = await api<Message>('/api/chat/messages', {
        method: 'POST',
        body: {
          sender_id: user.id,
          receiver_id: id,
          content: text,
          image_url: pendingImage || undefined,
        },
      });
      setMessages((prev) => [...prev, newMessage]);
      setInputText('');
      setPendingImage(null);
      setShowEmojiPicker(false);
      nearBottomRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  // 自己发送的最后一条消息用于展示已读状态
  const lastOwnMessage = [...messages].reverse().find((m) => m.sender_id === user?.id);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 mb-4">用户不存在，无法发起聊天</p>
          <button
            onClick={() => navigate('/chat')}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            返回消息列表
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 顶部栏 */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <Link to={`/profile/${id}`}>
              <Avatar src={otherUser?.avatar_url} alt={otherUser?.username || '用户'} />
            </Link>
            <Link to={`/profile/${id}`} className="flex-1 min-w-0">
              <h2 className="font-semibold text-white truncate hover:underline">{otherUser?.username || '加载中...'}</h2>
              <p className="text-xs text-white/80">{otherUser?.bio || '青科畅学社区成员'}</p>
            </Link>
          </div>

          {/* 消息区 */}
          <div ref={scrollContainerRef} onScroll={handleScroll} className="h-96 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-primary-50/30 to-white">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Avatar src={otherUser?.avatar_url} alt={otherUser?.username || ''} size="xl" />
                <p className="text-gray-600 font-medium mt-3">{otherUser?.username}</p>
                <p className="text-gray-400 text-sm mt-1">和 TA 打个招呼吧 👋</p>
              </div>
            )}

            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const prev = messages[index - 1];
              const showTime =
                !prev || new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
              const showRead = lastOwnMessage?.id === message.id && isOwn;

              return (
                <div key={message.id}>
                  {showTime && (
                    <p className="text-center text-xs text-gray-400 my-3">{formatChatTime(message.created_at)}</p>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <div className="mr-2 flex-shrink-0 self-end">
                        <Avatar src={message.sender?.avatar_url} alt={message.sender?.username || '用户'} size="sm" />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      {message.image_url && (
                        <button
                          onClick={() => setImagePreview(message.image_url!)}
                          className="rounded-xl overflow-hidden mb-1 max-w-full hover:opacity-95 transition-opacity"
                        >
                          <img
                            src={message.image_url}
                            alt="图片消息"
                            className="max-w-full max-h-72 object-cover"
                            loading="lazy"
                          />
                        </button>
                      )}
                      {message.content && (
                        <div
                          className={`px-4 py-2.5 whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                              : 'bg-white shadow-sm text-gray-800 rounded-2xl rounded-bl-md border border-gray-100'
                          }`}
                        >
                          {message.content}
                        </div>
                      )}
                      <span className={`text-[11px] text-gray-400 mt-1 flex items-center gap-1 ${isOwn ? 'flex-row' : ''}`}>
                        {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {showRead && (
                          message.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary-500" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 待发送图片预览 */}
          {pendingImage && (
            <div className="px-4 pt-3 border-t bg-gray-50">
              <div className="relative inline-block">
                <img src={pendingImage} alt="待发送" className="w-24 h-24 object-cover rounded-lg" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 表情面板 */}
          {showEmojiPicker && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex flex-wrap gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setInputText(inputText + emoji)}
                    className="text-2xl p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 输入区 */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${showEmojiPicker ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-500'}`}
                title="表情"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 flex-shrink-0 disabled:opacity-50"
                title="发送图片"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入消息，Enter 发送..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-gray-100 rounded-full border-none outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || uploading || (!inputText.trim() && !pendingImage)}
                className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                title="发送"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 图片查看大图 */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setImagePreview(null)}
        >
          <button className="absolute top-4 right-4 p-2 text-white/80 hover:text-white">
            <X className="w-7 h-7" />
          </button>
          <img
            src={imagePreview}
            alt="大图预览"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
