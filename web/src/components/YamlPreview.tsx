import { useCallback, useState } from 'react';
import { highlightYaml } from '../utils/yamlHighlight';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '../i18n';

interface YamlPreviewProps {
  yaml: string;
  className?: string;
}

export function YamlPreview({ yaml, className = '' }: YamlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('dashboard');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = yaml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [yaml]);

  const highlighted = highlightYaml(yaml);

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-default-100 hover:bg-default-200 text-default-500 hover:text-default-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title={t('yaml.copyYaml')}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre
        className="m-0 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all bg-default-50 text-default-900 yaml-highlight"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
