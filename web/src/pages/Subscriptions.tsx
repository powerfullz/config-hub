import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  TextField,
  Input,
  Label,
  FieldError,
  Switch,
  Chip,
  useOverlayState,
} from '@heroui/react';
import { Plus, RefreshCw, Trash2, Edit, Link, Server, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import i18n from '../i18n';
import { notifySuccess, notifyError } from '../utils/notifications';
import { confirm } from '../utils/confirm';
import { formatDateTime } from '../utils/date';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { api } from '../api/client';
import type { Subscription, Node } from '../types';

export default function Subscriptions() {
  const { t } = useTranslation('subscriptions');
  const { t: tc } = useTranslation('common');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [nodes, setNodes] = useState<Record<number, Node[]>>({});
  const [nodesLoading, setNodesLoading] = useState<Record<number, boolean>>({});
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formUserAgent, setFormUserAgent] = useState('');
  const [formFetchProxy, setFormFetchProxy] = useState('');

  const modalState = useOverlayState({ defaultOpen: false });

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Subscription[]>('/api/subscriptions');
      setSubs(data);
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const toggleExpand = async (subId: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(subId)) {
      newExpanded.delete(subId);
      setExpanded(newExpanded);
    } else {
      newExpanded.add(subId);
      setExpanded(newExpanded);
      if (!nodes[subId]) {
        setNodesLoading(prev => ({ ...prev, [subId]: true }));
        try {
          const data = await api.get<Node[]>(`/api/nodes?subscription_id=${subId}`);
          setNodes(prev => ({ ...prev, [subId]: data }));
        } catch (e: unknown) {
          notifyError(e instanceof Error ? e.message : t('message.loadNodesFailed'));
        } finally {
          setNodesLoading(prev => ({ ...prev, [subId]: false }));
        }
      }
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormUserAgent('');
    setFormFetchProxy('');
  };

  const handleAdd = () => {
    setEditingSub(null);
    resetForm();
    modalState.open();
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormName(sub.name);
    setFormUrl(sub.url);
    setFormUserAgent(sub.user_agent || '');
    setFormFetchProxy(sub.fetch_proxy || '');
    modalState.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        user_agent: formUserAgent.trim(),
        fetch_proxy: formFetchProxy.trim(),
      };
      if (editingSub) {
        await api.put(`/api/subscriptions/${editingSub.id}`, payload);
        notifySuccess(t('message.updated'));
      } else {
        await api.post('/api/subscriptions', payload);
        notifySuccess(t('message.added'));
      }
      modalState.close();
      resetForm();
      loadSubs();
    } catch (e: unknown) {
      if (e instanceof Error) notifyError(e.message);
      else notifyError(t('message.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: tc('confirm.deleteSubscription'),
      message: tc('confirm.deleteSubscriptionMessage'),
      danger: true,
      confirmText: tc('button.delete'),
      cancelText: tc('button.cancel'),
    });
    if (!ok) return;

    try {
      await api.delete(`/api/subscriptions/${id}`);
      notifySuccess(t('message.deleted'));
      setExpanded(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadSubs();
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('message.deleteFailed'));
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      const res = await api.post<{ node_count: number; traffic: string }>(
        `/api/subscriptions/${id}/refresh`
      );
      notifySuccess(t('message.refreshed', { count: res.node_count }));
      loadSubs();
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('message.refreshFailed'));
    }
  };

  const handleToggle = async (sub: Subscription) => {
    try {
      await api.put(`/api/subscriptions/${sub.id}`, { enabled: !sub.enabled });
      loadSubs();
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('message.toggleFailed'));
    }
  };

  const handleCloseModal = () => {
    modalState.close();
    resetForm();
    setEditingSub(null);
  };

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Chip color="default" size="sm" variant="soft">{subs.length}</Chip>
        </div>
        <Button variant="primary" onPress={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addButton')}
        </Button>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <LoadingState />
          ) : subs.length === 0 ? (
            <EmptyState message={t('status.noSubs')} />
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t('title')}>
                  <Table.Header>
                    <Table.Column>{t('column.name')}</Table.Column>
                    <Table.Column>{t('column.url')}</Table.Column>
                    <Table.Column>{t('column.nodes')}</Table.Column>
                    <Table.Column>{t('column.enabled')}</Table.Column>
                    <Table.Column>{t('column.lastFetched')}</Table.Column>
                    <Table.Column>{t('column.actions')}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {subs.flatMap(sub => [
                      <Table.Row key={`sub-${sub.id}`}>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(sub.id)}
                              className="p-1 rounded hover:bg-default-200 transition-colors"
                            >
                              {expanded.has(sub.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <span className="font-medium">{sub.name}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-2 max-w-xs truncate">
                            <Link className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-default-500 truncate text-sm">{sub.url}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip color="default" size="sm" variant="soft">
                            <Server className="w-3 h-3 mr-1" />
                            {sub.node_count}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <Switch
                            isSelected={sub.enabled}
                            onChange={() => handleToggle(sub)}
                            size="sm"
                          >
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-sm text-default-500">
                            {sub.last_fetched_at
                              ? formatDateTime(sub.last_fetched_at, i18n.language)
                              : t('status.never')}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onPress={() => handleRefresh(sub.id)}>
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onPress={() => handleEdit(sub)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="danger" size="sm" onPress={() => handleDelete(sub.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>,
                      ...(expanded.has(sub.id) ? [
                        <Table.Row key={`nodes-${sub.id}`}>
                          <Table.Cell colSpan={7}>
                            <div className="p-4 bg-default-50 rounded-lg">
                              {nodesLoading[sub.id] ? (
                                <LoadingState message={t('status.loadingNodes')} />
                              ) : (nodes[sub.id] || []).length === 0 ? (
                                <EmptyState message={t('status.noNodes')} />
                              ) : (
                                <Table>
                                  <Table.ScrollContainer>
                                    <Table.Content aria-label={t('status.nodesFor', { name: sub.name })}>
                                      <Table.Header>
                                        <Table.Column>{t('column.name')}</Table.Column>
                                        <Table.Column>{t('column.type')}</Table.Column>
                                        <Table.Column>{t('column.server')}</Table.Column>
                                        <Table.Column>{t('column.port')}</Table.Column>
                                        <Table.Column>{t('column.country')}</Table.Column>
                                        <Table.Column>{t('column.latency')}</Table.Column>
                                      </Table.Header>
                                      <Table.Body>
                                        {(nodes[sub.id] || []).map(node => (
                                          <Table.Row key={node.id}>
                                            <Table.Cell>{node.name}</Table.Cell>
                                            <Table.Cell>
                                              <Chip size="sm" variant="soft">{node.protocol}</Chip>
                                            </Table.Cell>
                                            <Table.Cell>
                                              <span className="text-sm truncate max-w-xs block">{node.server}</span>
                                            </Table.Cell>
                                            <Table.Cell>{node.port}</Table.Cell>
                                            <Table.Cell>{node.country || '—'}</Table.Cell>
                                            <Table.Cell>
                                              {node.latency > 0 ? (
                                                <span className="text-sm">{node.latency}ms</span>
                                              ) : (
                                                <span className="text-sm text-default-400">—</span>
                                              )}
                                            </Table.Cell>
                                          </Table.Row>
                                        ))}
                                      </Table.Body>
                                    </Table.Content>
                                  </Table.ScrollContainer>
                                </Table>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ] : [])
                    ])}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Add/Edit Modal */}
      <Modal.Root state={modalState} onOpenChange={isOpen => { if (!isOpen) handleCloseModal(); }}>
        <Modal.Backdrop />
        <Modal.Container size="md">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>{editingSub ? t('modal.titleEdit') : t('modal.titleAdd')}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField value={formName} onChange={setFormName} isRequired>
                  <Label>{t('form.name')}</Label>
                  <Input autoFocus placeholder={t('form.namePlaceholder')} />
                  <FieldError>{t('form.nameRequired')}</FieldError>
                </TextField>

                <TextField value={formUrl} onChange={setFormUrl} isRequired>
                  <Label>{t('form.url')}</Label>
                  <Input placeholder={t('form.urlPlaceholder')} />
                  <FieldError>{t('form.urlRequired')}</FieldError>
                </TextField>

                <TextField value={formUserAgent} onChange={setFormUserAgent}>
                  <Label>{t('form.userAgent')}</Label>
                  <Input placeholder={t('form.userAgentPlaceholder')} />
                </TextField>

                <TextField value={formFetchProxy} onChange={setFormFetchProxy}>
                  <Label>{t('form.fetchProxy')}</Label>
                  <Input placeholder={t('form.fetchProxyPlaceholder')} />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="ghost" onPress={handleCloseModal}>
                  {tc('button.cancel')}
                </Button>
                <Button type="submit" variant="primary" isDisabled={submitting || !formName.trim() || !formUrl.trim()}>
                  {editingSub ? t('modal.okUpdate') : t('modal.okAdd')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </div>
  );
}
