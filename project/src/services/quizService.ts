import { Kana, QuizQuestion } from '../types/kana';
import { kanaData } from '../data/kanaData';
import { vocabularyQuestions } from '../data/vocabularyData';

export class QuizService {
  private getRandomKana(count: number, exclude: string[] = []): Kana[] {
    const available = kanaData.filter(k => !exclude.includes(k.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  generateVisualQuestion(): QuizQuestion {
    const numKana = Math.random() > 0.5 ? 1 : 2;
    const questionKana = this.getRandomKana(numKana);

    const correctAnswer = questionKana.map(k => k.romaji).join('');

    const wrongOptions = this.getRandomKana(3, questionKana.map(k => k.id))
      .map(k => k.romaji);

    const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

    return {
      id: `visual-${Date.now()}`,
      type: 'visual',
      kanaChars: questionKana,
      correctAnswer,
      options,
    };
  }

  generateAudioQuestion(kanaType: 'hiragana' | 'katakana'): QuizQuestion {
    const numKana = Math.random() > 0.5 ? 1 : 2;
    const questionKana = this.getRandomKana(numKana);

    const correctAnswer = questionKana.map(k =>
      kanaType === 'hiragana' ? k.hiragana : k.katakana
    ).join('');

    const wrongKana = this.getRandomKana(3, questionKana.map(k => k.id));
    const wrongOptions = wrongKana.map(k =>
      kanaType === 'hiragana' ? k.hiragana : k.katakana
    );

    const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

    return {
      id: `audio-${Date.now()}`,
      type: 'audio',
      kanaChars: questionKana,
      correctAnswer,
      options,
    };
  }

  generateVocabularyQuestion(): QuizQuestion {
    const vocab = vocabularyQuestions[Math.floor(Math.random() * vocabularyQuestions.length)];
    const correctAnswer = vocab.hiragana;

    const wrongVocab = vocabularyQuestions
      .filter(v => v.id !== vocab.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [correctAnswer, ...wrongVocab.map(v => v.hiragana)]
      .sort(() => Math.random() - 0.5);

    return {
      id: `vocab-${Date.now()}`,
      type: 'vocabulary',
      correctAnswer,
      options,
      word: vocab.japanese,
      meaning: vocab.english,
    };
  }

  generateRandomQuestion(kanaType: 'hiragana' | 'katakana'): QuizQuestion {
    const rand = Math.random();
    if (rand > 0.66) {
      return this.generateVisualQuestion();
    } else if (rand > 0.33) {
      return this.generateAudioQuestion(kanaType);
    } else {
      return this.generateVocabularyQuestion();
    }
  }
}

export const quizService = new QuizService();
