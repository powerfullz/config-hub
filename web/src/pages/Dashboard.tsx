import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Chip } from '@heroui/react';
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
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  FileText,
  Code,
  Shield,
  Globe,
  ArrowRightLeft,
  ArrowRight,
  Layers,
  Users,
  AppWindow,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { notifySuccess, notifyError } from '../utils/notifications';
import { confirm } from '../utils/confirm';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { YamlPreview } from '../components/YamlPreview';
import { ValidationPanel } from '../components/ValidationPanel';
import { RuleTester } from '../components/RuleTester';
import ProfileEditor from '../components/ProfileEditor';
import TokenManager from '../components/TokenManager';
import { api } from '../api/client';
import type { Profile, ProxyGroup, RuleEntry, Subscription } from '../types';

const GROUP_TYPE_COLORS: Record<string, 'danger' | 'default' | 'success' | 'accent' | 'warning'> = {
  select: 'default',
  'url-test': 'success',
  'load-balance': 'warning',
  fallback: 'danger',
};

function getGroupTypeIcon(type: string) {
  switch (type) {
    case 'select':
      return <ArrowRightLeft className="w-3 h-3" />;
    case 'url-test':
      return <Globe className="w-3 h-3" />;
    case 'fallback':
      return <ArrowRight className="w-3 h-3" />;
    default:
      return <Layers className="w-3 h-3" />;
  }
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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

  const loadSubscriptions = useCallback(async () => {
    try {
      const data = await api.get<Subscription[]>('/api/subscriptions');
      setSubscriptions(data);
    } catch {
      // Silently fail - subscriptions count is not critical
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    loadSubscriptions();
  }, [loadProfiles, loadSubscriptions]);

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
          .catch(e => setError(e instanceof Error ? e.message : String(e)));
      }
    },
    [selectedId, groups],
  );

  const handleDeleteProfile = async (profileId: number) => {
    const ok = await confirm({
      title: t('profiles.deleteConfirm'),
      message: t('profiles.deleteConfirm'),
      danger: true,
      confirmText: tc('button.delete'),
      cancelText: tc('button.cancel'),
    });
    if (!ok) return;

    try {
      await api.deleteProfile(profileId);
      notifySuccess(tc('button.delete') + ' ✓');
      loadProfiles();
      if (selectedId === profileId) {
        setSelectedId(null);
        setProfile(null);
        setGroups([]);
        setRules([]);
        setYaml('');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('error.deleteFailed'));
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Top Stats Row */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <StatCard title={t('stats.users')} value={1} icon={<Users className="w-8 h-8" />} />
        <StatCard title={t('stats.subscriptions')} value={subscriptions.length} icon={<AppWindow className="w-8 h-8" />} />
        <StatCard title={t('stats.profiles')} value={profiles.length} icon={<FileText className="w-8 h-8" />} />
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Profile Sidebar */}
        <aside className="w-[280px] shrink-0 flex flex-col">
          <Card className="h-full flex flex-col">
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-default-500" />
                  <Card.Title>{t('profiles.title')}</Card.Title>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setEditingProfile(null);
                    setEditorOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card.Header>
            <Card.Content className="flex-1 overflow-auto p-0">
              {loadingProfiles ? (
                <LoadingState />
              ) : profiles.length === 0 ? (
                <EmptyState message={t('profiles.empty')} />
              ) : (
                <div className="divide-y divide-default-200">
                  {profiles.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-default-100 ${
                        selectedId === item.id ? 'bg-primary/10 border-l-3 border-l-primary' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-default-500 truncate">
                          {(() => {
                            const labels: Record<number, string> = {
                              0: tc('groupType.select'),
                              1: tc('groupType.urlTest'),
                              2: tc('groupType.loadBalance'),
                            };
                            return labels[item.group_type] ?? t('profiles.noDescription');
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => {
                            setEditingProfile(item);
                            setEditorOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onPress={() => handleDeleteProfile(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </aside>

        {/* Center: Groups + Rules + Tokens */}
        <main className="flex-1 min-w-0 flex flex-col gap-4 overflow-auto">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-2 text-danger hover:opacity-70">✕</button>
            </div>
          )}

          {!selectedId && !error ? (
            <Card className="flex-1 flex items-center justify-center">
              <EmptyState message={t('placeholder.selectProfile')} />
            </Card>
          ) : (
            <>
              {/* Proxy Groups */}
              <Card className="flex-1 flex flex-col min-h-0">
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-default-500" />
                    <Card.Title>{t('proxyGroups.title')}</Card.Title>
                    {profile && (
                      <Chip color="default" size="sm" variant="soft">{groups.length}</Chip>
                    )}
                  </div>
                </Card.Header>
                <Card.Content className="flex-1 overflow-auto p-0">
                  {loadingProfile ? (
                    <LoadingState />
                  ) : groups.length === 0 ? (
                    <EmptyState message={t('proxyGroups.empty')} />
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={groups.map(g => g.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="divide-y divide-default-200">
                          {groups.map(g => (
                            <SortableGroup key={g.id} group={g} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </Card.Content>
              </Card>

              {/* Rules */}
              <Card className="max-h-[35vh] flex flex-col">
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-default-500" />
                    <Card.Title>{t('rules.title')}</Card.Title>
                    {profile && (
                      <Chip color="success" size="sm" variant="soft">{rules.length}</Chip>
                    )}
                  </div>
                </Card.Header>
                <Card.Content className="flex-1 overflow-auto p-0">
                  {loadingProfile ? (
                    <LoadingState />
                  ) : rules.length === 0 ? (
                    <EmptyState message={t('rules.empty')} />
                  ) : (
                    <div className="divide-y divide-default-200">
                      {rules.map(r => (
                        <div key={r.id} className="px-4 py-1.5">
                          <code className="text-xs bg-default-100 px-2 py-1 rounded break-all">
                            {r.rule_text}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Validation + Rule Tester */}
              {selectedId && (
                <div className="grid grid-cols-2 gap-4">
                  <ValidationPanel profileId={selectedId} />
                  <RuleTester profileId={selectedId} />
                </div>
              )}

              {/* Share Link Tokens */}
              {selectedId && <TokenManager profileId={selectedId} />}
            </>
          )}
        </main>

        {/* Right: YAML Preview */}
        <aside className="w-[400px] shrink-0 flex flex-col">
          <Card className="h-full flex flex-col">
            <Card.Header>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-default-500" />
                <Card.Title>{t('yaml.title')}</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="flex-1 overflow-auto p-0">
              {loadingProfile ? (
                <LoadingState />
              ) : yaml ? (
                <YamlPreview yaml={yaml} />
              ) : (
                <EmptyState message={t('yaml.empty')} />
              )}
            </Card.Content>
          </Card>
        </aside>
      </div>

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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-4 py-2 cursor-grab transition-shadow ${
        isDragging ? 'bg-primary/10 shadow-lg z-50' : 'hover:bg-default-50'
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4 text-default-400 shrink-0" />
      {group.icon && (
        <img
          src={group.icon}
          alt=""
          className="w-5 h-5 rounded shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <span className="font-medium text-sm flex-1 truncate">{group.name}</span>
      <Chip
        color={GROUP_TYPE_COLORS[group.type] || 'default'}
        size="sm"
        variant="soft"
      >
        <span className="flex items-center gap-1">
          {getGroupTypeIcon(group.type)}
          {group.type}
        </span>
      </Chip>
    </div>
  );
}
