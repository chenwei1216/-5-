export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  role?: 'user' | 'admin';
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
  is_liked: boolean;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user: User;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export type FriendshipStatus =
  | 'self'
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friends';

export interface FriendUser extends User {
  status: 'pending' | 'accepted';
  record_id: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending';
  created_at: string;
  from_user: User;
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
  sender?: User;
  receiver?: User;
}

export interface Conversation {
  id: string;
  user: User | null;
  latestMessage?: Message;
  unreadCount: number;
}

export type NotificationType = 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  from_user_id: string;
  to_user_id: string;
  post_id?: string;
  preview?: string;
  read: boolean;
  created_at: string;
  from_user?: User;
  post_content?: string;
  post_image?: string;
}

export interface QuestionOption {
  id: string;
  name: string;
  image_url: string;
}

export interface Question {
  id: string;
  type: 'image_to_name' | 'name_to_image';
  organism: Organism;
  options: QuestionOption[];
  correct_answer: string;
}

export interface ChallengeResult {
  score: number;
  total_questions: number;
  correct_count: number;
  answers: {
    question: Question;
    user_answer: string;
    is_correct: boolean;
  }[];
}
