import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Subscription, Node } from '../types';
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
      messageApi.error(e instanceof Error ? e.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Subscription[]>('/api/subscriptions')
      .then(data => { if (!cancelled) setSubs(data); })
      .catch(e => { if (!cancelled) messageApi.error(e instanceof Error ? e.message : 'Failed to load subscriptions'); })
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
    form.setFieldsValue({ name: sub.name, url: sub.url });
    setModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingSub) {
        await api.put(`/api/subscriptions/${editingSub.id}`, values);
        messageApi.success('Subscription updated');
      } else {
        await api.post('/api/subscriptions', values);
        messageApi.success('Subscription added');
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
      messageApi.success('Subscription deleted');
      setExpandedRowKeys(prev => prev.filter(k => k !== id));
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to delete subscription');
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      const res = await api.post<{ node_count: number; traffic: string }>(
        `/api/subscriptions/${id}/refresh`
      );
      messageApi.success(`Refreshed: ${res.node_count} nodes`);
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to refresh subscription');
    }
  };

  const handleToggle = async (sub: Subscription) => {
    try {
      await api.put(`/api/subscriptions/${sub.id}`, { enabled: !sub.enabled });
      loadSubs();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to toggle subscription');
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
          messageApi.error(e instanceof Error ? e.message : 'Failed to load nodes');
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'protocol',
      key: 'protocol',
      render: (protocol: string) => <Tag>{protocol}</Tag>,
    },
    {
      title: 'Server',
      dataIndex: 'server',
      key: 'server',
      ellipsis: true,
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country: string) => country || '-',
    },
  ];

  const columns: TableProps<Subscription>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'URL',
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
      title: 'Nodes',
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
      title: 'Enabled',
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
      title: 'Last Fetched',
      dataIndex: 'last_fetched_at',
      key: 'last_fetched_at',
      width: 160,
      render: (text: string) =>
        text ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(text).toLocaleString()}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Never
          </Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Subscription) => (
        <Space size={4}>
          <Tooltip title="Refresh">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleRefresh(record.id)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this subscription?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
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
            Subscriptions
          </Title>
          <Tag color="blue">{subs.length}</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Subscription
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
                  <Spin tip="Loading nodes..." />
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
                  emptyText: <Empty description="No nodes" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
              />
            );
          },
        }}
        locale={{
          emptyText: <Empty description="No subscriptions" />,
        }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} subscriptions` }}
      />

      <Modal
        title={editingSub ? 'Edit Subscription' : 'Add Subscription'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        okText={editingSub ? 'Update' : 'Add'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Subscription name" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[
              { required: true, message: 'Please enter a URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com/subscription" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
