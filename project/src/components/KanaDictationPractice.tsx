import { useEffect, useMemo, useState } from 'react';
import { Volume2, SkipForward } from 'lucide-react';
import { kanaData } from '../data/kanaData';
import { speechService } from '../services/speechService';
import { useI18n } from '../hooks/useI18n';

interface KanaDictationPracticeProps {
  kanaType: 'hiragana' | 'katakana';
}

type Mode = 'romaji' | 'audio';

export function KanaDictationPractice({ kanaType }: KanaDictationPracticeProps) {
  const { t } = useI18n();
  const pool = useMemo(() => kanaData.filter(k => k.rowName !== 'other'), []);

  const [mode, setMode] = useState<Mode>('romaji');
  const [currentId, setCurrentId] = useState<string>('');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showAnswer, setShowAnswer] = useState(false);

  const current = useMemo(() => pool.find(k => k.id === currentId) ?? null, [pool, currentId]);

  const nextQuestion = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const pick = shuffled[0];
    if (!pick) return;
    setCurrentId(pick.id);
    setInput('');
    setResult('idle');
    setShowAnswer(false);

    if (mode === 'audio') {
      const toSpeak = kanaType === 'hiragana' ? pick.hiragana : pick.katakana;
      setTimeout(() => speechService.speak(toSpeak), 300);
    }
  };

  useEffect(() => {
    nextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanaType, mode]);

  const expected = current ? (kanaType === 'hiragana' ? current.hiragana : current.katakana) : '';

  const check = () => {
    if (!current) return;
    const normalized = input.trim();
    const isCorrect = normalized === expected;

    setResult(isCorrect ? 'correct' : 'wrong');
    setShowAnswer(true);
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const play = () => {
    if (!current) return;
    const toSpeak = kanaType === 'hiragana' ? current.hiragana : current.katakana;
    speechService.speak(toSpeak);
  };

  const border = result === 'idle'
    ? 'border-gray-200'
    : result === 'correct'
    ? 'border-green-500'
    : 'border-red-500';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t('practice_dictation_title')}</h2>
              <p className="text-gray-600 text-sm mt-1">{t('practice_dictation_subtitle')}</p>
            </div>

            <div className="text-sm text-gray-700">
              {t('practice_score')}: {score.correct} / {score.total}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('romaji')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'romaji' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              {t('practice_dictation_mode_romaji')}
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'audio' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              {t('practice_dictation_mode_audio')}
            </button>
          </div>
        </div>

        <div className={`border-2 ${border} rounded-lg p-6 mb-6`}>
          {current ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  {mode === 'romaji' ? t('practice_dictation_prompt_romaji') : t('practice_dictation_prompt_audio')}
                </div>
                <button
                  type="button"
                  onClick={play}
                  className="p-2 rounded-full hover:bg-blue-50 text-blue-600"
                  title={t('speak')}
                >
                  <Volume2 size={20} />
                </button>
              </div>

              <div className="text-center text-5xl font-bold text-gray-800 mb-4">
                {mode === 'romaji' ? current.romaji : '♪'}
              </div>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full text-3xl text-center font-semibold outline-none border-b border-gray-200 focus:border-blue-500 py-2"
                placeholder={t('practice_dictation_placeholder')}
              />

              {showAnswer && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  {t('practice_correct')}: <span className="font-semibold">{expected}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={check}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            {t('practice_check')}
          </button>

          <button
            onClick={nextQuestion}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium flex items-center gap-2"
          >
            <SkipForward size={20} />
            {t('practice_next')}
          </button>
        </div>
      </div>
    </div>
  );
}
