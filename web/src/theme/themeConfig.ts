import type { ThemeConfig } from 'antd';

export function getThemeConfig(isDark: boolean): ThemeConfig {
  return {
    token: {
      // Primary color - a deep, professional blue
      colorPrimary: '#1677ff',

      // Success, warning, error colors
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: isDark ? '#ff7875' : '#ff4d4f',
      colorInfo: '#1677ff',

      // Typography
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,

      // Border radius
      borderRadius: 6,

      // Spacing
      marginLG: 24,
      marginMD: 16,
      marginSM: 12,
      marginXS: 8,

      // Layout
      colorBgLayout: isDark ? '#141414' : '#f5f5f5',
      colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
      colorBgElevated: isDark ? '#262626' : '#ffffff',

      // Text colors
      colorText: isDark ? 'rgba(255,255,255,0.85)' : '#262626',
      colorTextSecondary: isDark ? 'rgba(255,255,255,0.65)' : '#595959',
      colorTextTertiary: isDark ? 'rgba(255,255,255,0.45)' : '#8c8c8c',
      colorTextQuaternary: isDark ? 'rgba(255,255,255,0.25)' : '#bfbfbf',

      // Border colors
      colorBorder: isDark ? '#424242' : '#d9d9d9',
      colorBorderSecondary: isDark ? '#303030' : '#f0f0f0',
    },
    components: {
      Layout: {
        headerBg: isDark ? '#1f1f1f' : '#ffffff',
        siderBg: isDark ? '#1f1f1f' : '#ffffff',
        bodyBg: isDark ? '#141414' : '#f5f5f5',
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: isDark ? '#111a2c' : '#e6f4ff',
        itemSelectedColor: '#1677ff',
        darkItemBg: '#1f1f1f',
      },
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
      },
      Card: {
        paddingLG: 24,
      },
      Form: {
        labelColor: isDark ? 'rgba(255,255,255,0.85)' : '#262626',
      },
      Table: {
        headerBg: isDark ? '#262626' : '#fafafa',
        headerColor: isDark ? 'rgba(255,255,255,0.85)' : '#262626',
      },
      Input: {
        activeBorderColor: '#1677ff',
        hoverBorderColor: '#4096ff',
      },
      Select: {
        optionSelectedBg: isDark ? '#111a2c' : '#e6f4ff',
      },
    },
  };
}

export default getThemeConfig;
