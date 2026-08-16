// ============================================================================
// OptionsEditor — 编辑选项列表（区分 value 与 label）
// 供 select / radio / checkboxes / multiSelect / checkbox / switch 等
// 选择类组件在属性面板中配置选项：
//   每行 = 选项值（value，存储进 formData）+ 选项文案（label，界面展示）
// value 支持字符串，'true'/'false' 自动转为布尔值（checkbox/switch 用）
// 值格式：Array<{ value: unknown; label: string }>
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Button, Input, Space } from 'antd';
import { useMemo } from 'react';

interface OptionRow {
  value: unknown;
  label: string;
}

/** 归一化：兼容字符串数组（value=label）与 { value, label } 对象数组 */
const toRows = (value: unknown): OptionRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      return {
        value: rec.value,
        label: rec.label == null ? '' : String(rec.label),
      };
    }
    return { value: item, label: String(item) };
  });
};

/** 输入回写：'true'/'false' → 布尔，其余保留字符串 */
const parseValue = (raw: string): unknown => {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  return raw;
};

export function OptionsEditor({ value, onChange }: WidgetProps) {
  const rows = useMemo(() => toRows(value), [value]);

  const emit = (next: OptionRow[]) => onChange(next);

  const setRow = (index: number, patch: Partial<OptionRow>) => {
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    emit([...rows, { value: '', label: '' }]);
  };

  const removeRow = (index: number) => {
    emit(rows.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  };

  return (
    <div style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <Input
            size='small'
            value={row.value == null ? '' : String(row.value)}
            placeholder='选项值 value'
            onChange={(e) =>
              setRow(index, { value: parseValue(e.target.value) })
            }
          />
          <Input
            size='small'
            value={row.label}
            placeholder='选项文案 label'
            onChange={(e) => setRow(index, { label: e.target.value })}
          />
          <Space.Compact>
            <Button
              size='small'
              type='text'
              disabled={index === 0}
              onClick={() => moveRow(index, -1)}
            >
              ↑
            </Button>
            <Button
              size='small'
              type='text'
              disabled={index === rows.length - 1}
              onClick={() => moveRow(index, 1)}
            >
              ↓
            </Button>
            <Button
              size='small'
              type='text'
              danger
              onClick={() => removeRow(index)}
            >
              ✕
            </Button>
          </Space.Compact>
        </div>
      ))}
      <Button size='small' type='dashed' block onClick={addRow}>
        + 添加选项
      </Button>
      {rows.length === 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
          value 为存入 formData 的选项值，label 为界面展示文案，每行一组
        </div>
      )}
    </div>
  );
}

export const optionsEditorWidget = OptionsEditor;
