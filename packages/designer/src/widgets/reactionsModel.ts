// ============================================================================
// reactionsModel — ReactionsEditor 的纯数据模型（无 React / DOM 依赖）
// Reaction ↔ 可编辑卡片（Card）之间的双向转换，以及补丁值解析
// ============================================================================

import type { Reaction } from '@nexus/form-engine';

export const BOOLEAN_STATE_KEYS = new Set([
  'visible',
  'hidden',
  'disabled',
  'readOnly',
  'required',
  'loading',
]);

export const PROPS_KEY = '__props';

export const STATE_KEY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '计算值（value）', value: 'value' },
  { label: '显示（visible）', value: 'visible' },
  { label: '隐藏（hidden）', value: 'hidden' },
  { label: '禁用（disabled）', value: 'disabled' },
  { label: '只读（readOnly）', value: 'readOnly' },
  { label: '必填（required）', value: 'required' },
  { label: '加载中（loading）', value: 'loading' },
  { label: '标题（title）', value: 'title' },
  { label: '描述（description）', value: 'description' },
  { label: '组件属性（props.*）', value: PROPS_KEY },
];

export interface PatchRow {
  key: string;
  value: unknown;
}

export interface Card {
  id: string;
  deps: string;
  when: string;
  fulfillEnabled: boolean;
  fulfillRows: PatchRow[];
  fulfillSchema: string;
  otherwiseEnabled: boolean;
  otherwiseRows: PatchRow[];
  otherwiseSchema: string;
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** 文本 → 补丁值：true/false 转布尔、数字转 number，其余（含 {{ }} 表达式）保留字符串 */
export function parsePatchValue(text: string): unknown {
  const t = text.trim();
  if (t === 'true') {
    return true;
  }
  if (t === 'false') {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    return Number(t);
  }
  return text;
}

export function rowsToState(
  rows: PatchRow[],
): Record<string, unknown> | undefined {
  const state: Record<string, unknown> = {};
  for (const r of rows) {
    const key = r.key.trim();
    if (!key) {
      continue;
    }
    if (r.value === undefined || r.value === '') {
      continue;
    }
    state[key] = r.value;
  }
  return Object.keys(state).length > 0 ? state : undefined;
}

export function stateToRows(state: object | undefined): PatchRow[] {
  return state
    ? Object.entries(state).map(([key, value]) => ({ key, value }))
    : [];
}

export function parseSchemaText(
  text: string,
): Record<string, unknown> | undefined {
  const t = text.trim();
  if (!t) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(t) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // 非法 JSON：忽略本次提交，等待用户修正
  }
  return undefined;
}

export function schemaToText(
  schema: Record<string, unknown> | undefined,
): string {
  if (!schema || Object.keys(schema).length === 0) {
    return '';
  }
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return '';
  }
}

export function reactionToCard(r: Reaction): Card {
  return {
    id: genId(),
    deps: (r.dependencies ?? []).join(', '),
    when: r.when ?? '',
    fulfillEnabled: !!r.fulfill,
    fulfillRows: stateToRows(r.fulfill?.state),
    fulfillSchema: schemaToText(r.fulfill?.schema),
    otherwiseEnabled: !!r.otherwise,
    otherwiseRows: stateToRows(r.otherwise?.state),
    otherwiseSchema: schemaToText(r.otherwise?.schema),
  };
}

function buildBranch(
  card: Card,
  branch: 'fulfill' | 'otherwise',
):
  | { state?: Record<string, unknown>; schema?: Record<string, unknown> }
  | undefined {
  const enabled =
    branch === 'fulfill' ? card.fulfillEnabled : card.otherwiseEnabled;
  if (!enabled) {
    return undefined;
  }
  const rows = branch === 'fulfill' ? card.fulfillRows : card.otherwiseRows;
  const schemaText =
    branch === 'fulfill' ? card.fulfillSchema : card.otherwiseSchema;
  const state = rowsToState(rows);
  const schema = parseSchemaText(schemaText);
  if (state === undefined && schema === undefined) {
    return undefined;
  }
  return {
    ...(state !== undefined ? { state } : {}),
    ...(schema !== undefined ? { schema } : {}),
  };
}

export function cardToReaction(card: Card): Reaction {
  const reaction: Reaction = {
    dependencies: card.deps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const when = card.when.trim();
  if (when) {
    reaction.when = when;
  }
  const fulfill = buildBranch(card, 'fulfill');
  const otherwise = buildBranch(card, 'otherwise');
  if (fulfill) {
    reaction.fulfill = fulfill;
  }
  if (otherwise) {
    reaction.otherwise = otherwise;
  }
  return reaction;
}

export function toManualReactions(value: unknown): Reaction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (r): r is Reaction => !!r && (r as Reaction)._autoExpr !== true,
  );
}
