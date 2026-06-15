import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { ConfigProvider, theme as antTheme } from 'antd';
import type { Locale } from 'antd/es/locale';
import type { ThemeConfig } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, getThemeConfig, getGlobalStyles } from '../theme';
import { useTheme } from '../theme';

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

// Mapping from i18n language to antd locale import
let antdLocaleMap: Record<string, Locale> = {};

// Dynamic import of antd locales to avoid bundling issues
async function loadAntdLocales() {
  const [zhCN, enUS] = await Promise.all([
    import('antd/locale/zh_CN'),
    import('antd/locale/en_US'),
  ]);
  antdLocaleMap = {
    'zh-CN': zhCN.default,
    en: enUS.default,
  };
}

// Track if antd locales have been loaded
let antdLocalesReady = false;

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
 * Global emotion styles that adapt to dark/light mode.
 * Extracted as a component so React can track identity across renders.
 */
function GlobalStyles({ isDark }: { isDark: boolean }) {
  return getGlobalStyles(isDark);
}

/**
 * Inner provider that reads theme state and applies it to ConfigProvider.
 * Must be a child of ThemeProvider to access useTheme().
 */
function ThemeAwareConfigProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [antdLocale, setAntdLocale] = useState<Locale | undefined>(undefined);

  useEffect(() => {
    // Load antd locales on mount
    loadAntdLocales().then(() => {
      antdLocalesReady = true;
      const locale = antdLocaleMap[i18n.language] || antdLocaleMap['zh-CN'];
      setAntdLocale(locale);
    });

    const handleLanguageChanged = (lng: string) => {
      document.documentElement.lang = lng;
      if (antdLocalesReady) {
        const locale = antdLocaleMap[lng] || antdLocaleMap['zh-CN'];
        setAntdLocale(locale);
      }
    };

    // Set initial html lang
    document.documentElement.lang = i18n.language;

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const currentTheme: ThemeConfig = useMemo(
    () => ({
      ...getThemeConfig(isDark),
      algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    }),
    [isDark],
  );

  return (
    <ConfigProvider theme={currentTheme} locale={antdLocale}>
      <GlobalStyles isDark={isDark} />
      {children}
    </ConfigProvider>
  );
}

/**
 * I18nProvider — wraps the app with I18nextProvider and antd ConfigProvider.
 * Syncs antd locale with i18n language changes, supports dark/light theme.
 * Also provides ThemeContext for child components (e.g., Layout) to access theme state.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ThemeAwareConfigProvider>
          {children}
        </ThemeAwareConfigProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

/**
 * Typed useTranslation wrapper.
 * Constrains namespace to one of the 4 defined namespaces.
 */
export type I18nNamespace = 'common' | 'dashboard' | 'subscriptions' | 'profileEditor';

export { useTranslation } from 'react-i18next';
export default i18n;
