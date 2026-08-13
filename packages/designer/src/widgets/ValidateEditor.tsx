// ============================================================================
// ValidateEditor — 可视化编辑 validate 校验规则
// 每行一条规则：「规则名称 + 校验表达式」（表达式需返回 boolean）
// 与 schema 的 ValidateSchema（{ key: Expression }）互相转换
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Button, Form, Input } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { ExpressionBuilder } from './ExpressionBuilder';
import { useFormDataFields } from './useFormDataFields';
import { genId } from './reactionsModel';

interface ValidateRow {
  id: string;
  key: string;
  expr: string;
}

/** ValidateSchema 对象 → 规则行 */
function validateToRows(value: unknown): ValidateRow[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).map(
    ([key, expr]) => ({ id: genId(), key, expr: String(expr ?? '') }),
  );
}

/** 规则行 → ValidateSchema 对象（空表达式 / 空 key 的行丢弃） */
function rowsToValidate(
  rows: ValidateRow[],
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    const expr = row.expr.trim();
    if (!key || !expr || expr === '{{  }}') {
      continue;
    }
    result[key] = expr;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function ValidateEditor({ value, onChange, title }: WidgetProps) {
  const fields = useFormDataFields();
  const [rows, setRows] = useState<ValidateRow[]>(() => validateToRows(value));
  const prevValueRef = useRef(value);
  // 自身 onChange 引发的 value 回传不应触发重建（否则每次输入都被重置）
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (value !== lastEmittedRef.current) {
        setRows(validateToRows(value));
      }
    }
  }, [value]);

  const commit = (next: ValidateRow[]) => {
    setRows(next);
    const emitted = rowsToValidate(next);
    lastEmittedRef.current = emitted;
    onChange(emitted);
  };

  const updateRow = (id: string, patch: Partial<ValidateRow>) => {
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    commit(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    commit([...rows, { id: genId(), key: '', expr: '{{  }}' }]);
  };

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: '#999',
            background: '#fafafa',
            border: '1px dashed #e0e0e0',
            borderRadius: 6,
            padding: '6px 8px',
            marginBottom: 4,
          }}
        >
          点击下方「添加校验规则」，组合 校验名称 + 表达式（变量 / 操作符 /
          值）。表达式需返回 boolean，可用变量：$self.value、formData。
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={row.id}
            style={{
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>
                校验规则 {i + 1}
              </span>
              <Button size='small' danger onClick={() => removeRow(row.id)}>
                删除
              </Button>
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                规则名称（key）
              </div>
              <Input
                size='small'
                placeholder='如 match / len'
                value={row.key}
                onChange={(e) => updateRow(row.id, { key: e.target.value })}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                校验表达式（需返回 boolean）
              </div>
              <ExpressionBuilder
                value={row.expr}
                onChange={(s) => updateRow(row.id, { expr: s })}
                fields={fields}
                showSelf
                placeholder='{{ $self.value.length >= 6 }}'
              />
            </div>
          </div>
        ))
      )}

      <Button size='small' type='dashed' block onClick={addRow}>
        + 添加校验规则
      </Button>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        提示：依赖字段（formData.xxx）变化时会自动联动重校验。
      </div>
    </Form.Item>
  );
}

export const validateEditorWidget = ValidateEditor;
