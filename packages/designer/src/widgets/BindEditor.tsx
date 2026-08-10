// ============================================================================
// BindEditor — 编辑 bind 属性（路径映射）
// 支持四种模式：无/字符串/数组/false，不同模式显示不同的子控件
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Form, Input, Select } from 'antd';
import { useState } from 'react';

function getBindMode(value: unknown): string {
  if (value === false || value === 'false') {
    return 'false';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'string' && value.length > 0) {
    return 'string';
  }
  return 'none';
}

const BIND_MODE_OPTIONS = [
  { value: 'none', label: '无（使用字段路径）' },
  { value: 'string', label: '字符串路径' },
  { value: 'array', label: '字符串数组（多路径拆分）' },
  { value: 'false', label: '不绑定（不提交）' },
];

export function BindEditor({ value, onChange, title }: WidgetProps) {
  const mode = getBindMode(value);
  // 本地状态缓存文本值，防止每次按键都触发 onChange
  const [textValue, setTextValue] = useState<string>(
    Array.isArray(value)
      ? (value as string[]).join('\n')
      : typeof value === 'string'
        ? value
        : '',
  );

  const handleModeChange = (newMode: string) => {
    if (newMode === 'none') {
      onChange(undefined);
      setTextValue('');
    } else if (newMode === 'string') {
      onChange('');
      setTextValue('');
    } else if (newMode === 'array') {
      onChange([]);
      setTextValue('');
    } else if (newMode === 'false') {
      onChange(false);
      setTextValue('');
    }
  };

  const handleTextCommit = () => {
    if (mode === 'string') {
      onChange(textValue || undefined);
    } else if (mode === 'array') {
      const lines = textValue
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      onChange(lines.length > 0 ? lines : undefined);
    }
  };

  return (
    <Form.Item label={title} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Select
          value={mode}
          options={BIND_MODE_OPTIONS}
          onChange={handleModeChange}
          style={{ width: '100%' }}
        />
        {mode === 'string' && (
          <Input
            placeholder='如: user.name'
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextCommit}
            onPressEnter={handleTextCommit}
          />
        )}
        {mode === 'array' && (
          <Input.TextArea
            rows={3}
            placeholder={'如: a.b\nc.d'}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextCommit}
          />
        )}
        <div style={{ fontSize: 11, color: '#999' }}>
          提示：bind 将字段值映射到不同数据路径。string[]
          表示字段值数组按顺序拆分到多个路径；false 表示字段不参与提交。
        </div>
      </div>
    </Form.Item>
  );
}

export const bindEditorWidget = BindEditor;
