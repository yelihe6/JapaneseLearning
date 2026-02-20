import { useState, useEffect, useCallback } from 'react';
import { Volume2, Lightbulb, SkipForward } from 'lucide-react';
import { QuizQuestion } from '../types/kana';
import { quizService } from '../services/quizService';
import { speechService } from '../services/speechService';
import { storageService } from '../services/storageService';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../contexts/AuthContext';

interface QuizProps {
  kanaType: 'hiragana' | 'katakana';
}

export function Quiz({ kanaType }: QuizProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timer, setTimer] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const loadNewQuestion = useCallback(() => {
    const newQuestion = quizService.generateRandomQuestion(kanaType);
    setQuestion(newQuestion);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimer(0);
    setShowHint(false);

    if (newQuestion.type === 'audio' && newQuestion.kanaChars) {
      setTimeout(() => {
        const kanaChars = newQuestion.kanaChars;
        if (!kanaChars) return;

        const text = kanaChars
          .map(k => kanaType === 'hiragana' ? k.hiragana : k.katakana)
          .join('');
        speechService.speak(text);
      }, 500);
    }
  }, [kanaType]);

  useEffect(() => {
    loadNewQuestion();
  }, [loadNewQuestion]);

  useEffect(() => {
    if (!question || showResult) return;

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [question, showResult]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === question?.correctAnswer;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handlePlayAudio = () => {
    if (question && question.type === 'audio' && question.kanaChars) {
      const text = question.kanaChars
        .map(k => kanaType === 'hiragana' ? k.hiragana : k.katakana)
        .join('');
      speechService.speak(text);
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
  };

  const getUserHints = (): { kana: string; note: string }[] => {
    if (!question || !question.kanaChars || !user) return [];
    const noteType = kanaType === 'hiragana' ? 'noteHiragana' : 'noteKatakana';
    return question.kanaChars
      .map(kana => {
        const note = storageService.getNote(kana.id, user.id);
        const noteText = note ? note[noteType as keyof typeof note] : null;
        if (!noteText) return null;
        const noteStr = Array.isArray(noteText) ? noteText.join(' ') : noteText;
        return { kana: kanaType === 'hiragana' ? kana.hiragana : kana.katakana, note: noteStr };
      })
      .filter((h): h is { kana: string; note: string } => h != null);
  };

  if (!question) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('quiz_loading')}</div>
      </div>
    );
  }

  const userHints = getUserHints();
  const canShowHint = timer >= 10;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {t('quiz_score')}: {score.correct} / {score.total}
            {score.total > 0 && ` (${Math.round((score.correct / score.total) * 100)}%)`}
          </div>
          <div className="text-sm text-gray-600">
            {t('quiz_time')}: {timer}{t('quiz_seconds')}
          </div>
        </div>

        <div className="mb-8">
          <div className="text-center mb-4 text-gray-600 text-sm">
            {question.type === 'visual'
              ? t('quiz_prompt_visual')
              : question.type === 'audio'
              ? t('quiz_prompt_audio')
              : t('quiz_prompt_vocab')}
          </div>

          {question.type === 'visual' ? (
            <div className="text-center text-7xl font-bold mb-6 py-8">
              {question.kanaChars!.map(k => kanaType === 'hiragana' ? k.hiragana : k.katakana).join('')}
            </div>
          ) : question.type === 'audio' ? (
            <div className="flex justify-center mb-6 py-8">
              <button
                onClick={handlePlayAudio}
                className="p-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Volume2 size={48} />
              </button>
            </div>
          ) : (
            <div className="text-center text-5xl font-bold mb-6 py-8">
              <div className="mb-2 text-2xl">{question.word}</div>
              <div className="text-lg text-gray-600">{question.meaning}</div>
            </div>
          )}

          {canShowHint && !showHint && userHints.length > 0 && (
            <div className="flex justify-center mb-4">
              <button
                onClick={handleShowHint}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Lightbulb size={18} />
                {t('quiz_show_hint')}
              </button>
            </div>
          )}

          {showHint && userHints.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-semibold text-yellow-800 mb-2">{t('quiz_your_notes')}</div>
              {userHints.map((hint, index) => (
                <div key={index} className="text-sm text-yellow-700 mb-1">
                  <span className="font-bold">{hint.kana}:</span> {hint.note}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {question.options.map((option, index) => {
            let buttonClass = 'p-6 text-2xl font-semibold rounded-lg border-2 transition-all ';

            if (showResult) {
              if (option === question.correctAnswer) {
                buttonClass += 'bg-green-100 border-green-500 text-green-800';
              } else if (option === selectedAnswer) {
                buttonClass += 'bg-red-100 border-red-500 text-red-800';
              } else {
                buttonClass += 'bg-gray-100 border-gray-300 text-gray-600';
              }
            } else {
              buttonClass += 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
                className={buttonClass}
              >
                {option}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="flex justify-center">
            <button
              onClick={loadNewQuestion}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <SkipForward size={20} />
              {t('quiz_next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
