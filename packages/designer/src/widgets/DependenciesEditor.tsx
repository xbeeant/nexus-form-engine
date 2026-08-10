// ============================================================================
// DependenciesEditor — 编辑 dependencies 依赖字段路径（string[]）
// 使用 TextArea，每行一个路径，与 string[] 互相转换
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Form, Input } from 'antd';

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
  const text = depsToText(value);

  return (
    <Form.Item label={title} style={{ width: '100%' }}>
      <Input.TextArea
        rows={3}
        placeholder={'每行一个依赖字段路径\n如：password\n如：user.city'}
        value={text}
        onChange={(e) => onChange(textToDeps(e.target.value))}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        提示：依赖字段值变化时，触发该字段重新求值与渲染
      </div>
    </Form.Item>
  );
}

export const dependenciesEditorWidget = DependenciesEditor;
