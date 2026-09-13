import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
}

interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

interface Organism {
  id: string;
  name: string;
  scientific_name: string;
  category: string;
  description: string;
  image_url: string;
  habitat: string;
  characteristics: string[];
  created_at: string;
}

interface LearningProgress {
  id: string;
  user_id: string;
  organism_id: string;
  learned: boolean;
  learned_at?: string;
}

interface ChallengeRecord {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_count: number;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  read: boolean;
  created_at: string;
}

interface Session {
  token: string;
  user_id: string;
  created_at: string;
}

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'system';
  from_user_id: string;
  to_user_id: string;
  post_id?: string;
  preview?: string;
  read: boolean;
  created_at: string;
}

interface DB {
  users: User[];
  posts: Post[];
  comments: Comment[];
  likes: Like[];
  friends: Friend[];
  messages: Message[];
  sessions: Session[];
  organisms: Organism[];
  learningProgress: LearningProgress[];
  challengeRecords: ChallengeRecord[];
  notifications: Notification[];
}

const safeUser = (u?: User) => (u ? { ...u, password: undefined } : undefined);

// ---------------- 持久化（JSON 文件，重启不丢数据） ----------------

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 400);
}

function saveNow() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

process.on('SIGINT', () => {
  saveNow();
  process.exit(0);
});
process.on('SIGTERM', () => {
  saveNow();
  process.exit(0);
});

// ---------------- 种子数据 ----------------

const img = (prompt: string, size = 'landscape_4_3') =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

function seedDB(): DB {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

  const users: User[] = [
    {
      id: '1',
      username: 'biologist',
      email: 'bio@example.com',
      password: bcrypt.hashSync('123456', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=biologist',
      bio: '热爱大自然的生物学家，喜欢在山野间寻找生命的惊喜 🌿',
      role: 'user',
      created_at: hoursAgo(24 * 90),
      updated_at: hoursAgo(24),
    },
    {
      id: 'admin',
      username: 'admin',
      email: 'admin@example.com',
      password: bcrypt.hashSync('admin123', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      bio: '系统管理员',
      role: 'admin',
      created_at: hoursAgo(24 * 100),
      updated_at: hoursAgo(24 * 100),
    },
    {
      id: '2',
      username: 'nature_lens',
      email: 'lens@example.com',
      password: bcrypt.hashSync('123456', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lens',
      bio: '自然摄影师，用镜头记录每一个鲜活的瞬间 📷',
      role: 'user',
      created_at: hoursAgo(24 * 60),
      updated_at: hoursAgo(72),
    },
    {
      id: '3',
      username: 'feather_wang',
      email: 'wang@example.com',
      password: bcrypt.hashSync('123456', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
      bio: '观鸟十年，扛着望远镜走遍大江南北 🦅',
      role: 'user',
      created_at: hoursAgo(24 * 45),
      updated_at: hoursAgo(12),
    },
    {
      id: '4',
      username: 'ocean_li',
      email: 'li@example.com',
      password: bcrypt.hashSync('123456', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
      bio: '海洋生物研究者，蓝色星球的守护者 🌊',
      role: 'user',
      created_at: hoursAgo(24 * 30),
      updated_at: hoursAgo(48),
    },
    {
      id: '5',
      username: 'bug_ye',
      email: 'ye@example.com',
      password: bcrypt.hashSync('123456', 10),
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ye',
      bio: '昆虫学研究生，虫子的世界比你想象的精彩 🐛',
      role: 'user',
      created_at: hoursAgo(24 * 20),
      updated_at: hoursAgo(6),
    },
  ];

  const posts: Post[] = [
    {
      id: 'p1', user_id: '1',
      content: '今天在公园拍到了一只漂亮的蝴蝶，翅膀上的花纹像精密的艺术品。停在花上采蜜的样子太治愈了！你们能认出是什么品种吗？',
      image_url: img('beautiful colorful butterfly collecting nectar on flower in sunny garden, macro photography'),
      tags: ['蝴蝶', '自然摄影'],
      likes_count: 3, comments_count: 2, created_at: hoursAgo(3), updated_at: hoursAgo(3),
    },
    {
      id: 'p2', user_id: '2',
      content: '四川之行最满意的一张——大熊猫抱着竹子吃得正香。为了这个瞬间在冷风中蹲了两个小时，一切都值了。',
      image_url: img('cute giant panda eating bamboo in misty forest, wildlife photography'),
      tags: ['大熊猫', '国宝', '自然摄影'],
      likes_count: 4, comments_count: 1, created_at: hoursAgo(6), updated_at: hoursAgo(6),
    },
    {
      id: 'p3', user_id: '4',
      content: '出海考察遇到一群海豚结伴而行，时不时跃出水面，像在和我们打招呼。海洋的精灵永远不会让人失望 🐬',
      image_url: img('pod of dolphins jumping out of blue ocean waves, sunlight'),
      tags: ['海豚', '海洋生物'],
      likes_count: 3, comments_count: 1, created_at: hoursAgo(10), updated_at: hoursAgo(10),
    },
    {
      id: 'p4', user_id: '3',
      content: '湿地偶遇朱鹮！曾经只剩7只的濒危物种，如今种群正在慢慢恢复，保护的意义大概就在这一刻。',
      image_url: img('crested ibis bird flying over wetland at sunrise, elegant'),
      tags: ['朱鹮', '鸟类观察', '珍稀动物'],
      likes_count: 2, comments_count: 0, created_at: hoursAgo(20), updated_at: hoursAgo(20),
    },
    {
      id: 'p5', user_id: '5',
      content: '科普一下：蜜蜂的“8字舞”是在告诉同伴蜜源的方向和距离，一个蜂群每天能采集成千上万朵花。下次见到它们，记得说声谢谢 🐝',
      image_url: img('honey bee covered in pollen on yellow flower, extreme macro'),
      tags: ['蜜蜂', '昆虫世界', '冷知识'],
      likes_count: 2, comments_count: 1, created_at: hoursAgo(28), updated_at: hoursAgo(28),
    },
    {
      id: 'p6', user_id: '2',
      content: '孔雀开屏的瞬间被我抓拍到了！尾羽上的“眼斑”其实是用来吓唬天敌和求偶展示的，每一根羽毛都恰到好处。',
      image_url: img('peacock displaying colorful feather tail, vivid'),
      tags: ['鸟类观察', '自然摄影'],
      likes_count: 1, comments_count: 0, created_at: hoursAgo(50), updated_at: hoursAgo(50),
    },
    {
      id: 'p7', user_id: '1',
      content: '夜观活动收获：一只停在枝头的猫头鹰。它的羽毛边缘有锯齿状结构，能切碎气流，所以飞行几乎没有声音——大自然的静音工程学。',
      image_url: img('owl perched on tree branch at night, moonlight, sharp eyes'),
      tags: ['猫头鹰', '鸟类观察'],
      likes_count: 2, comments_count: 0, created_at: hoursAgo(70), updated_at: hoursAgo(70),
    },
  ];

  const comments: Comment[] = [
    { id: 'c1', post_id: 'p1', user_id: '2', content: '是斐豹蛱蝶！翅膀斑纹的特征很明显，好拍摄！', created_at: hoursAgo(2) },
    { id: 'c2', post_id: 'p1', user_id: '3', content: '这个季节公园里确实很多，周末我也去碰碰运气。', created_at: hoursAgo(1) },
    { id: 'c3', post_id: 'p2', user_id: '1', content: '太可爱了！两个小时的等待完全值得，构图太棒了。', created_at: hoursAgo(5) },
    { id: 'c4', post_id: 'p3', user_id: '1', content: '能在野外遇到海豚群也太幸运了吧！', created_at: hoursAgo(9) },
    { id: 'c5', post_id: 'p5', user_id: '4', content: '冷知识+1，下次一定当面道谢哈哈。', created_at: hoursAgo(26) },
  ];

  const like = (id: string, postId: string, userId: string, h: number): Like =>
    ({ id, post_id: postId, user_id: userId, created_at: hoursAgo(h) });

  const likes: Like[] = [
    like('l1', 'p1', '2', 2.5), like('l2', 'p1', '3', 2), like('l3', 'p1', '5', 1.5),
    like('l4', 'p2', '1', 5.5), like('l5', 'p2', '3', 5), like('l6', 'p2', '4', 4), like('l7', 'p2', '5', 3),
    like('l8', 'p3', '1', 9), like('l9', 'p3', '2', 8), like('l10', 'p3', '3', 7),
    like('l11', 'p4', '1', 18), like('l12', 'p4', '2', 16),
    like('l13', 'p5', '1', 27), like('l14', 'p5', '3', 25),
    like('l15', 'p6', '1', 48),
    like('l16', 'p7', '3', 60), like('l17', 'p7', '2', 55),
  ];

  const friends: Friend[] = [
    { id: 'f1', user_id: '1', friend_id: '2', status: 'accepted', created_at: hoursAgo(24 * 40) },
    { id: 'f2', user_id: '1', friend_id: '3', status: 'accepted', created_at: hoursAgo(24 * 30) },
    { id: 'f3', user_id: '1', friend_id: '4', status: 'accepted', created_at: hoursAgo(24 * 20) },
    { id: 'f4', user_id: '2', friend_id: '3', status: 'accepted', created_at: hoursAgo(24 * 15) },
    { id: 'f5', user_id: '5', friend_id: '1', status: 'pending', created_at: hoursAgo(2) },
  ];

  const notifications: Notification[] = [
    { id: 'n1', type: 'friend_request', from_user_id: '5', to_user_id: '1', read: false, created_at: hoursAgo(2), preview: '请求添加你为好友' },
    { id: 'n2', type: 'like', from_user_id: '5', to_user_id: '1', post_id: 'p1', read: false, preview: '赞了你的动态', created_at: hoursAgo(1.5) },
    { id: 'n3', type: 'comment', from_user_id: '3', to_user_id: '1', post_id: 'p1', read: false, preview: '这个季节公园里确实很多，周末我也去碰碰运气。', created_at: hoursAgo(1) },
    { id: 'n4', type: 'like', from_user_id: '2', to_user_id: '1', post_id: 'p7', read: true, preview: '赞了你的动态', created_at: hoursAgo(55) },
  ];

  const organisms: Organism[] = [
    {
      id: '1', name: '大熊猫', scientific_name: 'Ailuropoda melanoleuca', category: '哺乳动物',
      description: '大熊猫是中国特有的珍稀动物，以竹子为主要食物，被誉为活化石。',
      image_url: img('cute giant panda eating bamboo in forest', 'portrait_4_3'),
      habitat: '中国四川、陕西、甘肃等地',
      characteristics: ['黑白相间的毛色', '圆滚滚的体型', '喜欢吃竹子'],
      created_at: new Date().toISOString(),
    },
    {
      id: '2', name: '金丝猴', scientific_name: 'Rhinopithecus', category: '哺乳动物',
      description: '金丝猴是中国特有的珍稀灵长类动物，以金色的毛发而闻名。',
      image_url: img('golden snub-nosed monkey in tree', 'portrait_4_3'),
      habitat: '中国云南、四川、贵州等地',
      characteristics: ['金色的毛发', '向上翘的鼻子', '群居生活'],
      created_at: new Date().toISOString(),
    },
    {
      id: '3', name: '东北虎', scientific_name: 'Panthera tigris altaica', category: '哺乳动物',
      description: '东北虎是世界上最大的猫科动物，又称西伯利亚虎。',
      image_url: img('siberian tiger in snow forest', 'portrait_4_3'),
      habitat: '中国东北、俄罗斯远东地区',
      characteristics: ['体型庞大', '条纹皮毛', '顶级捕食者'],
      created_at: new Date().toISOString(),
    },
    {
      id: '4', name: '朱鹮', scientific_name: 'Nipponia nippon', category: '鸟类',
      description: '朱鹮是珍稀濒危鸟类，曾经濒临灭绝，经过保护现已恢复。',
      image_url: img('crested ibis bird flying', 'portrait_4_3'),
      habitat: '中国陕西等地',
      characteristics: ['红色的脸颊', '白色羽毛', '濒危物种'],
      created_at: new Date().toISOString(),
    },
    {
      id: '5', name: '蓝鲸', scientific_name: 'Balaenoptera musculus', category: '哺乳动物',
      description: '蓝鲸是地球上最大的动物，生活在海洋中。',
      image_url: img('blue whale swimming in ocean', 'portrait_4_3'),
      habitat: '全球各大洋',
      characteristics: ['体型最大', '蓝色皮肤', '须鲸'],
      created_at: new Date().toISOString(),
    },
    {
      id: '6', name: '蜜蜂', scientific_name: 'Apis mellifera', category: '昆虫',
      description: '蜜蜂是重要的授粉昆虫，能够生产蜂蜜。',
      image_url: img('honey bee on flower', 'portrait_4_3'),
      habitat: '全球各地',
      characteristics: ['黄色黑色条纹', '采蜜', '社会性昆虫'],
      created_at: new Date().toISOString(),
    },
    {
      id: '7', name: '蝴蝶', scientific_name: 'Rhopalocera', category: '昆虫',
      description: '蝴蝶是美丽的昆虫，幼虫阶段是毛毛虫。',
      image_url: img('colorful butterfly on flower', 'portrait_4_3'),
      habitat: '全球各地',
      characteristics: ['绚丽的翅膀', '完全变态', '传粉'],
      created_at: new Date().toISOString(),
    },
    {
      id: '8', name: '孔雀', scientific_name: 'Pavo', category: '鸟类',
      description: '孔雀以其华丽的尾羽而闻名，开屏时非常壮观。',
      image_url: img('peacock displaying colorful feathers', 'portrait_4_3'),
      habitat: '南亚、东南亚',
      characteristics: ['华丽尾羽', '开屏展示', '雉科'],
      created_at: new Date().toISOString(),
    },
    {
      id: '9', name: '海豚', scientific_name: 'Delphinidae', category: '哺乳动物',
      description: '海豚是聪明的海洋哺乳动物，具有很高的智商。',
      image_url: img('dolphin jumping out of water', 'portrait_4_3'),
      habitat: '全球各大洋',
      characteristics: ['聪明', '群居', '回声定位'],
      created_at: new Date().toISOString(),
    },
    {
      id: '10', name: '猫头鹰', scientific_name: 'Strigiformes', category: '鸟类',
      description: '猫头鹰是夜行性猛禽，具有敏锐的听觉和视觉。',
      image_url: img('owl perched on tree branch', 'portrait_4_3'),
      habitat: '全球各地',
      characteristics: ['夜行性', '大眼睛', '无声飞行'],
      created_at: new Date().toISOString(),
    },
    {
      id: '11', name: '松鼠', scientific_name: 'Sciuridae', category: '哺乳动物',
      description: '松鼠是活泼可爱的小动物，喜欢储存坚果。',
      image_url: img('cute squirrel eating nut in tree', 'portrait_4_3'),
      habitat: '全球各地森林',
      characteristics: ['蓬松尾巴', '喜欢坚果', '善于攀爬'],
      created_at: new Date().toISOString(),
    },
    {
      id: '12', name: '企鹅', scientific_name: 'Spheniscidae', category: '鸟类',
      description: '企鹅是不会飞的鸟类，生活在南极和南半球。',
      image_url: img('emperor penguin in snow', 'portrait_4_3'),
      habitat: '南极及周边海域',
      characteristics: ['不会飞', '黑白配色', '游泳高手'],
      created_at: new Date().toISOString(),
    },
  ];

  return {
    users, posts, comments, likes, friends,
    messages: [], sessions: [], organisms,
    learningProgress: [], challengeRecords: [], notifications,
  };
}

function loadDB(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      return {
        users: raw.users ?? [],
        posts: raw.posts ?? [],
        comments: raw.comments ?? [],
        likes: raw.likes ?? [],
        friends: raw.friends ?? [],
        messages: raw.messages ?? [],
        sessions: raw.sessions ?? [],
        organisms: raw.organisms?.length ? raw.organisms : seedDB().organisms,
        learningProgress: raw.learningProgress ?? [],
        challengeRecords: raw.challengeRecords ?? [],
        notifications: raw.notifications ?? [],
      };
    }
  } catch (e) {
    console.error('加载数据失败，使用种子数据:', e);
  }
  const seeded = seedDB();
  fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2));
  return seeded;
}

const db: DB = loadDB();

// 定时落盘（兜底）
setInterval(() => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveNow();
}, 5000);

// ---------------- 工具函数 ----------------

function generateToken(): string {
  return uuidv4();
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  const session = token ? db.sessions.find((s) => s.token === token) : undefined;
  const user = session ? db.users.find((u) => u.id === session.user_id) : undefined;

  if (!user) {
    return res.status(401).json({ message: '请先登录' });
  }

  (req as any).user = user;
  next();
}

// 管理员鉴权：必须登录且 role 为 admin
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  const session = token ? db.sessions.find((s) => s.token === token) : undefined;
  const user = session ? db.users.find((u) => u.id === session.user_id) : undefined;

  if (!user) {
    return res.status(401).json({ message: '请先登录' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }

  (req as any).user = user;
  next();
}

// 可选鉴权：登录了就挂上 user，没登录也放行
function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  const session = token ? db.sessions.find((s) => s.token === token) : undefined;
  const user = session ? db.users.find((u) => u.id === session.user_id) : undefined;
  if (user) (req as any).user = user;
  next();
}

function getUserId(req: express.Request): string | undefined {
  return (req as any).user?.id || (req.body && req.body.user_id) || (req.query.user_id as string);
}

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
  const token = generateToken();
  db.sessions.push({ token, user_id: newUser.id, created_at: new Date().toISOString() });
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

  const token = generateToken();
  db.sessions.push({ token, user_id: user.id, created_at: new Date().toISOString() });
  scheduleSave();

  res.json({ user: safeUser(user), token });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(safeUser((req as any).user));
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    scheduleSave();
  }
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
    user.avatar_url = `/uploads/${req.file.filename}`;
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
  res.json({ url: `/uploads/${req.file.filename}` });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
