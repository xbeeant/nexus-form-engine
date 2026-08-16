// ============================================================================
// CodeEditor — 属性面板专用 JSON 编辑器
// 供 remoteData 等对象配置使用：支持语法校验、格式化与占位符示例
// 值格式：object | array（非法 JSON 不写回，光标处自动提示）
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Button, Form, Input, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';

export function CodeEditor({
  value,
  onChange,
  title,
  description,
  placeholder,
  ...rest
}: WidgetProps) {
  const fieldProps = rest as Record<string, unknown>;
  const lines = (fieldProps?.lines as number) ?? 10;

  const [error, setError] = useState<string | null>(null);

  // 编辑态文案：初始为 JSON 字符串；解析失败时保留原文（不打断输入）
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const text = useMemo(() => {
    if (draft !== undefined) {
      return draft;
    }
    if (value === undefined || value === null) {
      return '';
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [draft, value]);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON 解析失败');
    }
  };

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setDraft(formatted);
      setError(null);
    } catch {
      // 语法非法时静默，保留原文
    }
  };

  return (
    <Form.Item
      label={title}
      layout={'vertical'}
      style={{ width: '100%' }}
      help={
        error ? (
          <Typography.Text type='danger' style={{ fontSize: 11 }}>
            {error}
          </Typography.Text>
        ) : description ? (
          <span style={{ fontSize: 11, color: '#999' }}>{description}</span>
        ) : undefined
      }
      validateStatus={error ? 'error' : undefined}
    >
      <Input.TextArea
        value={text}
        rows={lines}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={
          placeholder
            ? `示例：\n${typeof placeholder === 'string' ? placeholder : JSON.stringify(placeholder, null, 2)}`
            : '{}'
        }
        style={{ fontFamily: 'monospace', fontSize: 12 }}
      />
      <Space.Compact style={{ marginTop: 6, width: '100%' }}>
        <Button size='small' onClick={handleFormat} disabled={!!error}>
          格式化
        </Button>
        <Button
          size='small'
          onClick={() => {
            setDraft('');
            setError(null);
            onChange(undefined);
          }}
        >
          清空
        </Button>
      </Space.Compact>
    </Form.Item>
  );
}

export const codeEditorWidget = CodeEditor;
