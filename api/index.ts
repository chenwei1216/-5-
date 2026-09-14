import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDB, scheduleSave, safeUser } from './_db';
import type {
  DB,
  User,
  Post,
  Comment,
  Like,
  Friend,
  Organism,
  LearningProgress,
  ChallengeRecord,
  Message,
  Notification,
} from './_db';
import { signToken, authenticateToken, requireAdmin, optionalAuth, getUserId } from './_auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();

app.use(cors());
// 增大限制：图片可能以 base64 data URL 形式出现在 JSON body 中
app.use(express.json({ limit: '10mb' }));

// 内存 DB 缓存：在路由前确保 MongoDB 数据已加载
let db!: DB;
app.use(async (_req, _res, next) => {
  if (!db) db = await getDB();
  next();
});

// 文件上传：内存存储 + 2MB 限制（Vercel Serverless 无可写磁盘）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ---------------- 工具函数 ----------------

function getFriendRecord(a: string, b: string): Friend | undefined {
  return db.friends.find(
    (f) =>
      (f.user_id === a && f.friend_id === b) ||
      (f.user_id === b && f.friend_id === a)
  );
}

function getAcceptedFriendIds(userId: string): Set<string> {
  return new Set(
    db.friends
      .filter((f) => f.status === 'accepted' && (f.user_id === userId || f.friend_id === userId))
      .map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
  );
}

function presentPost(post: Post, currentUserId?: string) {
  const user = db.users.find((u) => u.id === post.user_id);
  return {
    ...post,
    is_liked: currentUserId ? db.likes.some((l) => l.post_id === post.id && l.user_id === currentUserId) : false,
    user: safeUser(user),
  };
}

function presentComment(comment: Comment) {
  const user = db.users.find((u) => u.id === comment.user_id);
  return { ...comment, user: safeUser(user) };
}

function presentNotification(n: Notification) {
  const fromUser = db.users.find((u) => u.id === n.from_user_id);
  const post = n.post_id ? db.posts.find((p) => p.id === n.post_id) : undefined;
  return {
    ...n,
    from_user: safeUser(fromUser),
    post_content: post?.content,
    post_image: post?.image_url,
  };
}

function createNotification(n: Omit<Notification, 'id' | 'read' | 'created_at'>) {
  if (n.from_user_id === n.to_user_id) return; // 不通知自己
  db.notifications.unshift({
    ...n,
    id: uuidv4(),
    read: false,
    created_at: new Date().toISOString(),
  });
  scheduleSave();
}

// ---------------- 认证 ----------------

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: '请填写完整信息' });
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{2,16}$/.test(username)) {
    return res.status(400).json({ message: '用户名需为 2-16 位中文、字母、数字或下划线' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: '邮箱格式不正确' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: '密码长度至少为 6 位' });
  }
  if (db.users.find((u) => u.username === username)) {
    return res.status(400).json({ message: '用户名已被注册' });
  }
  if (db.users.find((u) => u.email === email)) {
    return res.status(400).json({ message: '邮箱已被注册' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  const token = signToken(newUser.id);
  scheduleSave();

  res.status(201).json({ user: safeUser(newUser), token });
});

app.post('/api/auth/signin', async (req, res) => {
  const { username, password } = req.body;

  const user = db.users.find((u) => u.username === username || u.email === username);

  if (!user) {
    return res.status(401).json({ message: '用户名不存在' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: '密码不正确' });
  }

  const token = signToken(user.id);
  scheduleSave();

  res.json({ user: safeUser(user), token });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(safeUser((req as any).user));
});

app.post('/api/auth/logout', (_req, res) => {
  // JWT 无状态，客户端丢弃 token 即可
  res.json({ message: 'ok' });
});

// ---------------- 用户 ----------------

app.get('/api/users', (req, res) => {
  const q = (req.query.q as string || '').trim().toLowerCase();
  let list = db.users;
  if (q) {
    list = list.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q)
    );
  }
  res.json(list.map((u) => safeUser(u)));
});

app.get('/api/users/:id', (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  res.json(safeUser(user));
});

app.put('/api/users/:id', upload.single('avatar'), (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (req.file) {
    const b64 = req.file.buffer.toString('base64');
    user.avatar_url = `data:${req.file.mimetype};base64,${b64}`;
  }
  if (req.body.bio !== undefined) {
    user.bio = String(req.body.bio).slice(0, 200);
  }
  if (req.body.username) {
    const name = String(req.body.username).trim();
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{2,16}$/.test(name)) {
      return res.status(400).json({ message: '用户名需为 2-16 位中文、字母、数字或下划线' });
    }
    if (!db.users.find((u) => u.username === name && u.id !== user.id)) {
      user.username = name;
    }
  }
  user.updated_at = new Date().toISOString();
  scheduleSave();

  res.json(safeUser(user));
});

app.get('/api/users/:id/stats', (req, res) => {
  const userId = req.params.id;
  const userPosts = db.posts.filter((p) => p.user_id === userId);
  const postIds = new Set(userPosts.map((p) => p.id));
  const likesReceived = db.likes.filter((l) => postIds.has(l.post_id) && l.user_id !== userId).length;
  const friendsCount = getAcceptedFriendIds(userId).size;
  const learnedCount = db.learningProgress.filter((p) => p.user_id === userId).length;

  res.json({
    posts_count: userPosts.length,
    friends_count: friendsCount,
    likes_received: likesReceived,
    learned_count: learnedCount,
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '未选择文件' });
  }
  const b64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
  res.json({ url: dataUrl });
});

// ---------------- 好友 ----------------

// 当前用户与目标用户的好友关系
app.get('/api/friendship/status', (req, res) => {
  const userId = req.query.user_id as string;
  const otherId = req.query.other_id as string;

  if (!userId || !otherId || userId === otherId) {
    return res.json({ status: 'self' });
  }

  const record = getFriendRecord(userId, otherId);
  if (!record) return res.json({ status: 'none' });
  if (record.status === 'accepted') return res.json({ status: 'friends', record_id: record.id });
  // pending
  if (record.user_id === userId) return res.json({ status: 'pending_sent', record_id: record.id });
  return res.json({ status: 'pending_received', record_id: record.id });
});

// 发送好友请求（若对方已向我发过请求，则直接通过）
app.post('/api/users/:id/friends', (req, res) => {
  const userId = req.params.id;
  const { friend_id } = req.body;

  const user = db.users.find((u) => u.id === userId);
  const friend = db.users.find((u) => u.id === friend_id);
  if (!user || !friend) {
    return res.status(404).json({ message: '用户不存在' });
  }
  if (userId === friend_id) {
    return res.status(400).json({ message: '不能添加自己为好友' });
  }

  const existing = getFriendRecord(userId, friend_id);
  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ message: '你们已经是好友了' });
    }
    // 对方先发起的请求 -> 我再发 = 同意
    if (existing.user_id === friend_id) {
      existing.status = 'accepted';
      createNotification({
        type: 'friend_accept',
        from_user_id: userId,
        to_user_id: friend_id,
        preview: '通过了你的好友请求',
      });
      scheduleSave();
      return res.json({ ...existing, friend: safeUser(friend) });
    }
    return res.status(400).json({ message: '好友请求已发送，等待对方验证' });
  }

  const newFriend: Friend = {
    id: uuidv4(),
    user_id: userId,
    friend_id,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  db.friends.push(newFriend);
  createNotification({
    type: 'friend_request',
    from_user_id: userId,
    to_user_id: friend_id,
    preview: '请求添加你为好友',
  });
  scheduleSave();

  res.status(201).json({ ...newFriend, friend: safeUser(friend) });
});

// 收到的好友请求
app.get('/api/friends/requests', (req, res) => {
  const userId = req.query.user_id as string;
  const requests = db.friends
    .filter((f) => f.status === 'pending' && f.friend_id === userId)
    .map((f) => {
      const fromUser = db.users.find((u) => u.id === f.user_id);
      return { ...f, from_user: safeUser(fromUser) };
    });
  res.json(requests);
});

// 同意 / 拒绝好友请求
app.put('/api/friends/:id', (req, res) => {
  const { status } = req.body;
  const record = db.friends.find((f) => f.id === req.params.id);

  if (!record) {
    return res.status(404).json({ message: '好友请求不存在' });
  }
  if (status !== 'accepted' && status !== 'rejected') {
    return res.status(400).json({ message: '无效的操作' });
  }

  if (status === 'accepted') {
    record.status = 'accepted';
    createNotification({
      type: 'friend_accept',
      from_user_id: record.friend_id,
      to_user_id: record.user_id,
      preview: '通过了你的好友请求',
    });
  } else {
    db.friends = db.friends.filter((f) => f.id !== record.id);
  }
  scheduleSave();
  res.json({ ...record, status });
});

// 删除好友 / 撤回请求
app.delete('/api/friendships/:otherId', (req, res) => {
  const userId = req.query.user_id as string;
  const record = getFriendRecord(userId, req.params.otherId);
  if (!record) {
    return res.status(404).json({ message: '好友关系不存在' });
  }
  db.friends = db.friends.filter((f) => f.id !== record.id);
  scheduleSave();
  res.json({ message: 'ok' });
});

// 好友列表（默认只返回已成为好友的）
app.get('/api/users/:id/friends', (req, res) => {
  const status = (req.query.status as string) || 'accepted';
  const userId = req.params.id;

  const records = db.friends.filter(
    (f) =>
      (f.user_id === userId || f.friend_id === userId) &&
      (status === 'all' || f.status === status)
  );

  const list = records.map((f) => {
    const otherId = f.user_id === userId ? f.friend_id : f.user_id;
    return { ...safeUser(db.users.find((u) => u.id === otherId)), status: f.status, record_id: f.id };
  });

  res.json(list);
});

// 推荐用户：排除自己、好友、已发请求
app.get('/api/users/:id/suggestions', (req, res) => {
  const userId = req.params.id;
  const limit = parseInt((req.query.limit as string) || '5');
  const connected = new Set<string>([userId]);
  db.friends.forEach((f) => {
    if (f.user_id === userId) connected.add(f.friend_id);
    if (f.friend_id === userId) connected.add(f.user_id);
  });

  const suggestions = db.users
    .filter((u) => !connected.has(u.id))
    .slice(0, limit)
    .map((u) => safeUser(u));
  res.json(suggestions);
});

// ---------------- 帖子 ----------------

app.get('/api/posts', optionalAuth, (req, res) => {
  const currentUserId = getUserId(req);
  const userId = req.query.user_id as string;
  const tag = (req.query.tag as string || '').replace(/^#/, '').trim();
  const friendsOnly = req.query.friends_only === 'true';

  let list = [...db.posts];

  if (userId) {
    list = list.filter((p) => p.user_id === userId);
  }
  if (tag) {
    list = list.filter((p) => p.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())));
  }
  if (friendsOnly && currentUserId) {
    const friendIds = getAcceptedFriendIds(currentUserId);
    list = list.filter((p) => friendIds.has(p.user_id) || p.user_id === currentUserId);
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(list.map((p) => presentPost(p, currentUserId)));
});

app.post('/api/posts', authenticateToken, (req, res) => {
  const { content, image_url, tags } = req.body;
  const user = (req as any).user as User;

  if (!content?.trim() && !image_url) {
    return res.status(400).json({ message: '内容不能为空' });
  }

  const newPost: Post = {
    id: uuidv4(),
    user_id: user.id,
    content: content?.trim() || '',
    image_url: image_url || undefined,
    tags: Array.isArray(tags) ? tags.slice(0, 6).map((t: string) => String(t).replace(/^#/, '').trim()).filter(Boolean) : [],
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.posts.unshift(newPost);
  scheduleSave();
  res.status(201).json(presentPost(newPost, user.id));
});

app.get('/api/posts/:id', optionalAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: '动态不存在' });
  }
  res.json(presentPost(post, getUserId(req)));
});

app.post('/api/posts/:id/likes', authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const post = db.posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ message: '动态不存在' });
  }

  const existingLike = db.likes.find((l) => l.post_id === post.id && l.user_id === user.id);

  if (existingLike) {
    db.likes = db.likes.filter((l) => l.id !== existingLike.id);
    post.likes_count = Math.max(0, post.likes_count - 1);
  } else {
    db.likes.push({ id: uuidv4(), post_id: post.id, user_id: user.id, created_at: new Date().toISOString() });
    post.likes_count++;
    createNotification({
      type: 'like',
      from_user_id: user.id,
      to_user_id: post.user_id,
      post_id: post.id,
      preview: '赞了你的动态',
    });
  }
  scheduleSave();

  res.json(presentPost(post, user.id));
});

app.delete('/api/posts/:id', (req, res) => {
  const { user_id, is_admin } = req.body;
  const post = db.posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ message: '动态不存在' });
  }
  if (!is_admin && post.user_id !== user_id) {
    return res.status(403).json({ message: '没有权限删除' });
  }

  const postId = post.id;
  db.posts = db.posts.filter((p) => p.id !== postId);
  db.comments = db.comments.filter((c) => c.post_id !== postId);
  db.likes = db.likes.filter((l) => l.post_id !== postId);
  db.notifications = db.notifications.filter((n) => n.post_id !== postId);
  scheduleSave();

  res.json({ message: '动态已删除' });
});

// ---------------- 评论 ----------------

app.get('/api/posts/:id/comments', (req, res) => {
  const postComments = db.comments
    .filter((c) => c.post_id === req.params.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  res.json(postComments.map(presentComment));
});

app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const user = (req as any).user as User;
  const { content, image_url } = req.body;
  const post = db.posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ message: '动态不存在' });
  }
  if (!content?.trim() && !image_url) {
    return res.status(400).json({ message: '评论内容不能为空' });
  }

  const newComment: Comment = {
    id: uuidv4(),
    post_id: post.id,
    user_id: user.id,
    content: content?.trim() || '',
    image_url: image_url || undefined,
    created_at: new Date().toISOString(),
  };

  db.comments.push(newComment);
  post.comments_count++;
  createNotification({
    type: 'comment',
    from_user_id: user.id,
    to_user_id: post.user_id,
    post_id: post.id,
    preview: newComment.content.slice(0, 50) || '评论了你的动态',
  });
  scheduleSave();

  res.status(201).json(presentComment(newComment));
});

app.delete('/api/comments/:id', (req, res) => {
  const { user_id, is_admin, post_user_id } = req.body;
  const comment = db.comments.find((c) => c.id === req.params.id);

  if (!comment) {
    return res.status(404).json({ message: '评论不存在' });
  }

  const canDelete = is_admin || comment.user_id === user_id || post_user_id === user_id;
  if (!canDelete) {
    return res.status(403).json({ message: '没有权限删除' });
  }

  db.comments = db.comments.filter((c) => c.id !== comment.id);
  const post = db.posts.find((p) => p.id === comment.post_id);
  if (post) post.comments_count = Math.max(0, post.comments_count - 1);
  scheduleSave();

  res.json({ message: '评论已删除' });
});

// ---------------- 通知 ----------------

app.get('/api/notifications', (req, res) => {
  const userId = req.query.user_id as string;
  const list = db.notifications
    .filter((n) => n.to_user_id === userId)
    .sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 50)
    .map(presentNotification);

  const unreadCount = db.notifications.filter((n) => n.to_user_id === userId && !n.read).length;
  res.json({ list, unreadCount });
});

app.post('/api/notifications/read', (req, res) => {
  const userId = req.query.user_id as string || req.body.user_id;
  db.notifications.forEach((n) => {
    if (n.to_user_id === userId) n.read = true;
  });
  scheduleSave();
  res.json({ message: 'ok' });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const n = db.notifications.find((x) => x.id === req.params.id);
  if (n) {
    n.read = true;
    scheduleSave();
  }
  res.json({ message: 'ok' });
});

// ---------------- 搜索 ----------------

app.get('/api/search', (req, res) => {
  const q = (req.query.q as string || '').trim().toLowerCase();
  if (!q) {
    return res.json({ users: [], posts: [], tags: [] });
  }

  const users = db.users
    .filter((u) => u.username.toLowerCase().includes(q) || (u.bio || '').toLowerCase().includes(q))
    .slice(0, 8)
    .map((u) => safeUser(u));

  const posts = db.posts
    .filter((p) => p.content.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
    .map((p) => presentPost(p));

  const tagCount = new Map<string, number>();
  db.posts.forEach((p) => {
    p.tags.forEach((t) => {
      if (t.toLowerCase().includes(q)) tagCount.set(t, (tagCount.get(t) || 0) + 1);
    });
  });
  const tags = [...tagCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({ users, posts, tags });
});

// 热门话题
app.get('/api/tags/trending', (_req, res) => {
  const tagCount = new Map<string, number>();
  db.posts.forEach((p) => {
    p.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1));
  });
  const tags = [...tagCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  res.json(tags);
});

// ---------------- 管理员 ----------------

app.get('/api/admin/users', (req, res) => {
  res.json(db.users.map((u) => safeUser(u)));
});

app.get('/api/admin/posts', (req, res) => {
  res.json(db.posts.map((p) => presentPost(p)));
});

app.get('/api/admin/learning-stats', (req, res) => {
  const stats = db.users.map((u) => {
    const userProgress = db.learningProgress.filter((p) => p.user_id === u.id);
    const userChallenges = db.challengeRecords.filter((c) => c.user_id === u.id);

    return {
      user: safeUser(u),
      total_learned: userProgress.length,
      total_challenges: userChallenges.length,
      average_score: userChallenges.length > 0
        ? Math.round(userChallenges.reduce((sum, c) => sum + c.score, 0) / userChallenges.length)
        : 0,
    };
  });

  res.json(stats);
});

// ---------------- 学习 / 挑战 ----------------

app.get('/api/organisms', (_req, res) => {
  res.json(db.organisms);
});

app.get('/api/organisms/:id', (req, res) => {
  const organism = db.organisms.find((o) => o.id === req.params.id);
  if (!organism) {
    return res.status(404).json({ message: 'Organism not found' });
  }
  res.json(organism);
});

// ---------------- 管理员：生物资料库管理 ----------------

// 解析并校验生物资料（新增/编辑共用）
function parseOrganismBody(body: any): Partial<Organism> | { error: string } {
  const name = String(body.name || '').trim();
  const scientific_name = String(body.scientific_name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const habitat = String(body.habitat || '').trim();
  const image_url = String(body.image_url || '').trim();

  if (!name) return { error: '请填写生物名称' };
  if (!category) return { error: '请填写分类' };
  if (!description) return { error: '请填写简介' };

  let characteristics: string[] = [];
  if (Array.isArray(body.characteristics)) {
    characteristics = body.characteristics.map((c: unknown) => String(c).trim()).filter(Boolean);
  } else if (typeof body.characteristics === 'string') {
    characteristics = body.characteristics
      .split(/[,，、\n]/)
      .map((c: string) => c.trim())
      .filter(Boolean);
  }

  return {
    name,
    scientific_name: scientific_name || name,
    category,
    description,
    habitat: habitat || '暂无记录',
    characteristics: characteristics.slice(0, 8),
    ...(image_url ? { image_url } : {}),
  };
}

// 新增生物（自动出现在今日学习与挑战题库中）
app.post('/api/admin/organisms', requireAdmin, (req, res) => {
  const parsed = parseOrganismBody(req.body);
  if ('error' in parsed) {
    return res.status(400).json({ message: parsed.error });
  }

  if (db.organisms.some((o) => o.name === parsed.name)) {
    return res.status(409).json({ message: `「${parsed.name}」已存在，请勿重复添加` });
  }
  if (!parsed.image_url) {
    return res.status(400).json({ message: '请上传图片或填写图片地址' });
  }

  const organism: Organism = {
    id: uuidv4(),
    name: parsed.name!,
    scientific_name: parsed.scientific_name!,
    category: parsed.category!,
    description: parsed.description!,
    image_url: parsed.image_url!,
    habitat: parsed.habitat!,
    characteristics: parsed.characteristics && parsed.characteristics.length > 0
      ? parsed.characteristics
      : ['暂无记录'],
    created_at: new Date().toISOString(),
  };

  db.organisms.push(organism);
  scheduleSave();
  res.status(201).json(organism);
});

// 编辑生物资料
app.put('/api/admin/organisms/:id', requireAdmin, (req, res) => {
  const organism = db.organisms.find((o) => o.id === req.params.id);
  if (!organism) {
    return res.status(404).json({ message: '生物资料不存在' });
  }

  const parsed = parseOrganismBody({ ...organism, ...req.body });
  if ('error' in parsed) {
    return res.status(400).json({ message: parsed.error });
  }

  if (db.organisms.some((o) => o.name === parsed.name && o.id !== organism.id)) {
    return res.status(409).json({ message: `已存在同名生物「${parsed.name}」` });
  }

  organism.name = parsed.name!;
  organism.scientific_name = parsed.scientific_name!;
  organism.category = parsed.category!;
  organism.description = parsed.description!;
  organism.habitat = parsed.habitat!;
  if (parsed.characteristics && parsed.characteristics.length > 0) {
    organism.characteristics = parsed.characteristics;
  }
  if (parsed.image_url) {
    organism.image_url = parsed.image_url;
  }

  scheduleSave();
  res.json(organism);
});

// 删除生物（同时清理相关学习记录）
app.delete('/api/admin/organisms/:id', requireAdmin, (req, res) => {
  const index = db.organisms.findIndex((o) => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: '生物资料不存在' });
  }

  const [removed] = db.organisms.splice(index, 1);
  db.learningProgress = db.learningProgress.filter((p) => p.organism_id !== removed.id);
  scheduleSave();
  res.json({ message: '已删除' });
});

app.post('/api/learning/progress', (req, res) => {
  const { user_id, organism_id } = req.body;

  let progress = db.learningProgress.find(
    (p) => p.user_id === user_id && p.organism_id === organism_id
  );

  if (progress) {
    progress.learned = true;
    progress.learned_at = new Date().toISOString();
  } else {
    progress = {
      id: uuidv4(),
      user_id,
      organism_id,
      learned: true,
      learned_at: new Date().toISOString(),
    };
    db.learningProgress.push(progress);
  }
  scheduleSave();

  res.json(progress);
});

app.get('/api/learning/progress', (req, res) => {
  const { user_id } = req.query;
  const userProgress = db.learningProgress.filter((p) => p.user_id === user_id);
  res.json(userProgress);
});

app.get('/api/challenge/questions', (req, res) => {
  const { count = '5', mode = 'image_to_name' } = req.query;

  const questionCount = Math.min(parseInt(count as string) || 5, db.organisms.length);
  const shuffled = [...db.organisms].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, questionCount);

  const questions = selected.map((organism) => {
    // 每个选项都携带名称与图片，避免前端在题目列表里反查干扰项图片
    const otherOrganisms = db.organisms.filter((o) => o.id !== organism.id);
    const shuffledOthers = otherOrganisms.sort(() => Math.random() - 0.5);
    const wrongOptions = shuffledOthers.slice(0, 3).map((o) => ({
      id: o.id,
      name: o.name,
      image_url: o.image_url,
    }));
    const options = [
      ...wrongOptions,
      { id: organism.id, name: organism.name, image_url: organism.image_url },
    ].sort(() => Math.random() - 0.5);

    return {
      id: organism.id,
      type: mode,
      organism,
      options,
      correct_answer: organism.name,
    };
  });

  res.json(questions);
});

app.post('/api/challenge/submit', (req, res) => {
  const { user_id, answers } = req.body;

  let correctCount = 0;
  answers.forEach((answer: { questionId: string; userAnswer: string }) => {
    const organism = db.organisms.find((o) => o.id === answer.questionId);
    if (organism && answer.userAnswer === organism.name) {
      correctCount++;
    }
  });

  const record: ChallengeRecord = {
    id: uuidv4(),
    user_id,
    score: correctCount * 20,
    total_questions: answers.length,
    correct_count: correctCount,
    created_at: new Date().toISOString(),
  };

  db.challengeRecords.push(record);
  scheduleSave();
  res.json(record);
});

app.get('/api/challenge/results', (req, res) => {
  const { user_id } = req.query;
  const userRecords = db.challengeRecords.filter((r) => r.user_id === user_id);
  res.json(userRecords);
});

// ---------------- 聊天 ----------------

app.get('/api/chat/conversations', (req, res) => {
  const { user_id } = req.query;

  // 会话对象：好友 + 有过消息往来的人
  const partnerIds = new Set<string>();
  db.messages.forEach((m) => {
    if (m.sender_id === user_id) partnerIds.add(m.receiver_id);
    if (m.receiver_id === user_id) partnerIds.add(m.sender_id);
  });
  getAcceptedFriendIds(user_id as string).forEach((id) => partnerIds.add(id));

  const conversations = [...partnerIds]
    .map((id) => {
      const otherUser = db.users.find((u) => u.id === id);
      const conversationMessages = db.messages.filter(
        (m) =>
          (m.sender_id === user_id && m.receiver_id === id) ||
          (m.sender_id === id && m.receiver_id === user_id)
      );
      const latestMessage = conversationMessages.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        id,
        user: safeUser(otherUser),
        latestMessage,
        unreadCount: conversationMessages.filter((m) => m.receiver_id === user_id && !m.read).length,
      };
    })
    .sort((a, b) => {
      const ta = a.latestMessage ? new Date(a.latestMessage.created_at).getTime() : 0;
      const tb = b.latestMessage ? new Date(b.latestMessage.created_at).getTime() : 0;
      return tb - ta;
    });

  res.json(conversations);
});

app.get('/api/chat/messages', (req, res) => {
  const { user_id, conversation_id } = req.query;

  const conversationMessages = db.messages
    .filter(
      (m) =>
        (m.sender_id === user_id && m.receiver_id === conversation_id) ||
        (m.sender_id === conversation_id && m.receiver_id === user_id)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let changed = false;
  conversationMessages.forEach((m) => {
    if (m.receiver_id === user_id && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) scheduleSave();

  res.json(
    conversationMessages.map((m) => ({
      ...m,
      sender: safeUser(db.users.find((u) => u.id === m.sender_id)),
      receiver: safeUser(db.users.find((u) => u.id === m.receiver_id)),
    }))
  );
});

app.post('/api/chat/messages', (req, res) => {
  const { sender_id, receiver_id, content, image_url } = req.body;

  const sender = db.users.find((u) => u.id === sender_id);
  const receiver = db.users.find((u) => u.id === receiver_id);

  if (!sender || !receiver) {
    return res.status(404).json({ message: '用户不存在' });
  }
  if (!content?.trim() && !image_url) {
    return res.status(400).json({ message: '消息内容不能为空' });
  }

  const newMessage: Message = {
    id: uuidv4(),
    sender_id,
    receiver_id,
    content: content?.trim() || '',
    image_url: image_url || undefined,
    read: false,
    created_at: new Date().toISOString(),
  };

  db.messages.push(newMessage);
  scheduleSave();

  res.status(201).json({
    ...newMessage,
    sender: safeUser(sender),
    receiver: safeUser(receiver),
  });
});

// ---------------- 健康检查 & 生产环境前端托管 ----------------

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA 回退：非 /api 的 GET 请求一律交给前端路由处理
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// Vercel Serverless: 导出 Express app
export default app;

// 本地开发：监听端口
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
