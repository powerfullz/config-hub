import { useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography, Button, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Header, Content } = AntLayout;
const { Text } = Typography;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/subs',
    icon: <AppstoreOutlined />,
    label: 'Subscriptions',
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

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
            Config Hub
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
          <Text type="secondary" style={{ fontSize: 14 }}>
            {user?.username}
          </Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
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
