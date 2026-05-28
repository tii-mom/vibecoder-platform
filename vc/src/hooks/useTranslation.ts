import { useI18nStore } from '../i18n/i18nStore';
import { Language } from '../i18n/types';

export function useTranslation() {
  const { language, setLanguage, t } = useI18nStore();
  return {
    language,
    setLanguage,
    t,
  };
}
