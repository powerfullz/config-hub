import { useState } from 'react';
import { Card, Button, TextField, Input, Label, FieldError } from '@heroui/react';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import { formatDate } from '../utils/date';
import { notifySuccess, notifyError } from '../utils/notifications';
import { api } from '../api/client';
import i18n from '../i18n';

export default function Account() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation('common');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword.trim()) {
      setPasswordError(t('account.currentPasswordRequired'));
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError(t('account.newPasswordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('account.newPasswordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      notifySuccess(t('account.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message?.includes('incorrect')) {
          notifyError(t('account.wrongPassword'));
        } else {
          notifyError(err.message);
        }
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim() === user?.username) {
      setEditingUsername(false);
      setNewUsername(user?.username || '');
      return;
    }
    setUsernameLoading(true);
    try {
      const updated = await api.updateAccount(newUsername.trim());
      updateUser(updated);
      notifySuccess(t('account.usernameChanged'));
      setEditingUsername(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message?.includes('already exists')) {
          notifyError(t('account.usernameExists'));
        } else {
          notifyError(err.message);
        }
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t('account.title')}</h1>

      {/* User Information Card */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-default-500" />
            <Card.Title>{t('account.userInfo')}</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-default-200">
            <span className="text-sm font-medium text-default-700">{t('account.userId')}</span>
            <span className="text-sm">{user?.id}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-default-200">
            <span className="text-sm font-medium text-default-700">{t('account.username')}</span>
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <TextField value={newUsername} onChange={setNewUsername}>
                  <Input autoFocus className="w-48" />
                </TextField>
                <Button variant="primary" size="sm" isDisabled={usernameLoading} onPress={handleSaveUsername}>
                  {t('account.saveUsername')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setEditingUsername(false);
                    setNewUsername(user?.username || '');
                  }}
                >
                  {t('button.cancel')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{user?.username}</span>
                <Button variant="ghost" size="sm" onPress={() => setEditingUsername(true)}>
                  <User className="w-4 h-4 mr-1" />
                  {t('account.editUsername')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-default-700">{t('account.createdAt')}</span>
            <span className="text-sm">
              {user?.created_at ? formatDate(user.created_at, i18n.language) : '—'}
            </span>
          </div>
        </Card.Content>
      </Card>

      {/* Change Password Card */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-default-500" />
            <Card.Title>{t('account.changePasswordTitle')}</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <TextField value={currentPassword} onChange={setCurrentPassword} type="password" isRequired>
              <Label>{t('account.oldPassword')}</Label>
              <Input placeholder={t('account.yourOldPassword')} />
              <FieldError>{t('account.currentPasswordRequired')}</FieldError>
            </TextField>

            <TextField value={newPassword} onChange={setNewPassword} type="password" isRequired>
              <Label>{t('account.newPassword')}</Label>
              <Input placeholder={t('account.yourNewPassword')} />
              <FieldError>{t('account.newPasswordRequired')}</FieldError>
            </TextField>

            <TextField value={confirmPassword} onChange={setConfirmPassword} type="password" isRequired>
              <Label>{t('account.confirmPassword')}</Label>
              <Input placeholder={t('account.confirmNewPassword')} />
              <FieldError>{t('account.confirmPasswordRequired')}</FieldError>
            </TextField>

            {passwordError && (
              <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm">
                {passwordError}
              </div>
            )}

            <Button type="submit" variant="primary" isDisabled={passwordLoading}>
              {passwordLoading ? t('account.changing') : t('account.changePassword')}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
