/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeYaml, highlightYaml } from './yamlHighlight';
import type { HighlightToken } from './yamlHighlight';

function findByType(tokens: HighlightToken[], type: HighlightToken['type']): HighlightToken[] {
  return tokens.filter(t => t.type === type);
}

describe('tokenizeYaml', () => {
  it('tokenizes a simple key-value pair', () => {
    const tokens = tokenizeYaml('port: 7890');
    assert.equal(tokens.length, 2);

    const key = tokens.find(t => t.type === 'section-key');
    assert.ok(key);
    assert.equal(key.start, 0);
    assert.equal(key.end, 4);

    const num = tokens.find(t => t.type === 'number');
    assert.ok(num);
    assert.equal(num.start, 6);
    assert.equal(num.end, 10);
  });

  it('tokenizes a comment line', () => {
    const tokens = tokenizeYaml('# this is a comment');
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].type, 'comment');
    assert.equal(tokens[0].start, 0);
    assert.equal(tokens[0].end, 19);
  });

  it('tokenizes a list item', () => {
    const tokens = tokenizeYaml('  - name: "HK-01"');
    const markers = findByType(tokens, 'list-marker');
    assert.equal(markers.length, 1);
    assert.equal(markers[0].start, 2);
    assert.equal(markers[0].end, 4);

    const keys = findByType(tokens, 'key');
    assert.equal(keys.length, 1);
    assert.equal(keys[0].start, 4);
    assert.equal(keys[0].end, 8);

    const strings = findByType(tokens, 'string');
    assert.equal(strings.length, 1);
  });

  it('tokenizes a nested structure', () => {
    const yaml = [
      'dns:',
      '  enable: true',
      '  listen: "0.0.0.0:1053"',
    ].join('\n');

    const tokens = tokenizeYaml(yaml);
    const sectionKeys = findByType(tokens, 'section-key');
    assert.equal(sectionKeys.length, 1);
    assert.equal(sectionKeys[0].start, 0);
    assert.equal(sectionKeys[0].end, 3);

    const keys = findByType(tokens, 'key');
    assert.equal(keys.length, 2);

    const booleans = findByType(tokens, 'boolean');
    assert.equal(booleans.length, 1);

    const strings = findByType(tokens, 'string');
    assert.equal(strings.length, 1);
  });

  it('tokenizes full mihomo config pattern', () => {
    const yaml = [
      '---',
      'port: 7890',
      'mode: rule',
      'log-level: info',
      'unified-delay: true',
      '',
      'proxies:',
      '  - name: "HK-01"',
      '    type: ss',
      '    port: 8388',
      '',
      'rules:',
      '  - DOMAIN-SUFFIX,google.com,Proxy',
      '  - GEOIP,CN,DIRECT  # country rule',
      '  - MATCH,DIRECT',
    ].join('\n');

    const tokens = tokenizeYaml(yaml);

    // Document separator
    const docSep = tokens.find(t => t.type === 'plain' && t.start === 0);
    assert.ok(docSep, 'should tokenize --- as plain');

    // Section keys at indent 0
    const sectionKeys = findByType(tokens, 'section-key');
    const sectionKeyTexts = sectionKeys.map(t => yaml.slice(t.start, t.end));
    assert.ok(sectionKeyTexts.includes('port'));
    assert.ok(sectionKeyTexts.includes('proxies'));
    assert.ok(sectionKeyTexts.includes('rules'));

    // Booleans
    const booleans = findByType(tokens, 'boolean');
    assert.equal(booleans.length, 1);
    assert.equal(yaml.slice(booleans[0].start, booleans[0].end), 'true');

    // List markers
    const markers = findByType(tokens, 'list-marker');
    assert.equal(markers.length, 4); // 1 proxy + 3 rules

    // Inline comment
    const comments = findByType(tokens, 'comment');
    const inlineComment = comments.find(t => yaml.slice(t.start, t.end).includes('country rule'));
    assert.ok(inlineComment, 'should detect inline comment');

    // Numbers
    const numbers = findByType(tokens, 'number');
    assert.ok(numbers.length >= 2); // 7890, 8388
  });
});

describe('highlightYaml', () => {
  it('returns proper HTML spans', () => {
    const html = highlightYaml('port: 7890');
    assert.ok(html.includes('<span class="yaml-section-key">port</span>'));
    assert.ok(html.includes('<span class="yaml-number">7890</span>'));
    assert.ok(html.includes(':'));
  });

  it('escapes HTML special characters', () => {
    const html = highlightYaml('key: <value>');
    assert.ok(html.includes('&lt;value&gt;'));
    assert.ok(!html.includes('<value>'));
  });

  it('wraps comments correctly', () => {
    const html = highlightYaml('# comment');
    assert.ok(html.includes('<span class="yaml-comment"># comment</span>'));
  });
});
