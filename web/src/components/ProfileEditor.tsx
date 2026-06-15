import { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Switch, InputNumber,
  Space, Button, Popconfirm, Checkbox, Divider, Spin, message, Row, Col,
} from 'antd';
import type { Profile, Subscription, SubscriptionGroup } from '../types';
import { api } from '../api/client';

interface Props {
  open: boolean;
  profile?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileEditor({ open, profile, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [groups, setGroups] = useState<SubscriptionGroup[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const isEdit = !!profile;

  // Load subscriptions and groups when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      api.get<Subscription[]>('/api/subscriptions').catch(() => [] as Subscription[]),
      api.listSubscriptionGroups().catch(() => [] as SubscriptionGroup[]),
    ]).then(([subsData, groupsData]) => {
      setSubs(subsData);
      setGroups(groupsData);
      setLoadingOptions(false);
    });
  }, [open]);

  // Pre-fill form when editing
  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (profile) {
      form.setFieldsValue({
        name: profile.name,
        group_type: profile.group_type,
        landing: profile.landing,
        ipv6: profile.ipv6,
        tun: profile.tun,
        full: profile.full,
        keep_alive: profile.keep_alive,
        fake_ip: profile.fake_ip,
        quic: profile.quic,
        regex: profile.regex,
        threshold: profile.threshold,
      });
      // Load profile's current subscriptions and groups for checkbox pre-selection
      api.get<Profile>(`/api/profiles/${profile.id}`).then(p => {
        form.setFieldsValue({
          subscription_ids: p.subscriptions?.map(s => s.id) ?? [],
          subscription_group_ids: p.subscription_groups?.map(g => g.id) ?? [],
        });
      }).catch(() => {});
    } else {
      form.resetFields();
      form.setFieldsValue({
        group_type: 0,
        threshold: 0,
      });
    }
  }, [open, profile, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { subscription_ids, subscription_group_ids, ...profileData } = values;

      setLoading(true);

      if (isEdit) {
        // Build diff payload (only changed fields)
        const payload: Record<string, unknown> = {};
        for (const key of Object.keys(profileData)) {
          const val = profileData[key];
          const orig = (profile as unknown as Record<string, unknown>)[key];
          if (val !== orig) payload[key] = val;
        }
        if (Object.keys(payload).length > 0) {
          await api.updateProfile(profile!.id, payload);
        }
      } else {
        const created = await api.createProfile(profileData as Record<string, unknown>);
        // Associate subscriptions
        if (subscription_ids?.length) {
          for (const sid of subscription_ids) {
            await api.post(`/api/profiles/${created.id}/subscriptions`, { subscription_id: sid }).catch(() => {});
          }
        }
        // Associate subscription groups
        if (subscription_group_ids?.length) {
          for (const gid of subscription_group_ids) {
            await api.post(`/api/profiles/${created.id}/subscription-groups`, { subscription_group_id: gid }).catch(() => {});
          }
        }
      }

      messageApi.success(isEdit ? 'Profile updated' : 'Profile created');
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) messageApi.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await api.deleteProfile(profile.id);
      messageApi.success('Profile deleted');
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) messageApi.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={isEdit ? '覆写方案' : '新建覆写方案'}
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={560}
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>
              {isEdit && (
                <Popconfirm
                  title="确定删除？此操作不可撤销"
                  onConfirm={handleDelete}
                  okText="删除"
                  okType="danger"
                  cancelText="取消"
                >
                  <Button danger>删除</Button>
                </Popconfirm>
              )}
            </span>
            <Space>
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" loading={loading} onClick={handleSubmit}>
                保存
              </Button>
            </Space>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="方案名称"
            rules={[{ required: true, message: '请输入方案名称' }]}
          >
            <Input autoFocus />
          </Form.Item>

          <Form.Item name="group_type" label="国家/地区代理组类型">
            <Select
              options={[
                { value: 0, label: '手动选择 (select)' },
                { value: 1, label: '自动选择 (url-test)' },
                { value: 2, label: '负载均衡 (load-balance)' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="landing" label="启用落地节点功能" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ipv6" label="启用 IPv6 支持" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tun" label="启用 TUN 模式" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="full" label="完整配置（纯内核启动）" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="keep_alive" label="启用 KeepAlive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fake_ip" label="FakeIP 模式" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quic" label="QUIC 流量" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="regex" label="正则过滤模式" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="threshold" label="地区节点阈值（低于此数不显示分组）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Divider titlePlacement="left" plain>
            包含订阅
          </Divider>
          {loadingOptions ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          ) : subs.length === 0 ? (
            <div style={{ color: '#999', padding: 8 }}>
              暂无订阅，请先在订阅管理中添加
            </div>
          ) : (
            <Form.Item name="subscription_ids">
              <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subs.map(s => (
                  <Checkbox key={s.id} value={s.id}>
                    {s.name}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}

          <Divider titlePlacement="left" plain>
            包含组合订阅
          </Divider>
          {loadingOptions ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          ) : groups.length === 0 ? (
            <div style={{ color: '#999', padding: 8 }}>
              暂无组合订阅
            </div>
          ) : (
            <Form.Item name="subscription_group_ids">
              <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {groups.map(g => (
                  <Checkbox key={g.id} value={g.id}>
                    {g.name}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
