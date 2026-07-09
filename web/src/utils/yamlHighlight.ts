/**
 * Custom YAML syntax highlighter scoped to mihomo config patterns.
 * No external dependencies — regex-based tokenizer + HTML generator.
 */

export type HighlightToken = {
  type: 'key' | 'string' | 'number' | 'boolean' | 'comment' | 'list-marker' | 'plain' | 'section-key';
  start: number;
  end: number;
};

const RE_LIST_PREFIX = /^(\s*)(- )/;
const RE_KEY_VALUE = /^([\w][\w-]*)(:)(\s?)(.*)/;
const RE_DOUBLE_QUOTE = /^"(?:[^"\\]|\\.)*"/;
const RE_SINGLE_QUOTE = /^'(?:[^'\\]|\\.)*'/;
const RE_NUMBER = /^-?\d+(?:\.\d+)?$/;
const RE_BOOLEAN = /^(?:true|false)$/;

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Find ` #` outside of quoted regions. Returns index or -1. */
function findInlineComment(str: string): number {
  let inDQ = false;
  let inSQ = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"' && !inSQ) inDQ = !inDQ;
    if (ch === "'" && !inDQ) inSQ = !inSQ;
    if (!inDQ && !inSQ && ch === '#' && i > 0 && str[i - 1] === ' ') return i;
  }
  return -1;
}

function tokenizeValue(value: string, start: number, tokens: HighlightToken[]): void {
  const trimmed = value.trimStart();
  const vOff = start + (value.length - trimmed.length);

  const cIdx = findInlineComment(trimmed);
  const valuePart = cIdx >= 0 ? trimmed.slice(0, cIdx).trimEnd() : trimmed;
  const commentOff = cIdx >= 0 ? vOff + cIdx : -1;

  if (valuePart.length > 0) {
    if (valuePart.startsWith('"')) {
      const m = valuePart.match(RE_DOUBLE_QUOTE);
      const len = m ? m[0].length : valuePart.length;
      tokens.push({ type: 'string', start: vOff, end: vOff + len });
    } else if (valuePart.startsWith("'")) {
      const m = valuePart.match(RE_SINGLE_QUOTE);
      const len = m ? m[0].length : valuePart.length;
      tokens.push({ type: 'string', start: vOff, end: vOff + len });
    } else if (RE_NUMBER.test(valuePart)) {
      tokens.push({ type: 'number', start: vOff, end: vOff + valuePart.length });
    } else if (RE_BOOLEAN.test(valuePart)) {
      tokens.push({ type: 'boolean', start: vOff, end: vOff + valuePart.length });
    } else {
      tokens.push({ type: 'plain', start: vOff, end: vOff + valuePart.length });
    }
  }

  if (commentOff >= 0) {
    tokens.push({ type: 'comment', start: commentOff, end: vOff + trimmed.length });
  }
}

export function tokenizeYaml(yaml: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const lines = yaml.split('\n');
  let offset = 0;
  let blockIndent = -1;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Block scalar continuation (| or >)
    if (blockIndent >= 0) {
      if (trimmed.length === 0 || indent > blockIndent) {
        if (trimmed.length > 0) {
          tokens.push({ type: 'string', start: offset, end: offset + line.length });
        }
        offset += line.length + 1;
        continue;
      }
      blockIndent = -1;
    }

    if (trimmed.length === 0) { offset += line.length + 1; continue; }

    // Document separator
    if (trimmed === '---' || trimmed === '...') {
      tokens.push({ type: 'plain', start: offset, end: offset + 3 });
      offset += line.length + 1;
      continue;
    }

    // Full-line comment
    if (trimmed.startsWith('#')) {
      tokens.push({ type: 'comment', start: offset + indent, end: offset + line.length });
      offset += line.length + 1;
      continue;
    }

    let pos = offset;
    let rest = line;

    // List marker
    const listMatch = rest.match(RE_LIST_PREFIX);
    if (listMatch) {
      const mStart = offset + listMatch[1].length;
      tokens.push({ type: 'list-marker', start: mStart, end: mStart + 2 });
      rest = rest.slice(listMatch[0].length);
      pos += listMatch[0].length;
    }

    // Strip remaining leading whitespace before key match
    const leadSpace = rest.match(/^(\s*)/);
    if (leadSpace && leadSpace[1].length > 0) {
      rest = rest.slice(leadSpace[1].length);
      pos += leadSpace[1].length;
    }

    // Key: value
    const kvMatch = rest.match(RE_KEY_VALUE);
    if (kvMatch) {
      const keyStart = pos;
      const keyEnd = keyStart + kvMatch[1].length;
      const isTopLevel = indent === 0 && !listMatch;
      tokens.push({ type: isTopLevel ? 'section-key' : 'key', start: keyStart, end: keyEnd });

      const vStart = pos + kvMatch[1].length + kvMatch[2].length + kvMatch[3].length;
      if (kvMatch[4].length > 0) {
        tokenizeValue(kvMatch[4], vStart, tokens);
        const tv = kvMatch[4].trim();
        if (tv === '|' || tv === '>') {
          blockIndent = listMatch ? indent + 2 : indent;
        }
      }
    } else {
      // Standalone value (e.g. list item without key)
      const content = rest.trim();
      if (content.length > 0) {
        const cStart = pos + (rest.length - rest.trimStart().length);
        tokenizeValue(content, cStart, tokens);
      }
    }

    offset += line.length + 1;
  }

  return tokens;
}

const CLASS_MAP: Record<HighlightToken['type'], string> = {
  'key': 'yaml-key',
  'section-key': 'yaml-section-key',
  'string': 'yaml-string',
  'number': 'yaml-number',
  'boolean': 'yaml-boolean',
  'comment': 'yaml-comment',
  'list-marker': 'yaml-list-marker',
  'plain': 'yaml-plain',
};

export function highlightYaml(yaml: string): string {
  const tokens = tokenizeYaml(yaml);
  if (tokens.length === 0) return htmlEscape(yaml);

  tokens.sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;

  for (const token of tokens) {
    if (token.start < cursor) continue;
    if (token.start > cursor) result += htmlEscape(yaml.slice(cursor, token.start));
    result += `<span class="${CLASS_MAP[token.type]}">${htmlEscape(yaml.slice(token.start, token.end))}</span>`;
    cursor = token.end;
  }

  if (cursor < yaml.length) result += htmlEscape(yaml.slice(cursor));
  return result;
}
