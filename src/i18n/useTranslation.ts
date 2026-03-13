import { useAuth } from '@/contexts/AuthContext';
import { translations, LangCode } from './translations';

export const useTranslation = () => {
  const { profile } = useAuth();
  const lang: LangCode = (profile?.language_pref as LangCode) || 'en';

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return { t, lang };
};
