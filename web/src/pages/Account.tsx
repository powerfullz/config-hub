import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Descriptions, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import { api } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Account() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation('common');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [passwordForm] = Form.useForm<PasswordFormValues>();

  const handleChangePassword = async (values: PasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error(t('account.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      await api.changePassword(values.currentPassword, values.newPassword);
      message.success(t('account.passwordChanged'));
      passwordForm.resetFields();
    } catch (err: any) {
      if (err.message?.includes('incorrect')) {
        message.error(t('account.wrongPassword'));
      } else {
        message.error(err.message || 'Change password failed');
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
      message.success(t('account.usernameChanged'));
      setEditingUsername(false);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        message.error(t('account.usernameExists'));
      } else {
        message.error(err.message || 'Failed');
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 600 }}>
      <Title level={3}>{t('account.title')}</Title>

      <Card title={t('account.userInfo')}>
        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
          <Descriptions.Item label={t('account.userId')}>{user?.id}</Descriptions.Item>
          <Descriptions.Item label={t('account.username')}>
            {editingUsername ? (
              <Space>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onPressEnter={handleSaveUsername}
                  style={{ width: 200 }}
                  autoFocus
                />
                <Button
                  type="primary"
                  size="small"
                  loading={usernameLoading}
                  onClick={handleSaveUsername}
                >
                  {t('account.saveUsername')}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingUsername(false);
                    setNewUsername(user?.username || '');
                  }}
                >
                  {t('button.cancel')}
                </Button>
              </Space>
            ) : (
              <Space>
                <span>{user?.username}</span>
                <Button
                  type="link"
                  size="small"
                  icon={<UserOutlined />}
                  onClick={() => setEditingUsername(true)}
                >
                  {t('account.editUsername')}
                </Button>
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('account.createdAt')}>
            {user?.created_at ? dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('account.changePasswordTitle')}>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          autoComplete="off"
        >
          <Form.Item
            name="currentPassword"
            label={t('account.oldPassword')}
            rules={[{ required: true, message: t('account.currentPasswordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('account.yourOldPassword')}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={t('account.newPassword')}
            rules={[
              { required: true, message: t('account.newPasswordRequired') },
              { min: 6, message: t('account.newPasswordMinLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('account.yourNewPassword')}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('account.confirmPassword')}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('account.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('account.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('account.confirmNewPassword')}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              {t('account.changePassword')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}
