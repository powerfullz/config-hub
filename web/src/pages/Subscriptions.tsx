import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Subscription, Node } from '../types';
import { useTranslation } from '../i18n';
import i18n from '../i18n';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Tag,
  Switch,
  Popconfirm,
  message,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';

const { Title, Text } = Typography;

export default function Subscriptions() {
  const { t } = useTranslation('subscriptions');
  const { t: tc } = useTranslation('common');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  const [nodes, setNodes] = useState<Record<number, Node[]>>({});
  const [nodesLoading, setNodesLoading] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Subscription[]>('/api/subscriptions');
      setSubs(data);
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Subscription[]>('/api/subscriptions')
      .then(data => { if (!cancelled) setSubs(data); })
      .catch(e => { if (!cancelled) messageApi.error(e instanceof Error ? e.message : t('message.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [messageApi]);

  const handleAdd = () => {
    setEditingSub(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    form.setFieldsValue({
      name: sub.name,
      url: sub.url,
      user_agent: sub.user_agent || '',
      fetch_proxy: sub.fetch_proxy || '',
    });
    setModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingSub) {
        await api.put(`/api/subscriptions/${editingSub.id}`, values);
        messageApi.success(t('message.updated'));
      } else {
        await api.post('/api/subscriptions', values);
        messageApi.success(t('message.added'));
      }
      setModalOpen(false);
      form.resetFields();
      loadSubs();
    } catch (e: unknown) {
      if (e instanceof Error) {
        messageApi.error(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/subscriptions/${id}`);
      messageApi.success(t('message.deleted'));
      setExpandedRowKeys(prev => prev.filter(k => k !== id));
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('message.deleteFailed'));
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      const res = await api.post<{ node_count: number; traffic: string }>(
        `/api/subscriptions/${id}/refresh`
      );
      messageApi.success(t('message.refreshed', { count: res.node_count }));
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('message.refreshFailed'));
    }
  };

  const handleToggle = async (sub: Subscription) => {
    try {
      await api.put(`/api/subscriptions/${sub.id}`, { enabled: !sub.enabled });
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : t('message.toggleFailed'));
    }
  };

  const handleExpand = async (expanded: boolean, record: Subscription) => {
    if (expanded) {
      setExpandedRowKeys(prev => [...prev, record.id]);
      if (!nodes[record.id]) {
        setNodesLoading(prev => ({ ...prev, [record.id]: true }));
        try {
          const data = await api.get<Node[]>(`/api/nodes?subscription_id=${record.id}`);
          setNodes(prev => ({ ...prev, [record.id]: data }));
        } catch (e: unknown) {
          messageApi.error(e instanceof Error ? e.message : t('message.loadNodesFailed'));
        } finally {
          setNodesLoading(prev => ({ ...prev, [record.id]: false }));
        }
      }
    } else {
      setExpandedRowKeys(prev => prev.filter(k => k !== record.id));
    }
  };

  const nodeColumns = [
    {
      title: t('column.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('column.type'),
      dataIndex: 'protocol',
      key: 'protocol',
      render: (protocol: string) => <Tag>{protocol}</Tag>,
    },
    {
      title: t('column.server'),
      dataIndex: 'server',
      key: 'server',
      ellipsis: true,
    },
    {
      title: t('column.port'),
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: t('column.country'),
      dataIndex: 'country',
      key: 'country',
      render: (country: string) => country || '-',
    },
  ];

  const columns: TableProps<Subscription>['columns'] = [
    {
      title: t('column.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: t('column.url'),
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Space size={4}>
            <LinkOutlined style={{ color: '#1677ff' }} />
            <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
              {text}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: t('column.nodes'),
      dataIndex: 'node_count',
      key: 'node_count',
      width: 80,
      align: 'center' as const,
      render: (count: number) => (
        <Tag icon={<NodeIndexOutlined />} color="blue">
          {count}
        </Tag>
      ),
    },
    {
      title: t('column.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      align: 'center' as const,
      render: (_: boolean, record: Subscription) => (
        <Switch
          checked={record.enabled}
          onChange={() => handleToggle(record)}
          size="small"
        />
      ),
    },
    {
      title: t('column.lastFetched'),
      dataIndex: 'last_fetched_at',
      key: 'last_fetched_at',
      width: 160,
      render: (text: string) =>
        text ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(text).toLocaleString(i18n.language)}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('status.never')}
          </Text>
        ),
    },
    {
      title: t('column.actions'),
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Subscription) => (
        <Space size={4}>
          <Tooltip title={t('tooltip.refresh')}>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleRefresh(record.id)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t('tooltip.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={t('deleteConfirm')}
            onConfirm={() => handleDelete(record.id)}
            okText={tc('button.delete')}
            cancelText={tc('button.cancel')}
            okButtonProps={{ danger: true }}
          >
            <Tooltip title={t('tooltip.delete')}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {t('title')}
          </Title>
          <Tag color="blue">{subs.length}</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('addButton')}
        </Button>
      </div>

      <Table<Subscription>
        columns={columns}
        dataSource={subs}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowKeys,
          onExpand: handleExpand,
          expandedRowRender: (record) => {
            const isLoading = nodesLoading[record.id];
            const recordNodes = nodes[record.id] || [];

            if (isLoading) {
              return (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin tip={t('status.loadingNodes')} />
                </div>
              );
            }

            return (
              <Table
                columns={nodeColumns}
                dataSource={recordNodes}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{
                  emptyText: <Empty description={t('status.noNodes')} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
              />
            );
          },
        }}
        locale={{
          emptyText: <Empty description={t('status.noSubs')} />,
        }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => t('status.totalSubscriptions', { total }) }}
      />

      <Modal
        title={editingSub ? t('modal.titleEdit') : t('modal.titleAdd')}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        okText={editingSub ? t('modal.okUpdate') : t('modal.okAdd')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('form.name')}
            rules={[{ required: true, message: t('form.nameRequired') }]}
          >
            <Input placeholder={t('form.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="url"
            label={t('form.url')}
            rules={[
              { required: true, message: t('form.urlRequired') },
              { type: 'url', message: t('form.urlInvalid') },
            ]}
          >
            <Input placeholder={t('form.urlPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="user_agent"
            label={t('form.userAgent')}
          >
            <Input placeholder={t('form.userAgentPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="fetch_proxy"
            label={t('form.fetchProxy')}
          >
            <Input placeholder={t('form.fetchProxyPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
