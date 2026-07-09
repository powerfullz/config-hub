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
  Chip,
  useOverlayState,
} from '@heroui/react';
import { Copy, Key, Link } from 'lucide-react';
import { api } from '../api/client';
import type { Token, TokenCreateResponse } from '../types';
import { useTranslation } from '../i18n';
import { notifySuccess, notifyError } from '../utils/notifications';
import { confirm } from '../utils/confirm';
import { formatDateTime } from '../utils/date';
import { EmptyState, LoadingState } from './EmptyState';

interface TokenManagerProps {
  profileId: number;
}

export default function TokenManager({ profileId }: TokenManagerProps) {
  const { t, i18n } = useTranslation('profileEditor');
  const { t: tc } = useTranslation('common');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<TokenCreateResponse | null>(null);

  const modalState = useOverlayState({ defaultOpen: false });

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTokens(profileId);
      setTokens(data);
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('token.message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, t]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenName.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const result = await api.createToken(profileId, trimmed);
      setNewToken(result);
      setTokenName('');
      await fetchTokens();
      notifySuccess(t('token.message.created'));
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('token.message.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenId: number) => {
    const ok = await confirm({
      title: tc('confirm.revokeToken'),
      message: tc('confirm.revokeTokenMessage'),
      danger: true,
      confirmText: tc('button.revoke'),
      cancelText: tc('button.cancel'),
    });
    if (!ok) return;

    try {
      await api.revokeToken(profileId, tokenId);
      notifySuccess(t('token.message.revoked'));
      await fetchTokens();
    } catch (e: unknown) {
      notifyError(e instanceof Error ? e.message : t('token.message.revokeFailed'));
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!navigator.clipboard) {
      notifyError(t('token.message.clipboardUnavailable'));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      notifySuccess(t('token.message.copied', { label }));
    } catch {
      notifyError(t('token.message.copyFailed'));
    }
  };

  const shareUrl = newToken
    ? `${window.location.origin}/sub/${profileId}?token=${newToken.token}`
    : '';

  const handleOpenCreate = () => {
    setNewToken(null);
    setTokenName('');
    modalState.open();
  };

  const handleCloseModal = () => {
    modalState.close();
    setNewToken(null);
    setTokenName('');
  };

  return (
    <>
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-default-500" />
              <Card.Title>{t('token.title')}</Card.Title>
            </div>
            <Button variant="primary" size="sm" onPress={handleOpenCreate}>
              <Key className="w-4 h-4 mr-2" />
              {t('token.generateButton')}
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <LoadingState />
          ) : tokens.length === 0 ? (
            <EmptyState message={t('token.empty')} />
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t('token.title')}>
                  <Table.Header>
                    <Table.Column>{t('token.table.name')}</Table.Column>
                    <Table.Column>{t('token.table.created')}</Table.Column>
                    <Table.Column>{t('token.table.lastUsed')}</Table.Column>
                    <Table.Column>{t('token.table.status')}</Table.Column>
                    <Table.Column>{t('token.table.actions')}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {tokens.map(token => (
                      <Table.Row key={token.id}>
                        <Table.Cell>{token.name}</Table.Cell>
                        <Table.Cell>{formatDateTime(token.created_at, i18n.language)}</Table.Cell>
                        <Table.Cell>{token.last_used_at ? formatDateTime(token.last_used_at, i18n.language) : '\u2014'}</Table.Cell>
                        <Table.Cell>
                          <Chip color={token.revoked ? 'danger' : 'success'} size="sm" variant="soft">
                            {token.revoked ? t('token.status.revoked') : t('token.status.active')}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="danger"
                            size="sm"
                            isDisabled={token.revoked}
                            onPress={() => handleRevoke(token.id)}
                          >
                            {tc('button.revoke')}
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Generate Token Modal */}
      <Modal.Root state={modalState} onOpenChange={isOpen => { if (!isOpen) handleCloseModal(); }}>
        <Modal.Backdrop />
        <Modal.Container size="sm">
          <Modal.Dialog>
            {!newToken ? (
              <form onSubmit={handleCreate}>
                <Modal.Header>
                  <Modal.Heading>{t('token.modalTitle')}</Modal.Heading>
                  <Modal.CloseTrigger />
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-default-500">{t('token.formHint')}</p>
                  <TextField value={tokenName} onChange={setTokenName} isRequired>
                    <Label>{t('token.placeholder')}</Label>
                    <Input autoFocus maxLength={64} />
                    <FieldError />
                  </TextField>
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={handleCloseModal}>
                    {tc('button.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={creating || !tokenName.trim()}>
                    {tc('button.create')}
                  </Button>
                </Modal.Footer>
              </form>
            ) : (
              <>
                <Modal.Header>
                  <Modal.Heading>{t('token.modalTitle')}</Modal.Heading>
                  <Modal.CloseTrigger />
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-default-500">{t('token.createdHint')}</p>

                  {/* Raw Token */}
                  <div className="flex flex-col gap-2">
                    <Label>
                      <Key className="w-4 h-4 inline mr-1" />
                      {t('token.rawToken')}
                    </Label>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-default-100 rounded-lg px-3 py-2 break-all">
                        {newToken.token}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => copyToClipboard(newToken.token, 'Token')}
                      >
                        <Copy className="w-4 h-4" />
                        {tc('button.copy')}
                      </Button>
                    </div>
                  </div>

                  {/* Share URL */}
                  <div className="flex flex-col gap-2">
                    <Label>
                      <Link className="w-4 h-4 inline mr-1" />
                      {t('token.shareUrl')}
                    </Label>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-default-100 rounded-lg px-3 py-2 break-all">
                        {shareUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => copyToClipboard(shareUrl, 'URL')}
                      >
                        <Copy className="w-4 h-4" />
                        {tc('button.copy')}
                      </Button>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onPress={handleCloseModal}>
                    {tc('button.done')}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </>
  );
}
