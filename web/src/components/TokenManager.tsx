import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Token, TokenCreateResponse } from '../types';
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  message,
  Tag,
  Popconfirm,
  Typography,
  Space,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  LinkOutlined,
  CopyOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useTranslation } from '../i18n';
import i18n from '../i18n';

const { Text } = Typography;

interface TokenManagerProps {
  profileId: number;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '\u2014';
  return new Date(raw).toLocaleString(i18n.language);
}

export default function TokenManager({ profileId }: TokenManagerProps) {
  const { t } = useTranslation('profileEditor');
  const { t: tc } = useTranslation('common');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<TokenCreateResponse | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTokens(profileId);
      setTokens(data);
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('token.message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, messageApi, t]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreate = async () => {
    const trimmed = tokenName.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const result = await api.createToken(profileId, trimmed);
      setNewToken(result);
      setTokenName('');
      await fetchTokens();
      messageApi.success(t('token.message.created'));
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('token.message.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId: number) => {
    try {
      await api.revokeToken(profileId, tokenId);
      messageApi.success(t('token.message.revoked'));
      await fetchTokens();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('token.message.revokeFailed'));
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!navigator.clipboard) {
      messageApi.error(t('token.message.clipboardUnavailable'));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success(t('token.message.copied', { label }));
    } catch {
      messageApi.error(t('token.message.copyFailed'));
    }
  };

  const shareUrl = newToken
    ? `${window.location.origin}/sub/${profileId}?token=${newToken.token}`
    : '';

  const handleOpenCreate = () => {
    setNewToken(null);
    setTokenName('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setNewToken(null);
    setTokenName('');
  };

  const columns = [
    {
      title: t('token.table.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('token.table.created'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => formatDate(v),
    },
    {
      title: t('token.table.lastUsed'),
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (v: string | null) => formatDate(v),
    },
    {
      title: t('token.table.status'),
      dataIndex: 'revoked',
      key: 'revoked',
      render: (revoked: boolean) =>
        revoked ? (
          <Tag color="red">{t('token.status.revoked')}</Tag>
        ) : (
          <Tag color="green">{t('token.status.active')}</Tag>
        ),
    },
    {
      title: t('token.table.actions'),
      key: 'actions',
      render: (_: unknown, record: Token) => (
        <Popconfirm
          title={t('token.revokeConfirm')}
          onConfirm={() => handleRevoke(record.id)}
          okText={tc('button.revoke')}
          cancelText={tc('button.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger size="small" disabled={record.revoked}>
            {tc('button.revoke')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <LinkOutlined />
            <span>{t('token.title')}</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            {t('token.generateButton')}
          </Button>
        }
      >
        <Table
          dataSource={tokens}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description={t('token.empty')} /> }}
        />
      </Card>

      <Modal
        title={t('token.modalTitle')}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={
          newToken
            ? [
                <Button key="done" type="primary" onClick={handleCloseModal}>
                  {tc('button.done')}
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={handleCloseModal}>
                  {tc('button.cancel')}
                </Button>,
                <Button
                  key="create"
                  type="primary"
                  loading={creating}
                  onClick={handleCreate}
                  disabled={!tokenName.trim()}
                >
                  {tc('button.create')}
                </Button>,
              ]
        }
      >
        {!newToken ? (
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              {t('token.formHint')}
            </Text>
            <Input
              placeholder={t('token.placeholder')}
              value={tokenName}
              onChange={e => setTokenName(e.target.value)}
              onPressEnter={handleCreate}
              autoFocus
              maxLength={64}
            />
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              {t('token.createdHint')}
            </Text>

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <KeyOutlined style={{ marginRight: 6 }} />
                {t('token.rawToken')}
              </Text>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Text
                  code
                  copyable
                  style={{
                    flex: 1,
                    wordBreak: 'break-all',
                    fontSize: 12,
                    padding: '6px 10px',
                  }}
                >
                  {newToken.token}
                </Text>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(newToken.token, 'Token')}
                >
                  {tc('button.copy')}
                </Button>
              </div>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <LinkOutlined style={{ marginRight: 6 }} />
                {t('token.shareUrl')}
              </Text>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Text
                  code
                  copyable
                  style={{
                    flex: 1,
                    wordBreak: 'break-all',
                    fontSize: 12,
                    padding: '6px 10px',
                  }}
                >
                  {shareUrl}
                </Text>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(shareUrl, 'URL')}
                >
                  {tc('button.copy')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
