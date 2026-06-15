import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Profile } from '../types';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  Button,
  Popconfirm,
  message,
} from 'antd';

const GROUP_TYPE_OPTIONS = [
  { value: 0, label: '基础' },
  { value: 1, label: '标准' },
  { value: 2, label: '高级' },
];

interface Props {
  open: boolean;
  profile?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileEditor({ open, profile, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const isEdit = profile != null;

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    if (profile) {
      form.setFieldsValue({
        name: profile.name,
        description: profile.description || '',
        group_type: profile.group_type ?? 1,
        landing: profile.landing,
        ipv6: profile.ipv6,
        tun: profile.tun,
        keep_alive: profile.keep_alive,
        fake_ip: profile.fake_ip,
        quic: profile.quic,
        regex_filter: profile.regex_filter || '',
        country_threshold: profile.country_threshold,
      });
    } else {
      form.setFieldsValue({
        group_type: 1,
        tun: true,
        quic: true,
      });
    }
  }, [open, profile, form]);

  const handleDelete = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      await api.deleteProfile(profile.id);
      messageApi.success('Profile deleted');
      onSaved();
      onClose();
    } catch (e: unknown) {
      messageApi.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit && profile) {
        const payload: Record<string, unknown> = {};
        const currentValues = form.getFieldsValue();
        for (const [key, newVal] of Object.entries(currentValues)) {
          const oldVal = (profile as unknown as Record<string, unknown>)[key];
          if (newVal !== oldVal) {
            payload[key] = newVal;
          }
        }
        if (Object.keys(payload).length === 0) {
          messageApi.info('No changes to save');
          setLoading(false);
          return;
        }
        await api.updateProfile(profile.id, payload);
      } else {
        await api.createProfile(values);
      }

      messageApi.success(isEdit ? 'Profile updated' : 'Profile created');
      onSaved();
      onClose();
    } catch (e: unknown) {
      if (e instanceof Error) {
        messageApi.error(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={isEdit ? 'Edit Profile' : 'New Profile'}
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            group_type: 1,
            tun: true,
            quic: true,
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input autoFocus />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="group_type" label="Group Type">
            <Select options={GROUP_TYPE_OPTIONS} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            <Form.Item name="landing" label="Landing" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="ipv6" label="IPv6" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="tun" label="TUN" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            <Form.Item name="keep_alive" label="KeepAlive" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="fake_ip" label="FakeIP" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="quic" label="QUIC" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="regex_filter" label="Regex Filter">
            <Input placeholder="e.g. all" />
          </Form.Item>

          <Form.Item name="country_threshold" label="Country Threshold">
            <InputNumber min={0} placeholder="100" style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Space>
              {isEdit && (
                <Popconfirm
                  title="Are you sure?"
                  description="This cannot be undone."
                  onConfirm={handleDelete}
                  okText="Delete"
                  okType="danger"
                  cancelText="Cancel"
                >
                  <Button danger loading={loading}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Space>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </>
  );
}
