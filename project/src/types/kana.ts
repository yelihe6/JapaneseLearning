export interface Kana {
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  rowName: string;
  position: number;
}

export interface UserNote {
  kanaId: string;
  noteHiragana?: string;
  noteKatakana?: string;
  imagesHiragana?: string[];
  imagesKatakana?: string[];
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  type: 'visual' | 'audio' | 'vocabulary';
  kanaChars?: Kana[];
  correctAnswer: string;
  options: string[];
  word?: string;
  meaning?: string;
}

export interface Greeting {
  id: string;
  japanese: string;
  hiragana: string;
  romaji: string;
  english: string;
  chinese?: string;
  category: 'greeting' | 'polite' | 'casual' | 'gratitude' | 'apology';
  audioUrl?: string;
}
