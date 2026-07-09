import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  FieldError,
  Select,
  ListBox,
  Switch,
  NumberField,
  Checkbox,
  CheckboxGroup,
  Separator,
  useOverlayState,
} from '@heroui/react';
import type { Profile, Subscription, SubscriptionGroup } from '../types';
import { api } from '../api/client';
import { useTranslation } from '../i18n';
import { notifySuccess, notifyError } from '../utils/notifications';
import { confirm } from '../utils/confirm';
import { LoadingState } from './EmptyState';

interface Props {
  open: boolean;
  profile?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

const SWITCH_KEYS = [
  'landing',
  'ipv6',
  'tun',
  'full',
  'keep_alive',
  'fake_ip',
  'quic',
  'regex',
] as const;

type SwitchKey = (typeof SWITCH_KEYS)[number];

type Switches = Record<SwitchKey, boolean>;

const GROUP_TYPE_OPTIONS = [
  { id: '0', labelKey: 'groupType.select' },
  { id: '1', labelKey: 'groupType.urlTest' },
  { id: '2', labelKey: 'groupType.loadBalance' },
] as const;

export default function ProfileEditor({ open, profile, onClose, onSaved }: Props) {
  const { t } = useTranslation('profileEditor');
  const { t: tc } = useTranslation('common');
  const state = useOverlayState({ isOpen: open, defaultOpen: false });

  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [groupType, setGroupType] = useState('0');
  const [threshold, setThreshold] = useState<number | undefined>(undefined);
  const [switches, setSwitches] = useState<Switches>({
    landing: false,
    ipv6: false,
    tun: false,
    full: false,
    keep_alive: false,
    fake_ip: false,
    quic: false,
    regex: false,
  });
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [groups, setGroups] = useState<SubscriptionGroup[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!open) return;
    if (profile) {
      setName(profile.name);
      setFileName(profile.file_name || '');
      setGroupType(String(profile.group_type));
      setThreshold(profile.threshold || undefined);
      setSwitches({
        landing: profile.landing,
        ipv6: profile.ipv6,
        tun: profile.tun,
        full: profile.full,
        keep_alive: profile.keep_alive,
        fake_ip: profile.fake_ip,
        quic: profile.quic,
        regex: profile.regex,
      });
      // Load profile's current subscriptions and groups
      api.get<Profile>(`/api/profiles/${profile.id}`).then(p => {
        setSelectedSubs(p.subscriptions?.map(s => String(s.id)) ?? []);
        setSelectedGroups(p.subscription_groups?.map(g => String(g.id)) ?? []);
      }).catch((err: unknown) => {
        if (err instanceof Error) notifyError(err.message);
      });
    } else {
      setName('');
      setFileName('');
      setGroupType('0');
      setThreshold(undefined);
      setSwitches({
        landing: false,
        ipv6: false,
        tun: false,
        full: false,
        keep_alive: false,
        fake_ip: false,
        quic: false,
        regex: false,
      });
      setSelectedSubs([]);
      setSelectedGroups([]);
    }
  }, [open, profile]);

  const updateSwitch = (key: SwitchKey, value: boolean) => {
    setSwitches(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const profileData: Record<string, unknown> = {
        name: name.trim(),
        file_name: fileName.trim(),
        group_type: Number(groupType),
        threshold: threshold ?? 0,
        ...switches,
      };

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
        const created = await api.createProfile(profileData);
        // Associate subscriptions
        if (selectedSubs.length > 0) {
          for (const sid of selectedSubs) {
            await api.post(`/api/profiles/${created.id}/subscriptions`, { subscription_id: Number(sid) }).catch((err: unknown) => {
              if (err instanceof Error) notifyError(err.message);
            });
          }
        }
        // Associate subscription groups
        if (selectedGroups.length > 0) {
          for (const gid of selectedGroups) {
            await api.post(`/api/profiles/${created.id}/subscription-groups`, { subscription_group_id: Number(gid) }).catch((err: unknown) => {
              if (err instanceof Error) notifyError(err.message);
            });
          }
        }
      }

      notifySuccess(isEdit ? t('message.updated') : t('message.created'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) notifyError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    const ok = await confirm({
      title: tc('confirm.deleteProfile'),
      message: tc('confirm.deleteProfileMessage'),
      danger: true,
      confirmText: tc('confirm.delete'),
      cancelText: tc('confirm.cancel'),
    });
    if (!ok) return;

    setSaving(true);
    try {
      await api.deleteProfile(profile.id);
      notifySuccess(t('message.deleted'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) notifyError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal.Root state={state} onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
      <Modal.Backdrop />
      <Modal.Container size="md">
        <Modal.Dialog>
          <form onSubmit={handleSubmit}>
            <Modal.Header>
              <Modal.Heading>{isEdit ? t('modal.titleEdit') : t('modal.titleCreate')}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {/* Name */}
              <TextField value={name} onChange={setName} isRequired>
                <Label>{t('field.name')}</Label>
                <Input autoFocus />
                <FieldError>{t('field.nameRequired')}</FieldError>
              </TextField>

              {/* File Name */}
              <TextField value={fileName} onChange={setFileName}>
                <Label>{t('field.fileName')}</Label>
                <Input placeholder={t('field.fileNamePlaceholder')} />
              </TextField>

              {/* Group Type */}
              <Select selectedKey={groupType} onSelectionChange={key => setGroupType(String(key))}>
                <Label>{t('field.groupType')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {GROUP_TYPE_OPTIONS.map(opt => (
                      <ListBox.Item key={opt.id} id={opt.id}>
                        {tc(opt.labelKey)}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Threshold */}
              <NumberField
                value={threshold}
                onChange={(val: number | null) => setThreshold(val ?? undefined)}
                minValue={0}
              >
                <Label>{t('field.threshold')}</Label>
                <NumberField.Input />
              </NumberField>

              <Separator />

              {/* Switches in 2-column grid */}
              <div className="grid grid-cols-2 gap-4">
                {SWITCH_KEYS.map(key => (
                  <Switch
                    key={key}
                    isSelected={switches[key]}
                    onChange={e => updateSwitch(key, e)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      {t(`field.${key === 'keep_alive' ? 'keepAlive' : key === 'fake_ip' ? 'fakeIp' : key}`)}
                    </Switch.Content>
                  </Switch>
                ))}
              </div>

              <Separator />

              {/* Subscription Groups */}
              <div className="flex flex-col gap-2">
                <Label>{t('section.subscriptionGroups')}</Label>
                {loadingOptions ? (
                  <LoadingState />
                ) : groups.length === 0 ? (
                  <p className="text-sm text-default-500">{t('empty.noGroups')}</p>
                ) : (
                  <CheckboxGroup value={selectedGroups} onChange={setSelectedGroups}>
                    {groups.map(g => (
                      <Checkbox key={g.id} value={String(g.id)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          {g.name}
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
              </div>

              {/* Subscriptions */}
              <div className="flex flex-col gap-2">
                <Label>{t('section.subscriptions')}</Label>
                {loadingOptions ? (
                  <LoadingState />
                ) : subs.length === 0 ? (
                  <p className="text-sm text-default-500">{t('empty.noSubscriptions')}</p>
                ) : (
                  <CheckboxGroup value={selectedSubs} onChange={setSelectedSubs}>
                    {subs.map(s => (
                      <Checkbox key={s.id} value={String(s.id)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          {s.name}
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {isEdit && (
                <Button type="button" variant="danger" onPress={handleDelete} isDisabled={saving}>
                  {t('delete.button')}
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onPress={() => state.close()} isDisabled={saving}>
                {tc('button.cancel')}
              </Button>
              <Button type="submit" variant="primary" isDisabled={saving}>
                {tc('button.save')}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Root>
  );
}
