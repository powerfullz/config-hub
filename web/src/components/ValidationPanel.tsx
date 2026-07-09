import { useState } from 'react';
import { Card, Button, Chip } from '@heroui/react';
import { ShieldCheck, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { api } from '../api/client';

interface ValidationMessage {
  level: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

interface ValidationPanelProps {
  profileId: number;
}

export function ValidationPanel({ profileId }: ValidationPanelProps) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation('dashboard');

  const handleValidate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<ValidationResult>(`/api/profiles/${profileId}/validate`);
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
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-default-500" />
            <Card.Title>{t('validation.title')}</Card.Title>
            {result && (
              <Chip
                color={result.valid ? 'success' : 'danger'}
                size="sm"
                variant="soft"
              >
                {result.valid ? t('validation.valid') : t('validation.invalid')}
              </Chip>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onPress={handleValidate}
            isDisabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {t('validation.run')}
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        {error && (
          <div className="px-4 py-2 text-sm text-danger bg-danger/10">
            {error}
          </div>
        )}
        {result && result.messages.length > 0 && (
          <div className="divide-y divide-default-200">
            {result.messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2">
                {msg.level === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{msg.message}</p>
                  {msg.field && (
                    <Chip size="sm" variant="soft" color="default" className="mt-1">
                      {msg.field}
                    </Chip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {result && result.messages.length === 0 && (
          <div className="px-4 py-3 text-sm text-success">
            {t('validation.allClear')}
          </div>
        )}
        {!result && !loading && !error && (
          <div className="px-4 py-3 text-sm text-default-500">
            {t('validation.hint')}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
