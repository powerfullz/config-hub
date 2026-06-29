import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useEffect } from 'react';

// Import all locale JSON files
import commonZh from './locales/zh-CN/common.json';
import dashboardZh from './locales/zh-CN/dashboard.json';
import subscriptionsZh from './locales/zh-CN/subscriptions.json';
import profileEditorZh from './locales/zh-CN/profileEditor.json';
import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import subscriptionsEn from './locales/en/subscriptions.json';
import profileEditorEn from './locales/en/profileEditor.json';

const resources = {
  'zh-CN': {
    common: commonZh,
    dashboard: dashboardZh,
    subscriptions: subscriptionsZh,
    profileEditor: profileEditorZh,
  },
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    subscriptions: subscriptionsEn,
    profileEditor: profileEditorEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    lng: undefined, // Let LanguageDetector decide
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    returnNull: false,
    returnEmptyString: false,
    // In dev, log missing keys to console
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_lngs: readonly string[], ns: string, key: string) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key "${ns}:${key}" for languages ${_lngs.join(', ')}`);
      }
    },
  });

// Ensure zh-CN is set if detection yields something unsupported
const supportedLngs = ['zh-CN', 'en'];
if (!supportedLngs.includes(i18n.language)) {
  i18n.changeLanguage('zh-CN');
}

/**
 * Syncs document.documentElement.lang when i18n language changes.
 */
function LangSync() {
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const handler = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  return null;
}

/**
 * I18nProvider — wraps the app with I18nextProvider.
 * Syncs document.documentElement.lang on language change.
 * Theme is managed by HeroUI's useTheme (no provider needed here).
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LangSync />
      {children}
    </I18nextProvider>
  );
}

/**
 * Typed useTranslation wrapper.
 * Constrains namespace to one of the 4 defined namespaces.
 */
export type I18nNamespace = 'common' | 'dashboard' | 'subscriptions' | 'profileEditor';

// eslint-disable-next-line react-refresh/only-export-components
export { useTranslation } from 'react-i18next';
// eslint-disable-next-line react-refresh/only-export-components
export default i18n;
