// ============================================================================
// ExpressionBuilder — 可视化表达式构建器
// 通过「变量 + 操作符 + 值」的条件行交互生成 `{{ ... }}` 布尔表达式，
// 避免手写表达式。保留「高级表达式」原始编辑回退（解析失败时自动进入）。
//
// 状态策略：本地工作副本（conditions/raw）为唯一编辑源，每次编辑即提交；
// 用 lastEmittedRef 跳过「自身 onChange → 引擎值回传」造成的受控重置，
// 外部 value 变化（切换节点等）才重建工作副本。
// ============================================================================

import { Button, Input, InputNumber, Select } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildExpression,
  type ConditionOperator,
  createCondition,
  type ExprCondition,
  NO_RIGHT_OPERATORS,
  OPERATOR_OPTIONS,
  parseExpression,
  parseVariable,
  RIGHT_MODE_OPTIONS,
  type RightMode,
  stripBraces,
  variableToString,
} from './expressionModel';

// ────────────────────────────────────────────────────────────────────────────
// VariableSelect — 变量选择器（表单字段 + 快捷变量）
// ────────────────────────────────────────────────────────────────────────────

interface VariableSelectProps {
  value: string;
  onChange: (text: string) => void;
  fields: string[];
  /** 可选字段标题列表（显示 title，值为路径 key）；缺省时退化为 path 即 label */
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
  showSelf: boolean;
  placeholder?: string;
}

function VariableSelect({
  value,
  onChange,
  fields,
  fieldOptions,
  depsCount,
  showSelf,
  placeholder,
}: VariableSelectProps) {
  const groups = useMemo(() => {
    const base = fieldOptions && fieldOptions.length > 0 ? fieldOptions : fields.map((f) => ({ value: f, label: f }));
    const fieldOptions2 = base.map((o) => ({
      value: `formData.${o.value}`,
      label: o.label,
    }));
    const special: Array<{ value: string; label: string }> = [];
    if (showSelf) {
      special.push({
        value: '$self.value',
        label: '当前字段值（$self.value）',
      });
    }
    if (depsCount > 0) {
      for (let i = 0; i < depsCount; i++) {
        special.push({
          value: `$deps[${i}]`,
          label: `依赖 ${i + 1}（$deps[${i}]）`,
        });
      }
    }
    special.push({ value: '$index', label: '列表下标（$index）' });
    special.push({ value: 'rootValue', label: '根值（rootValue）' });
    return [
      ...(fieldOptions2.length > 0
        ? [{ label: '表单字段', options: fieldOptions2 }]
        : []),
      ...(special.length > 0 ? [{ label: '快捷变量', options: special }] : []),
    ];
  }, [fields, fieldOptions, depsCount, showSelf]);

  return (
    <Select
      size='small'
      showSearch
      allowClear
      value={value || undefined}
      placeholder={placeholder ?? '选择变量'}
      onChange={(v) => onChange((v as string) || '')}
      options={groups}
      filterOption={(input, option) =>
        ((option?.label as string) || '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 条件行编辑
// ────────────────────────────────────────────────────────────────────────────

function RightValueEditor({
  mode,
  value,
  onChange,
  fields,
  fieldOptions,
  depsCount,
  showSelf,
}: {
  mode: RightMode;
  value: string;
  onChange: (right: string) => void;
  fields: string[];
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
  showSelf: boolean;
}) {
  if (mode === 'boolean') {
    return (
      <Select
        size='small'
        value={value === 'true' ? 'true' : 'false'}
        onChange={(v) => onChange((v as string) || 'false')}
        options={[
          { value: 'true', label: 'true' },
          { value: 'false', label: 'false' },
        ]}
        style={{ width: 72 }}
      />
    );
  }
  if (mode === 'variable') {
    return (
      <div style={{ flex: 1, minWidth: 100 }}>
        <VariableSelect
          value={value}
          onChange={onChange}
          fields={fields}
          fieldOptions={fieldOptions}
          depsCount={depsCount}
          showSelf={showSelf}
          placeholder='选择值变量'
        />
      </div>
    );
  }
  if (mode === 'number') {
    return (
      <InputNumber
        size='small'
        value={value === '' ? undefined : Number(value)}
        onChange={(v) => onChange(v == null ? '' : String(v))}
        placeholder='数字'
        style={{ flex: 1, minWidth: 80 }}
      />
    );
  }
  return (
    <Input
      size='small'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder='文本'
      style={{ flex: 1, minWidth: 80 }}
    />
  );
}

function ConditionRow({
  condition,
  isFirst,
  fields,
  fieldOptions,
  depsCount,
  showSelf,
  onChange,
  onRemove,
}: {
  condition: ExprCondition;
  isFirst: boolean;
  fields: string[];
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
  showSelf: boolean;
  onChange: (patch: Partial<ExprCondition>) => void;
  onRemove: () => void;
}) {
  const needRight = !NO_RIGHT_OPERATORS.has(condition.operator);

  const handleOperator = (op: ConditionOperator) => {
    onChange({
      operator: op,
      ...(NO_RIGHT_OPERATORS.has(op) ? { right: '' } : {}),
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
        flexWrap: 'wrap',
      }}
    >
      {isFirst ? (
        <span
          style={{
            width: 44,
            fontSize: 11,
            color: '#999',
            flexShrink: 0,
            textAlign: 'center',
          }}
        >
          当
        </span>
      ) : (
        <Select
          size='small'
          value={condition.logic}
          onChange={(v) => onChange({ logic: v as 'and' | 'or' })}
          options={[
            { value: 'and', label: '且' },
            { value: 'or', label: '或' },
          ]}
          style={{ width: 44, flexShrink: 0 }}
        />
      )}

      <div style={{ flex: '1 1 110px', minWidth: 110 }}>
        <VariableSelect
          value={variableToString(condition.variable)}
          onChange={(text) => onChange({ variable: parseVariable(text) })}
          fields={fields}
          fieldOptions={fieldOptions}
          depsCount={depsCount}
          showSelf={showSelf}
        />
      </div>

      <Select
        size='small'
        value={condition.operator}
        onChange={handleOperator}
        options={OPERATOR_OPTIONS}
        style={{ width: 92, flexShrink: 0 }}
      />

      {needRight && (
        <>
          <Select
            size='small'
            value={condition.rightMode}
            onChange={(v) => onChange({ rightMode: v as RightMode })}
            options={RIGHT_MODE_OPTIONS}
            style={{ width: 56, flexShrink: 0 }}
          />
          <div style={{ flex: '1 1 80px', minWidth: 80 }}>
            <RightValueEditor
              mode={condition.rightMode}
              value={condition.right}
              onChange={(right) => onChange({ right })}
              fields={fields}
              fieldOptions={fieldOptions}
              depsCount={depsCount}
              showSelf={showSelf}
            />
          </div>
        </>
      )}

      <Button
        size='small'
        type='text'
        onClick={onRemove}
        style={{ flexShrink: 0, color: '#bbb' }}
        title='删除条件'
      >
        ×
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ExpressionBuilder — 主组件
// ────────────────────────────────────────────────────────────────────────────

export interface ExpressionBuilderProps {
  value?: string;
  onChange: (next: string) => void;
  /** 可选表单字段路径（formData.<path>） */
  fields?: string[];
  /** 可选字段标题列表（显示 title，值为路径 key）；缺省时表单字段退化为 path 即 label */
  fieldOptions?: Array<{ value: string; label: string }>;
  /** 渲染 $deps[0..depsCount-1] 快捷变量 */
  depsCount?: number;
  showSelf?: boolean;
  /** 条件全部移除时的提交值：template=保持表达式模式（{{  }}），empty=清空（''） */
  emitEmpty?: 'template' | 'empty';
  /** 是否显示「高级表达式」原始编辑入口 */
  allowAdvanced?: boolean;
  placeholder?: string;
}

function getInitMode(value: string | undefined): 'builder' | 'raw' {
  if (typeof value !== 'string' || !value.trim()) {
    return 'builder';
  }
  return parseExpression(value) === null ? 'raw' : 'builder';
}

function getInitConditions(value: string | undefined): ExprCondition[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  const parsed = parseExpression(value);
  return parsed === null ? [] : parsed;
}

function getInitRaw(value: string | undefined): string {
  return typeof value === 'string' ? stripBraces(value) : '';
}

export function ExpressionBuilder({
  value,
  onChange,
  fields = [],
  fieldOptions,
  depsCount = 0,
  showSelf = true,
  emitEmpty = 'template',
  allowAdvanced = true,
  placeholder = "{{ formData.xxx == 'yyy' }}",
}: ExpressionBuilderProps) {
  const [mode, setMode] = useState<'builder' | 'raw'>(() => getInitMode(value));
  const [conditions, setConditions] = useState<ExprCondition[]>(() =>
    getInitConditions(value),
  );
  const [raw, setRaw] = useState<string>(() => getInitRaw(value));
  const lastEmittedRef = useRef<string>(typeof value === 'string' ? value : '');

  // 外部 value 变化（切换节点 / 属性表单重新初始化）时重建工作副本；
  // 自身 onChange 引起的值回传不重置（lastEmittedRef 相等时跳过）
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = typeof value === 'string' ? value : '';
      const parsed = typeof value === 'string' ? parseExpression(value) : [];
      setConditions(parsed === null ? [] : parsed);
      setMode(parsed === null ? 'raw' : 'builder');
      setRaw(typeof value === 'string' ? stripBraces(value) : '');
    }
  }, [value]);

  const emitBuilder = (next: ExprCondition[]) => {
    setConditions(next);
    const expr = buildExpression(next);
    const out = expr === '{{  }}' && emitEmpty === 'empty' ? '' : expr;
    lastEmittedRef.current = out;
    onChange(out);
  };

  const emitRaw = (text: string) => {
    setRaw(text);
    lastEmittedRef.current = text;
    onChange(text);
  };

  const switchToRaw = () => {
    setRaw(typeof value === 'string' ? stripBraces(value) : '');
    setMode('raw');
  };

  const switchToBuilder = () => {
    const parsed = parseExpression(raw);
    if (parsed === null) {
      return;
    }
    setConditions(parsed);
    setMode('builder');
  };

  const updateCondition = (id: string, patch: Partial<ExprCondition>) => {
    emitBuilder(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCondition = (id: string) => {
    emitBuilder(conditions.filter((c) => c.id !== id));
  };

  const addCondition = () => {
    emitBuilder([...conditions, createCondition()]);
  };

  const rawParseFailed =
    mode === 'raw' && raw.trim() !== '' && parseExpression(raw) === null;

  return (
    <div style={{ width: '100%' }}>
      {mode === 'builder' ? (
        <>
          {conditions.length === 0 ? (
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
              点击下方「添加条件」组合 变量 / 操作符 / 值 生成表达式。
            </div>
          ) : (
            conditions.map((c, i) => (
              <ConditionRow
                key={c.id}
                condition={c}
                isFirst={i === 0}
                fields={fields}
                fieldOptions={fieldOptions}
                depsCount={depsCount}
                showSelf={showSelf}
                onChange={(patch) => updateCondition(c.id, patch)}
                onRemove={() => removeCondition(c.id)}
              />
            ))
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <Button size='small' type='dashed' onClick={addCondition}>
              + 添加条件
            </Button>
            {allowAdvanced && (
              <Button
                size='small'
                type='link'
                onClick={switchToRaw}
                style={{ padding: '0 4px', height: 'auto', fontSize: 11 }}
              >
                高级表达式
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <Input.TextArea
            rows={2}
            size='small'
            value={raw}
            onChange={(e) => emitRaw(e.target.value)}
            placeholder={placeholder}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: rawParseFailed ? '#ff4d4f' : '#999',
              }}
            >
              {rawParseFailed
                ? '当前表达式无法结构化，可继续手动编辑或点击返回'
                : '表达式需返回 boolean，变量仅限 $deps / $self / $form / $index / formData / rootValue'}
            </span>
            {allowAdvanced && (
              <Button
                size='small'
                type='link'
                onClick={switchToBuilder}
                style={{ padding: '0 4px', height: 'auto', fontSize: 11 }}
                disabled={rawParseFailed}
              >
                返回可视化
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
