import { Volume2 } from 'lucide-react';
import { greetingsData } from '../data/greetingsData';
import { speechService } from '../services/speechService';
import { useI18n } from '../hooks/useI18n';

export function Greetings() {
  const { language, t } = useI18n();
  const categories = ['greeting', 'polite', 'casual', 'gratitude', 'apology'] as const;

  const handleSpeak = (text: string) => {
    speechService.speak(text);
  };

  const categoryLabels: Record<typeof categories[number], string> = {
    greeting: t('greetings_category_greeting'),
    polite: t('greetings_category_polite'),
    casual: t('greetings_category_casual'),
    gratitude: t('greetings_category_gratitude'),
    apology: t('greetings_category_apology'),
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="space-y-8">
        {categories.map(category => {
          const greetings = greetingsData.filter(g => g.category === category);
          return (
            <div key={category}>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {categoryLabels[category]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {greetings.map(greeting => (
                  <div
                    key={greeting.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-gray-800 mb-2">
                          {greeting.japanese}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {greeting.hiragana}
                        </div>
                        <div className="text-sm text-blue-600 font-medium mb-2">
                          {greeting.romaji}
                        </div>
                        {language === 'zh' && greeting.chinese ? (
                          <div className="text-sm text-gray-700 italic">
                            {greeting.chinese}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 italic">
                            {greeting.english}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSpeak(greeting.japanese)}
                        className="ml-4 p-3 rounded-full hover:bg-blue-50 text-blue-600 transition-colors flex-shrink-0"
                        title={t('speak')}
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
