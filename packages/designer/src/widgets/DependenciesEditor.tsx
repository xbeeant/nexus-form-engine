// ============================================================================
// DependenciesEditor — 编辑 dependencies 依赖字段路径（string[]）
// 使用 TextArea，每行一个路径，与 string[] 互相转换
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Form, Input } from 'antd';
import { useEffect, useRef, useState } from 'react';

/** string[] → 每行一个路径的文本 */
function depsToText(value: unknown): string {
  return Array.isArray(value) ? value.join('\n') : '';
}

/** 多行文本 → string[]（空则 undefined） */
function textToDeps(text: string): string[] | undefined {
  const deps = text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return deps.length > 0 ? deps : undefined;
}

export function DependenciesEditor({ value, onChange, title }: WidgetProps) {
  // 本地维护文本：textToDeps 在文本为空时返回 undefined，直接派生受控 value
  // 会导致清空后重置回原值，无法输入。改为本地缓存 + 有效解析时同步提交。
  const [text, setText] = useState(() => depsToText(value));
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setText(depsToText(value));
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = textToDeps(raw);
    if (parsed) {
      onChange(parsed);
    }
  };

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      <Input.TextArea
        rows={3}
        placeholder={'每行一个依赖字段路径\n如：password\n如：user.city'}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        提示：依赖字段值变化时，触发该字段重新求值与渲染
      </div>
    </Form.Item>
  );
}

export const dependenciesEditorWidget = DependenciesEditor;
