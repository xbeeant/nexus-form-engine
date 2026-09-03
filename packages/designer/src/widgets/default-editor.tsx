// ============================================================================
// DefaultEditor — 按字段类型编辑默认值
// string → Input, number/integer → InputNumber, boolean → Switch, object/array → JSON TextArea
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Input, InputNumber, Switch } from 'antd';

export function DefaultEditor({ value, onChange, ...rest }: WidgetProps) {
  const fieldProps = rest as Record<string, unknown>;
  const dataType = (fieldProps?.dataType as string) ?? 'string';

  if (dataType === 'boolean') {
    return (
      <div style={{ width: '100%' }}>
        <Switch checked={!!value} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (dataType === 'number' || dataType === 'integer') {
    return (
      <div style={{ width: '100%' }}>
        <InputNumber
          value={value as number}
          onChange={(v) => onChange(v ?? undefined)}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  if (dataType === 'object' || dataType === 'array') {
    const text = value !== undefined ? JSON.stringify(value, null, 2) : '';
    return (
      <div style={{ width: '100%' }}>
        <Input.TextArea
          rows={3}
          value={text}
          onChange={(e) => {
            const t = e.target.value.trim();
            if (!t) {
              onChange(undefined);
              return;
            }
            try {
              onChange(JSON.parse(t));
            } catch {
              // JSON 解析失败时不更新
            }
          }}
        />
      </div>
    );
  }

  // string
  return (
    <div style={{ width: '100%' }}>
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

export const defaultEditorWidget = DefaultEditor;
