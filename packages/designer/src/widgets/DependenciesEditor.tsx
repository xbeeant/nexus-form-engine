// ============================================================================
// DependenciesEditor — 编辑 dependencies 依赖字段路径（string[]）
// 通过标签选择器从表单字段中选择依赖路径，也支持手动输入自定义路径
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Form, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useFormDataFieldOptions } from './useFormDataFields';

export function DependenciesEditor({ value, onChange, title }: WidgetProps) {
  const fieldOptions = useFormDataFieldOptions();
  const [tags, setTags] = useState<string[]>(() =>
    Array.isArray(value) ? [...value] : [],
  );
  const prevValueRef = useRef(value);
  const lastEmittedRef = useRef(value);

  // 外部 value 变化（切换节点等）时重置，自身 onChange 回传不重置
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (value !== lastEmittedRef.current) {
        setTags(Array.isArray(value) ? [...value] : []);
      }
    }
  }, [value]);

  const commit = (next: string[]) => {
    setTags(next);
    lastEmittedRef.current = next;
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      <Select
        size='small'
        mode='tags'
        value={tags}
        onChange={(v) =>
          commit((v as string[]).map((s) => s.trim()).filter(Boolean))
        }
        options={fieldOptions}
        placeholder='选择或输入依赖字段路径'
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        提示：依赖字段值变化时，触发该字段重新求值与渲染。支持相对路径（如 处于
        address.city 时填 province 表示 address.province）。
      </div>
    </Form.Item>
  );
}

export const dependenciesEditorWidget = DependenciesEditor;
