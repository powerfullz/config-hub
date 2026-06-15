import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography, Button, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import i18n, { useTranslation } from '../i18n';

const { Header, Content } = AntLayout;
const { Text } = Typography;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { user, logout, isLoggedIn } = useAuth();
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    const handler = (lng: string) => setLang(lng);
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
    },
    {
      key: '/subs',
      icon: <AppstoreOutlined />,
      label: t('menu.subscriptions'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  if (!isLoggedIn) return <>{children}</>;

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: themeToken.colorBgContainer,
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: 48,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <Text
            strong
            style={{
              fontSize: 18,
              color: themeToken.colorPrimary,
              letterSpacing: '-0.02em',
            }}
          >
            {t('app.title')}
          </Text>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            size="small"
            style={{ fontWeight: lang === 'zh-CN' ? 600 : 400, color: lang === 'zh-CN' ? '#1677ff' : undefined }}
            onClick={() => i18n.changeLanguage('zh-CN')}
          >
            中
          </Button>
          <Button
            type="text"
            size="small"
            style={{ fontWeight: lang === 'en' ? 600 : 400, color: lang === 'en' ? '#1677ff' : undefined }}
            onClick={() => i18n.changeLanguage('en')}
          >
            EN
          </Button>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {user?.username}
          </Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            {t('header.logout')}
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: 24,
          background: themeToken.colorBgLayout,
          overflow: 'auto',
        }}
      >
        {children}
      </Content>
    </AntLayout>
  );
}
