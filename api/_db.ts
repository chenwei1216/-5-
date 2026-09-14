// MongoDB 连接 + 数据持久化（单文档模式，整个 DB 存为一个 MongoDB 文档）
import { MongoClient, Db as MongoDb } from 'mongodb';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// ---------------- 类型定义 ----------------

export interface User {
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

export interface Post {
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

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface Organism {
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

export interface LearningProgress {
  id: string;
  user_id: string;
  organism_id: string;
  learned: boolean;
  learned_at?: string;
}

export interface ChallengeRecord {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'system';
  from_user_id: string;
  to_user_id: string;
  post_id?: string;
  preview?: string;
  read: boolean;
  created_at: string;
}

export interface DB {
  users: User[];
  posts: Post[];
  comments: Comment[];
  likes: Like[];
  friends: Friend[];
  messages: Message[];
  organisms: Organism[];
  learningProgress: LearningProgress[];
  challengeRecords: ChallengeRecord[];
  notifications: Notification[];
}

// ---------------- MongoDB 连接 ----------------

const uri = process.env.MONGODB_URI || '';
const DB_DOC_ID = 'qingke' as any;
const COL_NAME = 'app';

const client = new MongoClient(uri);
let mongoDb: MongoDb | null = null;

// 内存缓存（serverless 每个实例缓存一份，TTL 30 秒后刷新）
let cache: DB | null = null;
let lastLoadTime = 0;
const CACHE_TTL = 30000;

async function ensureConnection() {
  if (!mongoDb) {
    await client.connect();
    mongoDb = client.db();
  }
  return mongoDb;
}

export async function getDB(): Promise<DB> {
  if (cache && Date.now() - lastLoadTime < CACHE_TTL) {
    return cache;
  }
  const db = await ensureConnection();
  const col = db.collection(COL_NAME);
  const doc = await col.findOne<{ data: DB }>({ _id: DB_DOC_ID });

  if (doc?.data) {
    cache = doc.data;
  } else {
    // 首次部署：写入种子数据
    cache = seedDB();
    await col.updateOne(
      { _id: DB_DOC_ID },
      { $set: { data: cache } },
      { upsert: true }
    );
  }
  lastLoadTime = Date.now();
  return cache;
}

// ---------------- 持久化（防抖落盘到 MongoDB） ----------------

let saveTimer: NodeJS.Timeout | null = null;

export function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 400);
}

async function saveNow() {
  if (!cache) return;
  try {
    const db = await ensureConnection();
    await db.collection(COL_NAME).updateOne(
      { _id: DB_DOC_ID },
      { $set: { data: cache } },
      { upsert: true }
    );
  } catch (e) {
    console.error('保存数据到 MongoDB 失败:', e);
  }
}

// 进程退出时确保数据落盘
process.on('SIGINT', () => {
  saveNow().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  saveNow().finally(() => process.exit(0));
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
      content: '科普一下：蜜蜂的"8字舞"是在告诉同伴蜜源的方向和距离，一个蜂群每天能采集成千上万朵花。下次见到它们，记得说声谢谢 🐝',
      image_url: img('honey bee covered in pollen on yellow flower, extreme macro'),
      tags: ['蜜蜂', '昆虫世界', '冷知识'],
      likes_count: 2, comments_count: 1, created_at: hoursAgo(28), updated_at: hoursAgo(28),
    },
    {
      id: 'p6', user_id: '2',
      content: '孔雀开屏的瞬间被我抓拍到了！尾羽上的"眼斑"其实是用来吓唬天敌和求偶展示的，每一根羽毛都恰到好处。',
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
    messages: [], organisms,
    learningProgress: [], challengeRecords: [], notifications,
  };
}

// ---------------- 工具函数 ----------------

export const safeUser = (u?: User) => (u ? { ...u, password: undefined } : undefined);
