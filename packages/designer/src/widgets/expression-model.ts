// ============================================================================
// expressionModel — 可视化表达式构建器的纯数据模型（无 React / DOM 依赖）
// 负责 ExprCondition 行模型 ⇄ `{{ ... }}` 表达式字符串的双向转换
// ============================================================================
//
// 构建：行模型 → 表达式（buildExpression）
// 解析：表达式 → 行模型（parseExpression，尽力而为）
// 解析失败时返回 null，由调用方回退到「高级模式」原始表达式编辑，保证不丢数据。

// ────────────────────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────────────────────

/** 变量来源 */
export type VariableSource =
  | 'formData'
  | 'self'
  | 'deps'
  | 'index'
  | 'root'
  | 'raw';

export interface ExprVariable {
  source: VariableSource;
  /** formData: 点分字段路径；deps: 下标字符串；raw: 自定义表达式片段 */
  path: string;
}

/** 右侧值模式 */
export type RightMode = 'string' | 'number' | 'boolean' | 'variable';

/** 操作符 */
export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'empty'
  | 'notEmpty'
  | 'truthy'
  | 'falsy';

export interface ExprCondition {
  id: string;
  /** 与上一条条件的连接关系（首条忽略） */
  logic: 'and' | 'or';
  variable: ExprVariable;
  operator: ConditionOperator;
  rightMode: RightMode;
  /** 右侧值：string/number 为字面量文本，boolean 为 'true'/'false'，variable 为变量表达式 */
  right: string;
}

/** 操作符文案选项 */
export const OPERATOR_OPTIONS: Array<{
  label: string;
  value: ConditionOperator;
}> = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '以…开头', value: 'startsWith' },
  { label: '以…结尾', value: 'endsWith' },
  { label: '为空', value: 'empty' },
  { label: '不为空', value: 'notEmpty' },
  { label: '为真', value: 'truthy' },
  { label: '为假', value: 'falsy' },
];

/** 无需右侧值的操作符 */
export const NO_RIGHT_OPERATORS = new Set<ConditionOperator>([
  'empty',
  'notEmpty',
  'truthy',
  'falsy',
]);

export const RIGHT_MODE_OPTIONS: Array<{ label: string; value: RightMode }> = [
  { label: '文本', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '变量', value: 'variable' },
];

export function genConditionId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** 创建一个空条件行 */
export function createCondition(): ExprCondition {
  return {
    id: genConditionId(),
    logic: 'and',
    variable: { source: 'formData', path: '' },
    operator: 'eq',
    rightMode: 'string',
    right: '',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 变量文本化 / 解析
// ────────────────────────────────────────────────────────────────────────────

const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/** 点分路径 → 安全访问器（非标识符片段用 ['...'] 包裹） */
function toAccessor(path: string): string {
  if (!path) {
    return '';
  }
  return path
    .split('.')
    .map((seg) => (IDENT_RE.test(seg) ? `.${seg}` : `['${seg}']`))
    .join('');
}

/** ExprVariable → 表达式文本 */
export function variableToString(v: ExprVariable): string {
  switch (v.source) {
    case 'formData':
      return `formData${toAccessor(v.path)}`;
    case 'self':
      return '$self.value';
    case 'deps':
      return `$deps[${v.path}]`;
    case 'index':
      return '$index';
    case 'root':
      return 'rootValue';
    case 'raw':
      return v.path;
  }
}

/** 从访问器后缀解析出路径段（'.a' / "['b']" 混合形式） */
function parseAccessorSuffix(suffix: string): string {
  const segments: string[] = [];
  const re = /\.([a-zA-Z_$][a-zA-Z0-9_$]*)|\[\s*'([^']*)'\s*\]/g;
  let m = re.exec(suffix);
  while (m !== null) {
    segments.push(m[1] ?? m[2]);
    m = re.exec(suffix);
  }
  return segments.join('.');
}

/** 表达式文本 → ExprVariable；无法识别时回退为 raw */
export function parseVariable(text: string): ExprVariable {
  const t = text.trim();
  if (t === '$self.value' || t === '$self') {
    return { source: 'self', path: '' };
  }
  const depsMatch = /^\$deps\[\s*(\d+)\s*\]$/.exec(t);
  if (depsMatch) {
    return { source: 'deps', path: depsMatch[1] };
  }
  if (t === '$index') {
    return { source: 'index', path: '' };
  }
  if (t === 'rootValue') {
    return { source: 'root', path: '' };
  }
  if (t.startsWith('formData')) {
    return {
      source: 'formData',
      path: parseAccessorSuffix(t.slice('formData'.length)),
    };
  }
  return { source: 'raw', path: t };
}

/**
 * 严格解析「简单变量」（仅白名单变量源，不含任意表达式片段）
 * 用于解析已有表达式时约束左右操作数，无法识别返回 null（→ 回退高级模式）
 */
export function parseSimpleVariable(text: string): ExprVariable | null {
  const t = text.trim();
  if (t === '$self.value') {
    return { source: 'self', path: '' };
  }
  const depsMatch = /^\$deps\[\s*(\d+)\s*\]$/.exec(t);
  if (depsMatch) {
    return { source: 'deps', path: depsMatch[1] };
  }
  if (t === '$index') {
    return { source: 'index', path: '' };
  }
  if (t === 'rootValue') {
    return { source: 'root', path: '' };
  }
  if (t.startsWith('formData') && t !== 'formData') {
    const v = parseVariable(t);
    if (v.source === 'formData' && v.path) {
      return v;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// 右侧值格式化
// ────────────────────────────────────────────────────────────────────────────

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function unescapeString(s: string): string {
  return s.replace(/\\(['\\])/g, '$1');
}

/** 根据 rightMode 生成右侧 JS 值文本 */
export function formatRightValue(mode: RightMode, raw: string): string {
  switch (mode) {
    case 'string':
      return `'${escapeString(raw)}'`;
    case 'number': {
      const t = raw.trim();
      return /^-?\d+(\.\d+)?$/.test(t) ? t : '0';
    }
    case 'boolean':
      return raw === 'true' ? 'true' : 'false';
    case 'variable':
      return raw.trim();
  }
}

/** 解析右侧 JS 值 → { mode, raw } */
export function parseRightValue(text: string): {
  mode: RightMode;
  raw: string;
} {
  const t = text.trim();
  if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") {
    return { mode: 'string', raw: unescapeString(t.slice(1, -1)) };
  }
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
    return { mode: 'string', raw: unescapeString(t.slice(1, -1)) };
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    return { mode: 'number', raw: t };
  }
  if (t === 'true' || t === 'false') {
    return { mode: 'boolean', raw: t };
  }
  return { mode: 'variable', raw: t };
}

// ────────────────────────────────────────────────────────────────────────────
// 构建表达式
// ────────────────────────────────────────────────────────────────────────────

const JS_OP: Record<string, string> = {
  eq: '===',
  neq: '!==',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

const LOGIC_JS: Record<'and' | 'or', string> = { and: '&&', or: '||' };

function conditionToExpression(c: ExprCondition): string {
  const left = variableToString(c.variable);
  const op = c.operator;
  if (op === 'truthy') {
    return `!!(${left})`;
  }
  if (op === 'falsy') {
    return `!(${left})`;
  }
  if (op === 'empty') {
    return `(${left} == null || String(${left}).trim() === '')`;
  }
  if (op === 'notEmpty') {
    return `(${left} != null && String(${left}).trim() !== '')`;
  }
  const right = formatRightValue(c.rightMode, c.right);
  switch (op) {
    case 'contains':
      return `String(${left}).includes(${right})`;
    case 'notContains':
      return `!String(${left}).includes(${right})`;
    case 'startsWith':
      return `String(${left}).startsWith(${right})`;
    case 'endsWith':
      return `String(${left}).endsWith(${right})`;
    default:
      return `${left} ${JS_OP[op] ?? '==='} ${right}`;
  }
}

/** 条件行是否完整（变量已填，需要右值时右值已填） */
export function isConditionComplete(c: ExprCondition): boolean {
  if (c.variable.source === 'raw') {
    if (!c.variable.path.trim()) {
      return false;
    }
  } else if (c.variable.source === 'formData' && !c.variable.path.trim()) {
    return false;
  }
  if (NO_RIGHT_OPERATORS.has(c.operator)) {
    return true;
  }
  if (c.rightMode === 'variable') {
    return c.right.trim().length > 0;
  }
  return c.rightMode === 'boolean' || c.right.trim().length > 0;
}

/**
 * 行模型 → `{{ ... }}` 表达式
 * - 无完整条件时返回空模板 `{{  }}`（保持表达式模式）
 */
export function buildExpression(conditions: ExprCondition[]): string {
  const valid = conditions.filter(isConditionComplete);
  if (valid.length === 0) {
    return '{{  }}';
  }
  let expr = conditionToExpression(valid[0]);
  for (let i = 1; i < valid.length; i++) {
    expr = `${expr} ${LOGIC_JS[valid[i].logic]} ${conditionToExpression(valid[i])}`;
  }
  return `{{ ${expr} }}`;
}

// ────────────────────────────────────────────────────────────────────────────
// 解析表达式
// ────────────────────────────────────────────────────────────────────────────

/** 去掉 `{{ }}` 包裹 */
export function stripBraces(expr: string): string {
  const t = expr.trim();
  if (t.startsWith('{{') && t.endsWith('}}')) {
    return t.slice(2, -2).trim();
  }
  return t;
}

/** 按顶层 `&&` / `||` 切分（忽略引号与括号内的连接符） */
function splitTopLevel(
  text: string,
): Array<{ logic: 'and' | 'or'; text: string }> {
  const parts: Array<{ logic: 'and' | 'or'; text: string }> = [];
  let depth = 0;
  let quote: "'" | '"' | null = null;
  let buffer = '';
  let nextLogic: 'and' | 'or' = 'and';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      buffer += ch;
      if (ch === '\\') {
        buffer += text[i + 1] ?? '';
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      buffer += ch;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      buffer += ch;
      continue;
    }
    if (depth === 0 && (ch === '&' || ch === '|')) {
      const op = text.slice(i, i + 2);
      if (op === '&&' || op === '||') {
        const trimmed = buffer.trim();
        if (trimmed) {
          parts.push({ logic: nextLogic, text: trimmed });
        }
        nextLogic = op === '&&' ? 'and' : 'or';
        buffer = '';
        i++;
        continue;
      }
    }
    buffer += ch;
  }
  const trimmed = buffer.trim();
  if (trimmed) {
    parts.push({ logic: nextLogic, text: trimmed });
  }
  return parts;
}

function parseAtomic(text: string): ExprCondition | null {
  const t = text.trim();

  const truthy = /^!!\(\s*(.+)\s*\)$/.exec(t);
  if (truthy) {
    const variable = parseSimpleVariable(truthy[1]);
    if (!variable) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: 'truthy',
      rightMode: 'string',
      right: '',
    };
  }
  const falsy = /^!\(\s*(.+)\s*\)$/.exec(t);
  if (falsy) {
    const variable = parseSimpleVariable(falsy[1]);
    if (!variable) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: 'falsy',
      rightMode: 'string',
      right: '',
    };
  }

  const empty =
    /^\(\s*(.+?)\s*== null \|\| String\(\s*(.+?)\s*\)\.trim\(\) === ''\)$/.exec(
      t,
    );
  if (empty) {
    const variable = parseSimpleVariable(empty[1]);
    if (!variable) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: 'empty',
      rightMode: 'string',
      right: '',
    };
  }
  const notEmpty =
    /^\(\s*(.+?)\s*!= null && String\(\s*(.+?)\s*\)\.trim\(\) !== ''\)$/.exec(
      t,
    );
  if (notEmpty) {
    const variable = parseSimpleVariable(notEmpty[1]);
    if (!variable) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: 'notEmpty',
      rightMode: 'string',
      right: '',
    };
  }

  const stringCall =
    /^(!?)String\(\s*(.+?)\s*\)\.(includes|startsWith|endsWith)\(\s*(.+?)\s*\)$/.exec(
      t,
    );
  if (stringCall) {
    const variable = parseSimpleVariable(stringCall[2]);
    if (!variable) {
      return null;
    }
    const negated = stringCall[1] === '!';
    const rawOp = stringCall[3] as 'includes' | 'startsWith' | 'endsWith';
    const opMap: Record<string, ConditionOperator> = {
      includes: negated ? 'notContains' : 'contains',
      startsWith: 'startsWith',
      endsWith: 'endsWith',
    };
    const { mode, raw } = parseRightValue(stringCall[4]);
    if (mode === 'variable' && !parseSimpleVariable(raw)) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: opMap[rawOp],
      rightMode: mode,
      right: raw,
    };
  }

  const cmp = /^\s*(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+?)\s*$/.exec(t);
  if (cmp) {
    const variable = parseSimpleVariable(cmp[1]);
    if (!variable) {
      return null;
    }
    const opMap: Record<string, ConditionOperator> = {
      '===': 'eq',
      '==': 'eq',
      '!==': 'neq',
      '!=': 'neq',
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte',
    };
    const { mode, raw } = parseRightValue(cmp[3]);
    if (mode === 'variable' && !parseSimpleVariable(raw)) {
      return null;
    }
    return {
      id: genConditionId(),
      logic: 'and',
      variable,
      operator: opMap[cmp[2]],
      rightMode: mode,
      right: raw,
    };
  }

  return null;
}

/**
 * 表达式字符串 → 行模型
 * - 空 / 空模板 → []
 * - 无法解析 → null（调用方回退「高级模式」）
 */
export function parseExpression(expr: unknown): ExprCondition[] | null {
  if (typeof expr !== 'string') {
    return [];
  }
  const inner = stripBraces(expr);
  if (!inner) {
    return [];
  }
  const parts = splitTopLevel(inner);
  if (parts.length === 0) {
    return [];
  }
  const conditions: ExprCondition[] = [];
  for (const part of parts) {
    const parsed = parseAtomic(part.text);
    if (!parsed) {
      return null;
    }
    parsed.logic = part.logic;
    conditions.push(parsed);
  }
  return conditions;
}
