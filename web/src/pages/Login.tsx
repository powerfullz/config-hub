import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button, TextField, Input, Label, FieldError, Checkbox } from '@heroui/react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import { notifyError } from '../utils/notifications';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();
  const { t } = useTranslation('common');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('login.usernameRequired'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password, rememberMe);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('login.failed');
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-600 items-center justify-center p-12">
        <div className="text-white text-center">
          <h1 className="text-5xl font-bold mb-4">{t('app.title')}</h1>
          <p className="text-xl opacity-90">{t('login.tagline')}</p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-default-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">{t('login.title')}</h2>
            <p className="text-default-500 mt-2">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField value={username} onChange={setUsername} isRequired>
              <Label>{t('login.usernamePlaceholder')}</Label>
              <Input autoFocus />
              <FieldError>{t('login.usernameRequired')}</FieldError>
            </TextField>

            <TextField value={password} onChange={setPassword} type="password" isRequired>
              <Label>{t('login.passwordPlaceholder')}</Label>
              <Input />
              <FieldError>{t('login.passwordRequired')}</FieldError>
            </TextField>

            <div className="flex items-center justify-between">
              <Checkbox isSelected={rememberMe} onChange={setRememberMe}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {t('login.rememberMe')}
                </Checkbox.Content>
              </Checkbox>
              <button type="button" className="text-sm text-primary hover:underline" disabled>
                {t('login.forgotPassword')}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isDisabled={loading}>
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-default-500">
            {t('footer.copyright')}
          </div>
        </div>
      </div>
    </div>
  );
}
