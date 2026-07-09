import { useState } from 'react';
import { Card, Button, TextField, Input, Chip } from '@heroui/react';
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n';
import { api } from '../api/client';

interface RuleMatchResult {
  matched: boolean;
  rule_text?: string;
  rule_type?: string;
  group?: string;
  reason?: string;
}

interface RuleTesterProps {
  profileId: number;
}

export function RuleTester({ profileId }: RuleTesterProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RuleMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation('dashboard');

  const handleTest = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.post<RuleMatchResult>(`/api/profiles/${profileId}/test-rule`, {
        input: input.trim(),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error.requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <Card.Header>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-default-500" />
          <Card.Title>{t('ruleTester.title')}</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <TextField
            value={input}
            onChange={setInput}
            placeholder={t('ruleTester.placeholder')}
            size="sm"
            variant="bordered"
            className="flex-1"
          >
            <Input />
          </TextField>
          <Button
            variant="primary"
            size="sm"
            onPress={handleTest}
            isDisabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t('ruleTester.test')}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-3 ${result.matched ? 'bg-success/10' : 'bg-warning/10'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.matched ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-warning" />
              )}
              <span className={`text-sm font-medium ${result.matched ? 'text-success' : 'text-warning'}`}>
                {result.matched ? t('ruleTester.matched') : t('ruleTester.noMatch')}
              </span>
            </div>
            {result.matched && result.rule_text && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-default-500">{t('ruleTester.rule')}:</span>
                  <code className="text-xs bg-default-100 px-2 py-0.5 rounded">{result.rule_text}</code>
                </div>
                {result.rule_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-default-500">{t('ruleTester.type')}:</span>
                    <Chip size="sm" variant="flat">{result.rule_type}</Chip>
                  </div>
                )}
                {result.group && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-default-500">{t('ruleTester.group')}:</span>
                    <Chip size="sm" variant="flat" color="primary">{result.group}</Chip>
                  </div>
                )}
                {result.reason && (
                  <p className="text-xs text-default-500 mt-1">{result.reason}</p>
                )}
              </div>
            )}
            {!result.matched && result.reason && (
              <p className="text-sm text-warning">{result.reason}</p>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
