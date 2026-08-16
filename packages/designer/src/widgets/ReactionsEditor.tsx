// ============================================================================
// ReactionsEditor — 可视化编辑 reactions 联动规则
// 对应 schema 节点的 reactions 数组（Reaction 协议，见 core/types/schema.ts）：
//   { dependencies, when?, fulfill?: { state?, schema? }, otherwise?: { state?, schema? } }
// - _autoExpr 自动生成的 reaction（来自 required/hidden/disabled/readOnly 表达式）
//   不可在此编辑（解析时会自动重建），仅展示数量提示
// - 纯数据转换在 ./reactionsModel 中（可单测）
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Button, Form, Input, Select, Switch } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { ExpressionBuilder } from './ExpressionBuilder';
import {
  BOOLEAN_STATE_KEYS,
  type Card,
  cardToReaction,
  genId,
  type PatchRow,
  PROPS_KEY,
  parsePatchValue,
  reactionToCard,
  STATE_KEY_OPTIONS,
  toManualReactions,
} from './reactionsModel';
import {
  useFormDataFieldOptions,
  useFormDataFields,
} from './useFormDataFields';

function depsCountOf(deps: string): number {
  return deps
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length;
}

// ────────────────────────────────────────────────────────────────────────────
// InsertVariableSelect — 向文本中追加一个变量表达式（用于值型补丁）
// ────────────────────────────────────────────────────────────────────────────

function InsertVariableSelect({
  fields,
  fieldOptions,
  depsCount,
  onInsert,
}: {
  fields: string[];
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
  onInsert: (text: string) => void;
}) {
  const base =
    fieldOptions && fieldOptions.length > 0
      ? fieldOptions
      : fields.map((f) => ({ value: f, label: f }));
  const options = [
    ...base.map((o) => ({ value: `formData.${o.value}`, label: o.label })),
    { value: '$self.value', label: '$self.value' },
    ...(depsCount > 0
      ? Array.from({ length: depsCount }, (_, i) => ({
          value: `$deps[${i}]`,
          label: `$deps[${i}]`,
        }))
      : []),
    { value: '$index', label: '$index' },
    { value: 'rootValue', label: 'rootValue' },
  ];
  return (
    <Select
      size='small'
      placeholder='插入变量'
      value={undefined}
      onChange={(v) => {
        if (v) {
          onInsert(v as string);
        }
      }}
      options={options}
      style={{ width: 104 }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PatchValueInput — 单条状态补丁的值编辑器
// 布尔型状态 key：静态 Switch ⇄ 表达式 Input；其余 key：文本 Input
// ────────────────────────────────────────────────────────────────────────────

function PatchValueInput({
  rowKey,
  value,
  onChange,
  fields,
  fieldOptions,
  depsCount,
}: {
  rowKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  fields: string[];
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
}) {
  const booleanish = BOOLEAN_STATE_KEYS.has(rowKey);
  const isExpr = typeof value === 'string' && value.trim().startsWith('{{');

  if (booleanish) {
    if (isExpr) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ExpressionBuilder
            value={value as string}
            onChange={(s) => onChange(s)}
            fields={fields}
            fieldOptions={fieldOptions}
            depsCount={depsCount}
            emitEmpty='empty'
          />
          <div>
            <Button
              size='small'
              type='text'
              onClick={() => onChange(false)}
              style={{ fontSize: 11, padding: '0 4px', height: 'auto' }}
            >
              改为静态
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Switch checked={!!value} onChange={(v) => onChange(v)} />
        <Button size='small' onClick={() => onChange('{{  }}')}>
          表达式
        </Button>
      </div>
    );
  }

  const insertVariable = (v: string) => {
    const trimmed = String(value ?? '').trim();
    if (
      typeof value === 'string' &&
      value.trim().startsWith('{{') &&
      value.trim().endsWith('}}')
    ) {
      const inner = value.trim().slice(2, -2).trim();
      onChange(`{{ ${inner} ${v} }}`);
      return;
    }
    onChange(parsePatchValue(trimmed ? `${trimmed} ${v}` : v));
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
      <Input
        size='small'
        value={String(value ?? '')}
        onChange={(e) => onChange(parsePatchValue(e.target.value))}
        style={{ flex: 1 }}
      />
      <InsertVariableSelect
        fields={fields}
        fieldOptions={fieldOptions}
        depsCount={depsCount}
        onInsert={insertVariable}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ReactionsEditor — 主组件（本地工作副本 + 每次编辑提交，避免受控重置）
// ────────────────────────────────────────────────────────────────────────────

export function ReactionsEditor({ value, onChange, title }: WidgetProps) {
  const [cards, setCards] = useState<Card[]>(() =>
    toManualReactions(value).map(reactionToCard),
  );
  const prevValueRef = useRef(value);
  // 记录最近一次由本组件 emit 出去的值：自身 onChange 引发的 value 回传
  // （引擎值更新 → value prop 更新）不应触发「外部 value 变化重置」，
  // 否则点击「添加联动规则」后，undefined → [] 的值变化会立刻清空本地卡片。
  const lastEmittedRef = useRef<unknown>(value);

  // 外部 value 变化（切换节点 / 属性表单重新初始化）时重置工作副本
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (value !== lastEmittedRef.current) {
        setCards(toManualReactions(value).map(reactionToCard));
      }
    }
  }, [value]);

  const commit = (next: Card[]) => {
    setCards(next);
    const reactions = next
      .map(cardToReaction)
      .filter((r) => r.dependencies.length > 0 || r.fulfill || r.otherwise);
    const emitted = reactions.length > 0 ? reactions : [];
    lastEmittedRef.current = emitted;
    onChange(emitted);
  };

  const updateCard = (index: number, patch: Partial<Card>) => {
    commit(cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeCard = (index: number) => {
    commit(cards.filter((_, i) => i !== index));
  };

  const addCard = () => {
    commit([
      ...cards,
      {
        id: genId(),
        deps: '',
        when: '',
        fulfillEnabled: true,
        fulfillRows: [],
        fulfillSchema: '',
        otherwiseEnabled: false,
        otherwiseRows: [],
        otherwiseSchema: '',
      },
    ]);
  };

  const autoExprCount = Array.isArray(value)
    ? value.filter(
        (r) => !!r && (r as { _autoExpr?: boolean })._autoExpr === true,
      ).length
    : 0;

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      {autoExprCount > 0 && (
        <div
          style={{
            fontSize: 11,
            color: '#999',
            marginBottom: 8,
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            padding: '4px 8px',
          }}
        >
          另有 {autoExprCount} 条由 required / hidden / disabled / readOnly
          表达式自动生成的联动（_autoExpr），请通过「通用属性 / 校验配置」编辑。
        </div>
      )}

      {cards.map((card, cardIndex) => (
        <ReactionCard
          key={card.id}
          card={card}
          index={cardIndex}
          onChange={updateCard}
          onRemove={removeCard}
        />
      ))}

      <Button size='small' type='dashed' block onClick={addCard}>
        + 添加联动规则
      </Button>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        依赖字段值变化时触发本规则。可用变量：$deps（按 dependencies
        顺序）、$self.value、formData。满足 when（可选）执行 fulfill，否则执行
        otherwise。
      </div>
    </Form.Item>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ReactionCard — 单条联动规则
// ────────────────────────────────────────────────────────────────────────────

function ReactionCard({
  card,
  index,
  onChange,
  onRemove,
}: {
  card: Card;
  index: number;
  onChange: (index: number, patch: Partial<Card>) => void;
  onRemove: (index: number) => void;
}) {
  const fields = useFormDataFields();
  const fieldOptions = useFormDataFieldOptions();
  const depsCount = depsCountOf(card.deps);
  const depsTags = card.deps
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
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
          联动 {index + 1}
        </span>
        <Button size='small' danger onClick={() => onRemove(index)}>
          删除
        </Button>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
          依赖字段（dependencies）
        </div>
        <Select
          size='small'
          mode='tags'
          value={depsTags}
          onChange={(tags) => onChange(index, { deps: tags.join(', ') })}
          options={fieldOptions}
          placeholder='选择或输入依赖字段'
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
          条件（when，可选）
        </div>
        <ExpressionBuilder
          value={card.when}
          onChange={(s) => onChange(index, { when: s })}
          fields={fields}
          fieldOptions={fieldOptions}
          depsCount={depsCount}
          emitEmpty='empty'
          placeholder='{{ $deps[0] === true }}'
        />
      </div>

      <BranchEditor
        title='满足时（fulfill）'
        enabled={card.fulfillEnabled}
        rows={card.fulfillRows}
        schemaText={card.fulfillSchema}
        fields={fields}
        fieldOptions={fieldOptions}
        depsCount={depsCount}
        onToggle={(v) => onChange(index, { fulfillEnabled: v })}
        onRows={(rows) => onChange(index, { fulfillRows: rows })}
        onSchema={(t) => onChange(index, { fulfillSchema: t })}
      />

      <BranchEditor
        title='不满足时（otherwise）'
        enabled={card.otherwiseEnabled}
        rows={card.otherwiseRows}
        schemaText={card.otherwiseSchema}
        fields={fields}
        fieldOptions={fieldOptions}
        depsCount={depsCount}
        onToggle={(v) => onChange(index, { otherwiseEnabled: v })}
        onRows={(rows) => onChange(index, { otherwiseRows: rows })}
        onSchema={(t) => onChange(index, { otherwiseSchema: t })}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BranchEditor — fulfill / otherwise 分支：状态补丁 + 属性补丁
// ────────────────────────────────────────────────────────────────────────────

function BranchEditor({
  title,
  enabled,
  rows,
  schemaText,
  fields,
  fieldOptions,
  depsCount,
  onToggle,
  onRows,
  onSchema,
}: {
  title: string;
  enabled: boolean;
  rows: PatchRow[];
  schemaText: string;
  fields: string[];
  fieldOptions?: Array<{ value: string; label: string }>;
  depsCount: number;
  onToggle: (enabled: boolean) => void;
  onRows: (rows: PatchRow[]) => void;
  onSchema: (text: string) => void;
}) {
  const updateRow = (idx: number, patch: Partial<PatchRow>) => {
    onRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    onRows([...rows, { key: 'required', value: true }]);
  };

  const removeRow = (idx: number) => {
    onRows(rows.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, color: '#666' }}>{title}</span>
        <Switch size='small' checked={enabled} onChange={(v) => onToggle(v)} />
      </div>

      {enabled && (
        <>
          {rows.map((row, idx) => (
            <div
              key={`${idx}-${row.key}`}
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <PatchKeySelect
                row={row}
                onChange={(key) => updateRow(idx, { key })}
              />
              <div style={{ flex: 1 }}>
                <PatchValueInput
                  rowKey={row.key}
                  value={row.value}
                  onChange={(v) => updateRow(idx, { value: v })}
                  fields={fields}
                  fieldOptions={fieldOptions}
                  depsCount={depsCount}
                />
              </div>
              <Button size='small' onClick={() => removeRow(idx)}>
                ×
              </Button>
            </div>
          ))}
          <Button
            size='small'
            block
            style={{ marginBottom: 4 }}
            onClick={addRow}
          >
            + 添加状态项
          </Button>

          <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
            属性补丁（schema，JSON，可选）
          </div>
          <Input.TextArea
            size='small'
            rows={2}
            placeholder={'{\n  "props.options": [...]\n}'}
            value={schemaText}
            onChange={(e) => onSchema(e.target.value)}
          />
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PatchKeySelect — 状态补丁的 key 选择器（含 props.* 自定义路径）
// ────────────────────────────────────────────────────────────────────────────

function PatchKeySelect({
  row,
  onChange,
}: {
  row: PatchRow;
  onChange: (key: string) => void;
}) {
  const isProps = row.key.startsWith('props.');
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <Select
        size='small'
        value={isProps ? PROPS_KEY : row.key}
        options={STATE_KEY_OPTIONS}
        onChange={(k) => onChange(k === PROPS_KEY ? 'props.' : k)}
        style={{ width: 132 }}
      />
      {isProps && (
        <Input
          size='small'
          placeholder='如 options'
          value={row.key.slice('props.'.length)}
          onChange={(e) => onChange(`props.${e.target.value}`)}
          style={{ width: 96 }}
        />
      )}
    </div>
  );
}

export const reactionsEditorWidget = ReactionsEditor;
