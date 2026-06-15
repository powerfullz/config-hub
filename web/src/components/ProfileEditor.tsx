import { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Switch, InputNumber,
  Space, Button, Popconfirm, Checkbox, Divider, Spin, message, Row, Col,
} from 'antd';
import type { Profile, Subscription, SubscriptionGroup } from '../types';
import { api } from '../api/client';
import { useTranslation } from '../i18n';

interface Props {
  open: boolean;
  profile?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileEditor({ open, profile, onClose, onSaved }: Props) {
  const { t } = useTranslation('profileEditor');
  const { t: tc } = useTranslation('common');
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
        file_name: profile.file_name || '',
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
        file_name: '',
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

      messageApi.success(isEdit ? t('message.updated') : t('message.created'));
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
      messageApi.success(t('message.deleted'));
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
        title={isEdit ? t('modal.titleEdit') : t('modal.titleCreate')}
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={560}
        footer={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>
              {isEdit && (
                <Popconfirm
                  title={t('delete.confirm')}
                  onConfirm={handleDelete}
                  okText={t('delete.button')}
                  okType="danger"
                  cancelText={tc('button.cancel')}
                >
                  <Button danger>{t('delete.button')}</Button>
                </Popconfirm>
              )}
            </span>
            <Space>
              <Button onClick={onClose}>{tc('button.cancel')}</Button>
              <Button type="primary" loading={loading} onClick={handleSubmit}>
                {tc('button.save')}
              </Button>
            </Space>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('field.name')}
            rules={[{ required: true, message: t('field.nameRequired') }]}
          >
            <Input autoFocus />
          </Form.Item>

          <Form.Item
            name="file_name"
            label={t('field.fileName')}
          >
            <Input placeholder={t('field.fileNamePlaceholder')} />
          </Form.Item>

          <Form.Item name="group_type" label={t('field.groupType')}>
            <Select
              options={[
                { value: 0, label: tc('groupType.select') },
                { value: 1, label: tc('groupType.urlTest') },
                { value: 2, label: tc('groupType.loadBalance') },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="landing" label={t('field.landing')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ipv6" label={t('field.ipv6')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tun" label={t('field.tun')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="full" label={t('field.full')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="keep_alive" label={t('field.keepAlive')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fake_ip" label={t('field.fakeIp')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quic" label={t('field.quic')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="regex" label={t('field.regex')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="threshold" label={t('field.threshold')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Divider titlePlacement="left" plain>
             {t('section.subscriptions')}
          </Divider>
          {loadingOptions ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          ) : subs.length === 0 ? (
            <div style={{ color: '#999', padding: 8 }}>
               {t('empty.noSubscriptions')}
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
             {t('section.subscriptionGroups')}
          </Divider>
          {loadingOptions ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          ) : groups.length === 0 ? (
            <div style={{ color: '#999', padding: 8 }}>
               {t('empty.noGroups')}
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
