
export interface Vocabulary {
  id: string;
  kanji: string;
  reading: string;
  meaning: string;
  category?: 'kanji' | 'verb' | 'general';
  lesson: number; // Thêm trường bài số mấy
  example?: string;
  exampleTranslation?: string;
}

export type TabType = 'flashcard' | 'quiz' | 'list' | 'add';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
