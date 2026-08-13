// ============================================================================
// ValidateEditor — 编辑 validate 校验表达式
// 使用 TextArea，每行格式为 "key = expression"
// 与 schema 的 ValidateSchema（{ key: Expression }）互相转换
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Form, Input } from 'antd';
import { useEffect, useRef, useState } from 'react';

/** ValidateSchema 对象 → "key = expression" 多行文本 */
function validateToText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k} = ${String(v)}`)
    .join('\n');
}

/** "key = expression" 多行文本 → ValidateSchema 对象（空则 undefined） */
function textToValidate(text: string): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const expr = trimmed.slice(idx + 1).trim();
    if (key) {
      result[key] = expr;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function ValidateEditor({ value, onChange, title }: WidgetProps) {
  // 本地维护文本，避免「每次按键解析 → 解析结果回写 → 派生文本」的受控重置：
  // textToValidate 在表达式尚未出现 '=' 时返回 undefined，若直接派生受控 value，
  // 每次按键都会被重置回原值，导致无法输入。改为本地缓存 + 有效解析时同步提交。
  const [text, setText] = useState(() => validateToText(value));
  const prevValueRef = useRef(value);

  // 外部 value 变化（切换节点 / 属性表单重新初始化）时重置本地文本
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setText(validateToText(value));
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = textToValidate(raw);
    if (parsed) {
      onChange(parsed);
    }
  };

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      <Input.TextArea
        rows={4}
        placeholder={
          '每行一个：key = 表达式\nmatch = {{ $self.value === formData.password }}\nlen = {{ $self.value.length >= 6 }}'
        }
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        提示：表达式需返回 boolean。可用变量：$self.value、formData
      </div>
    </Form.Item>
  );
}

export const validateEditorWidget = ValidateEditor;
