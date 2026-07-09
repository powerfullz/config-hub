import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AppWindow,
  Settings,
  Languages,
  Sun,
  Moon,
  LogOut,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import i18n, { useTranslation } from '../i18n';
import { useTheme } from '../theme';

function NavItem({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-default-700 hover:bg-default-200'
      }`}
    >
      <span className="w-5 h-5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { user, logout, isLoggedIn } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [lang, setLang] = useState(i18n.language);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (lng: string) => setLang(lng);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(nextLang);
  };

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen, closeSidebar]);

  if (!isLoggedIn) return <>{children}</>;

  const navItems = [
    { to: '/', icon: <LayoutDashboard />, label: t('sidebar.dashboard') },
    { to: '/subs', icon: <AppWindow />, label: t('sidebar.subscriptions') },
    { to: '/account', icon: <Settings />, label: t('sidebar.settings') },
  ];

  return (
    <div className="flex h-screen bg-default-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-default-50 border-r border-default-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* App Title */}
        <div className="p-6 border-b border-default-200">
          <h1 className="text-xl font-bold text-primary">{t('app.title')}</h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-default-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{user?.username || 'Admin'}</p>
              <p className="text-sm text-default-500">{t('account.administrator')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-auto" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} onClick={closeSidebar} />
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-default-200 space-y-1">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-default-700 hover:bg-default-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Languages className="w-5 h-5 shrink-0" aria-hidden="true" />
            {t('language.toggle')}
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-default-700 hover:bg-default-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="w-5 h-5 shrink-0 flex items-center justify-center" aria-hidden="true">
              {isDark ? <Sun /> : <Moon />}
            </span>
            {isDark ? t('theme.switchLight') : t('theme.switchDark')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
            {t('header.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <header className="h-14 bg-default-50 border-b border-default-200 flex items-center px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="lg:hidden mr-4 p-2 rounded-lg hover:bg-default-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={sidebarOpen ? t('layout.closeNav') : t('layout.openNav')}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-default-500">
              {new Date().toLocaleDateString(i18n.language)}
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
