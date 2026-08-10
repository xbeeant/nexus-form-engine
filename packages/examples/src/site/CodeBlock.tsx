// ============================================================================
// CodeBlock — 简易代码展示块（带复制按钮）
// ============================================================================

import { Typography } from 'antd';
import { useState } from 'react';

interface CodeBlockProps {
  /** 代码内容（会去除首尾空行并按公共缩进对齐） */
  code: string;
  /** 语言标签，如 tsx / json */
  lang?: string;
  /** 标题 */
  title?: string;
}

/** 去除首尾空行，并裁剪公共缩进，使代码块展示更紧凑 */
function dedent(raw: string): string {
  const lines = raw.replace(/^\n+|\n+$/g, '').split('\n');
  const indent = lines.reduce<number>((min, line) => {
    if (!line.trim()) {
      return min;
    }
    const match = line.match(/^[ \t]*/);
    return Math.min(min, match ? match[0].length : 0);
  }, Infinity);
  return lines
    .map((line) => (indent === Infinity ? line : line.slice(indent)))
    .join('\n');
}

export function CodeBlock({ code, lang, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const content = dedent(code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败
    }
  };

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 8,
        overflow: 'hidden',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <Typography.Text
          style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}
        >
          {lang ? `${lang} · ` : ''}
          {title}
        </Typography.Text>
        <button
          type='button'
          onClick={handleCopy}
          style={{
            border: 'none',
            background: copied ? '#22c55e' : 'rgba(255,255,255,0.1)',
            color: copied ? '#052e16' : '#cbd5e1',
            borderRadius: 4,
            padding: '2px 10px',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          overflow: 'auto',
          color: '#e2e8f0',
        }}
      >
        <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {content}
        </code>
      </pre>
    </div>
  );
}
