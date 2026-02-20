import { useEffect, useMemo, useState } from 'react';
import { kanaData, rowNames } from '../data/kanaData';
import { useI18n } from '../hooks/useI18n';

interface KanaFillBlanksPracticeProps {
  kanaType: 'hiragana' | 'katakana';
}

type AnswerState = { value: string; correct?: boolean };

const buildCells = (kanaType: 'hiragana' | 'katakana') => {
  const sorted = [...kanaData].sort((a, b) => {
    if (a.rowName === b.rowName) return a.position - b.position;
    return rowNames.indexOf(a.rowName) - rowNames.indexOf(b.rowName);
  });

  return sorted
    .filter(k => k.rowName !== 'other')
    .map(k => ({
      id: k.id,
      rowName: k.rowName,
      position: k.position,
      prompt: k.romaji,
      answer: kanaType === 'hiragana' ? k.hiragana : k.katakana,
    }));
};

export function KanaFillBlanksPractice({ kanaType }: KanaFillBlanksPracticeProps) {
  const { t } = useI18n();
  const cells = useMemo(() => buildCells(kanaType), [kanaType]);

  const [blankIds, setBlankIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [checked, setChecked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  const blanksCount = 20;

  const makeNewRound = () => {
    const shuffled = [...cells].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(blanksCount, shuffled.length)).map(c => c.id);

    const nextBlankIds = new Set(chosen);
    const nextAnswers: Record<string, AnswerState> = {};
    chosen.forEach(id => {
      nextAnswers[id] = { value: '' };
    });

    setBlankIds(nextBlankIds);
    setAnswers(nextAnswers);
    setChecked(false);
    setSecondsLeft(5 * 60);
  };

  useEffect(() => {
    makeNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanaType]);

  useEffect(() => {
    if (checked) return;
    if (secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [checked, secondsLeft]);

  const onChange = (id: string, value: string) => {
    if (checked) return;
    setAnswers(prev => ({
      ...prev,
      [id]: { ...prev[id], value },
    }));
  };

  const checkAnswers = () => {
    const next: Record<string, AnswerState> = { ...answers };
    blankIds.forEach(id => {
      const cell = cells.find(c => c.id === id);
      if (!cell) return;
      const user = (next[id]?.value ?? '').trim();
      next[id] = {
        value: user,
        correct: user === cell.answer,
      };
    });
    setAnswers(next);
    setChecked(true);
  };

  useEffect(() => {
    if (checked) return;
    if (secondsLeft > 0) return;
    checkAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, checked]);

  const timeText = useMemo(() => {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  const score = useMemo(() => {
    const ids = [...blankIds];
    const total = ids.length;
    const correct = ids.filter(id => answers[id]?.correct).length;
    return { correct, total };
  }, [answers, blankIds]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('practice_fill_title')}</h2>
            <p className="text-gray-600 text-sm mt-1">{t('practice_fill_subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">
              {t('practice_score')}: {score.correct} / {score.total}
            </div>
            <div className="text-sm text-gray-700">
              {t('practice_time_left')}: {timeText}
            </div>
            <button
              onClick={checkAnswers}
              disabled={checked}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                checked
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {t('practice_check')}
            </button>
            <button
              onClick={makeNewRound}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium"
            >
              {t('practice_new_round')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cells.map(cell => {
            const isBlank = blankIds.has(cell.id);
            if (!isBlank) {
              return (
                <div
                  key={cell.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="text-xs text-gray-500 mb-1">{cell.prompt}</div>
                  <div className="text-2xl font-semibold text-gray-800">{cell.answer}</div>
                </div>
              );
            }

            const state = answers[cell.id] ?? { value: '' };
            const border = !checked
              ? 'border-gray-300'
              : state.correct
              ? 'border-green-500'
              : 'border-red-500';

            return (
              <div key={cell.id} className={`border rounded-lg p-3 bg-white ${border}`}>
                <div className="text-xs text-gray-500 mb-2">{cell.prompt}</div>
                <input
                  value={state.value}
                  onChange={(e) => onChange(cell.id, e.target.value)}
                  className="w-full text-2xl font-semibold text-gray-800 outline-none border-b border-gray-200 focus:border-blue-500"
                  placeholder={t('practice_fill_placeholder')}
                />
                {checked && !state.correct && (
                  <div className="text-xs text-gray-500 mt-2">
                    {t('practice_correct')}: <span className="font-semibold">{cell.answer}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
