import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useTranslation } from '../i18n';
import type { Profile, ProxyGroup, RuleEntry } from '../types';
import TokenManager from '../components/TokenManager';
import ProfileEditor from '../components/ProfileEditor';
import {
  Card,
  Typography,
  List,
  Space,
  Tag,
  Empty,
  Alert,
  theme,
  Spin,
  Popconfirm,
  Button,
} from 'antd';
import {
  HolderOutlined,
  FileTextOutlined,
  ClusterOutlined,
  SafetyOutlined,
  CodeOutlined,
  SwapOutlined,
  SwapRightOutlined,
  GlobalOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text } = Typography;

const GROUP_TYPE_COLORS: Record<string, string> = {
  select: 'blue',
  'url-test': 'green',
  'load-balance': 'orange',
  fallback: 'red',
};

function getGroupTypeColor(type: string): string {
  return GROUP_TYPE_COLORS[type] ?? 'default';
}

function getGroupTypeIcon(type: string) {
  switch (type) {
    case 'select':
      return <SwapOutlined />;
    case 'url-test':
      return <GlobalOutlined />;
    case 'fallback':
      return <SwapRightOutlined />;
    default:
      return <ClusterOutlined />;
  }
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ProxyGroup[]>([]);
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const { token: themeToken } = theme.useToken();
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const data = await api.get<Profile[]>('/api/profiles');
      setProfiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.requestFailed'));
    } finally {
      setLoadingProfiles(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const [p, y] = await Promise.all([
          api.get<Profile>(`/api/profiles/${selectedId}`),
          api.getText(`/api/profiles/${selectedId}/preview`),
        ]);
        if (!cancelled) {
          setError('');
          setProfile(p);
          setGroups(p.proxy_groups || []);
          setRules(p.rules || []);
          setYaml(y);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('error.requestFailed'));
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [selectedId, t]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = groups.findIndex(g => g.id === active.id);
      const newIdx = groups.findIndex(g => g.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = [...groups];
      const [moved] = reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, moved);

      setGroups(reordered);

      if (selectedId) {
        api
          .put(`/api/profiles/${selectedId}/groups/reorder`, {
            order: reordered.map(g => g.id),
          })
          .catch(e => setError(e.message));
      }
    },
    [selectedId, groups],
  );

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 16 }}>
      {/* Left: Profile Sidebar */}
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>{t('profiles.title')}</span>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingProfile(null);
                  setEditorOpen(true);
                }}
              />
            </Space>
          }
          styles={{
            body: { padding: 0, overflow: 'auto', flex: 1 },
          }}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loadingProfiles ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : profiles.length === 0 ? (
            <Empty description={t('profiles.empty')} style={{ padding: 40 }} />
          ) : (
            <List
              dataSource={profiles}
              renderItem={item => (
                <List.Item
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background:
                      selectedId === item.id
                        ? themeToken.colorPrimaryBg
                        : undefined,
                    borderLeft:
                      selectedId === item.id
                        ? `3px solid ${themeToken.colorPrimary}`
                        : '3px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Text strong style={{ fontSize: 14 }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {(() => {
                          const labels: Record<number, string> = {
                            0: tc('groupType.select'),
                            1: tc('groupType.urlTest'),
                            2: tc('groupType.loadBalance'),
                          };
                          return labels[item.group_type] ?? t('profiles.noDescription');
                        })()}
                      </Text>
                    }
                  />
                  <Space style={{ flexShrink: 0, marginLeft: 8 }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        setEditingProfile(item);
                        setEditorOpen(true);
                      }}
                    />
                    <Popconfirm
                      title={t('profiles.deleteConfirm')}
                      onConfirm={() => {
                        api.deleteProfile(item.id).then(() => {
                          loadProfiles();
                          if (selectedId === item.id) {
                            setSelectedId(null);
                            setProfile(null);
                            setGroups([]);
                            setRules([]);
                            setYaml('');
                          }
                        }).catch(e => setError(e instanceof Error ? e.message : t('error.deleteFailed')));
                      }}
                      okText={tc('button.delete')}
                      okType="danger"
                      cancelText={tc('button.cancel')}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={e => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </aside>

      {/* Center: Groups + Rules */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <Alert
            title={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
          />
        )}

        {!selectedId && !error ? (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description={t('placeholder.selectProfile')} />
          </Card>
        ) : (
          <>
            {/* Proxy Groups */}
            <Card
              title={
                <Space>
                  <ClusterOutlined />
                  <span>{t('proxyGroups.title')}</span>
                  {profile && (
                    <Tag color="blue">{groups.length}</Tag>
                  )}
                </Space>
              }
              styles={{ body: { padding: 0 } }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              {loadingProfile ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : groups.length === 0 ? (
                <Empty description={t('proxyGroups.empty')} style={{ padding: 40 }} />
              ) : (
                <div style={{ overflow: 'auto', flex: 1 }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={groups.map(g => g.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {groups.map(g => (
                        <SortableGroup key={g.id} group={g} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </Card>

            {/* Rules */}
            <Card
              title={
                <Space>
                  <SafetyOutlined />
                  <span>{t('rules.title')}</span>
                  {profile && (
                    <Tag color="green">{rules.length}</Tag>
                  )}
                </Space>
              }
              styles={{
                body: {
                  padding: 0,
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
              style={{ maxHeight: '35vh', display: 'flex', flexDirection: 'column' }}
            >
              {loadingProfile ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : rules.length === 0 ? (
                <Empty description={t('rules.empty')} style={{ padding: 40 }} />
              ) : (
                <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                  <List
                    dataSource={rules}
                    style={{ margin: 0 }}
                    renderItem={r => (
                      <List.Item style={{ padding: '6px 16px' }}>
                        <Text
                          code
                          style={{ fontSize: 12, wordBreak: 'break-all' }}
                        >
                          {r.rule_text}
                        </Text>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Card>

            {/* Share Link Tokens */}
            <TokenManager profileId={selectedId!} />
          </>
        )}
      </main>

      {/* Right: YAML Preview */}
      <aside
        style={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Card
          title={
            <Space>
              <CodeOutlined />
              <span>{t('yaml.title')}</span>
            </Space>
          }
          styles={{
            body: {
              padding: 0,
              overflow: 'auto',
              flex: 1,
            },
          }}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loadingProfile ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : yaml ? (
            <pre
              style={{
                margin: 0,
                padding: 16,
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                background: themeToken.colorBgLayout,
                color: themeToken.colorText,
              }}
            >
              {yaml}
            </pre>
          ) : (
            <Empty
              description={t('yaml.empty')}
              style={{ padding: 40 }}
            />
          )}
        </Card>
      </aside>

      <ProfileEditor
        open={editorOpen}
        profile={editingProfile}
        onClose={() => {
          setEditorOpen(false);
          setEditingProfile(null);
        }}
        onSaved={() => {
          setEditorOpen(false);
          setEditingProfile(null);
          loadProfiles();
        }}
      />
    </div>
  );
}

function SortableGroup({ group }: { group: ProxyGroup }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const { token: themeToken } = theme.useToken();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
    cursor: 'grab',
    background: isDragging ? themeToken.colorPrimaryBg : undefined,
    transitionProperty: 'background, box-shadow',
    transitionDuration: '0.2s',
    boxShadow: isDragging ? themeToken.boxShadowSecondary : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <HolderOutlined style={{ color: themeToken.colorTextQuaternary, fontSize: 14 }} />
      {group.icon && (
        <img
          src={group.icon}
          alt=""
          style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <Text strong style={{ flex: 1, fontSize: 13 }}>
        {group.name}
      </Text>
      <Tag
        color={getGroupTypeColor(group.type)}
        icon={getGroupTypeIcon(group.type)}
        style={{ margin: 0, fontSize: 11 }}
      >
        {group.type}
      </Tag>
    </div>
  );
}
