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

const { Text } = Typography;

interface TokenManagerProps {
  profileId: number;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '\u2014';
  return new Date(raw).toLocaleString();
}

export default function TokenManager({ profileId }: TokenManagerProps) {
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
      messageApi.error(e instanceof Error ? e.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, [profileId, messageApi]);

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
      messageApi.success('Token created');
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId: number) => {
    try {
      await api.revokeToken(profileId, tokenId);
      messageApi.success('Token revoked');
      await fetchTokens();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to revoke token');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!navigator.clipboard) {
      messageApi.error('Clipboard not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success(`${label} copied!`);
    } catch {
      messageApi.error('Failed to copy');
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (v: string | null) => formatDate(v),
    },
    {
      title: 'Status',
      dataIndex: 'revoked',
      key: 'revoked',
      render: (revoked: boolean) =>
        revoked ? (
          <Tag color="red">Revoked</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Token) => (
        <Popconfirm
          title="Revoke this token?"
          onConfirm={() => handleRevoke(record.id)}
          okText="Revoke"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger size="small" disabled={record.revoked}>
            Revoke
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
            <span>分享链接 / Share Links</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Generate New Token
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
          locale={{ emptyText: <Empty description="No share links yet" /> }}
        />
      </Card>

      <Modal
        title="Generate New Token"
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={
          newToken
            ? [
                <Button key="done" type="primary" onClick={handleCloseModal}>
                  Done
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={handleCloseModal}>
                  Cancel
                </Button>,
                <Button
                  key="create"
                  type="primary"
                  loading={creating}
                  onClick={handleCreate}
                  disabled={!tokenName.trim()}
                >
                  Create
                </Button>,
              ]
        }
      >
        {!newToken ? (
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Give this token a name to identify its purpose.
            </Text>
            <Input
              placeholder="e.g. My iPhone, Team Access"
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
              Token created successfully. Copy it now \u2014 it won&apos;t be shown again.
            </Text>

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <KeyOutlined style={{ marginRight: 6 }} />
                Raw Token
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
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <LinkOutlined style={{ marginRight: 6 }} />
                Share URL
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
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
