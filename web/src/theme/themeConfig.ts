import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    // Primary color - a deep, professional blue
    colorPrimary: '#1677ff',
    
    // Success, warning, error colors
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    
    // Typography
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    
    // Border radius
    borderRadius: 6,
    
    // Spacing
    marginLG: 24,
    marginMD: 16,
    marginSM: 12,
    marginXS: 8,
    
    // Layout
    colorBgLayout: '#f5f5f5',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    
    // Text colors
    colorText: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorTextQuaternary: '#bfbfbf',
    
    // Border colors
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f4ff',
      itemSelectedColor: '#1677ff',
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Card: {
      paddingLG: 24,
    },
    Form: {
      labelColor: '#262626',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
    },
    Input: {
      activeBorderColor: '#1677ff',
      hoverBorderColor: '#4096ff',
    },
    Select: {
      optionSelectedBg: '#e6f4ff',
    },
  },
};

export default themeConfig;
