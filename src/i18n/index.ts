import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import messages from './local/index';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'ms'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    debug: false,
    resources: messages,
    // Locale resources use flat dotted keys such as `ui.some_label.hash`.
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

export default i18n;
