import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../i18n/i18n';

export function useI18n() {
  const { language } = useLanguage();
  
  return { 
    language, 
    t: (key: string) => {
      // Simple debug check
      if (key === language) {
        console.warn(`Warning: t() called with key="${key}" which matches language="${language}". This might be an error.`);
      }
      return t(language, key);
    }
  };
}
