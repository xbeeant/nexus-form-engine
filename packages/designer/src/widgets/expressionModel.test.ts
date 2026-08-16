import type { NexusSchema } from '@xbeeant/form-engine';
import { describe, expect, it } from 'vitest';
import { collectDataFieldPaths } from '../schemaUtils';
import {
  buildExpression,
  type ConditionOperator,
  parseExpression,
  parseVariable,
  stripBraces,
  variableToString,
} from './expressionModel';

describe('buildExpression', () => {
  it('构建基本比较表达式（文本 / 数字 / 布尔 / 变量右值）', () => {
    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'formData', path: 'usePromo' },
          operator: 'eq',
          rightMode: 'boolean',
          right: 'true',
        },
      ]),
    ).toBe('{{ formData.usePromo === true }}');

    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'formData', path: 'amount' },
          operator: 'gte',
          rightMode: 'number',
          right: '100',
        },
      ]),
    ).toBe('{{ formData.amount >= 100 }}');

    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'self', path: '' },
          operator: 'neq',
          rightMode: 'string',
          right: 'special',
        },
      ]),
    ).toBe("{{ $self.value !== 'special' }}");

    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'formData', path: 'amount' },
          operator: 'eq',
          rightMode: 'variable',
          right: 'formData.limit',
        },
      ]),
    ).toBe('{{ formData.amount === formData.limit }}');
  });

  it('空右值 / 未选变量视为不完整条件，返回空模板', () => {
    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'formData', path: '' },
          operator: 'eq',
          rightMode: 'string',
          right: 'x',
        },
      ]),
    ).toBe('{{  }}');

    expect(
      buildExpression([
        {
          id: '1',
          logic: 'and',
          variable: { source: 'formData', path: 'a' },
          operator: 'eq',
          rightMode: 'string',
          right: '',
        },
      ]),
    ).toBe('{{  }}');
  });

  it('无条件时返回空模板', () => {
    expect(buildExpression([])).toBe('{{  }}');
  });

  it('按 and/or 连接多条条件', () => {
    const cond = (op: 'eq' | 'neq', right: string) => ({
      id: Math.random().toString(),
      logic: 'and' as const,
      variable: { source: 'formData' as const, path: 'a' },
      operator: op,
      rightMode: 'string' as const,
      right,
    });
    const c1 = { ...cond('eq', 'x'), id: '1' };
    const c2 = { ...cond('neq', 'y'), id: '2', logic: 'or' as const };
    expect(buildExpression([c1, c2])).toBe(
      "{{ formData.a === 'x' || formData.a !== 'y' }}",
    );
  });

  it('contains / startsWith / empty / truthy 等操作符', () => {
    const base = (operator: ConditionOperator, right = '') => ({
      id: '1',
      logic: 'and' as const,
      variable: { source: 'formData' as const, path: 'code' },
      operator,
      rightMode: 'string' as const,
      right,
    });
    expect(buildExpression([base('contains', 'CN')])).toBe(
      "{{ String(formData.code).includes('CN') }}",
    );
    expect(buildExpression([base('notEmpty')])).toBe(
      "{{ (formData.code != null && String(formData.code).trim() !== '') }}",
    );
    expect(buildExpression([base('truthy')])).toBe('{{ !!(formData.code) }}');
  });
});

describe('parseExpression', () => {
  it('解析基本表达式为行模型', () => {
    const conds = parseExpression('{{ formData.usePromo === true }}');
    expect(conds).not.toBeNull();
    expect(conds![0]).toMatchObject({
      variable: { source: 'formData', path: 'usePromo' },
      operator: 'eq',
      rightMode: 'boolean',
      right: 'true',
    });
  });

  it('解析 $deps / $self / 文本字面量', () => {
    const conds = parseExpression('{{ $deps[0] === true }}');
    expect(conds![0].variable).toEqual({ source: 'deps', path: '0' });

    const self = parseExpression("{{ $self.value === 'x' }}");
    expect(self![0].variable).toEqual({ source: 'self', path: '' });
    expect(self![0].rightMode).toBe('string');
    expect(self![0].right).toBe('x');
  });

  it('解析 and/or 连接', () => {
    const conds = parseExpression(
      "{{ formData.a === 'x' && formData.b > 3 || formData.c == 'y' }}",
    );
    expect(conds!.length).toBe(3);
    expect(conds![0].logic).toBe('and');
    expect(conds![1].logic).toBe('and');
    expect(conds![2].logic).toBe('or');
  });

  it('解析空模板 / 空串为 []', () => {
    expect(parseExpression('{{  }}')).toEqual([]);
    expect(parseExpression('')).toEqual([]);
    expect(parseExpression(undefined)).toEqual([]);
  });

  it('无法解析的表达式返回 null（回退高级模式）', () => {
    expect(parseExpression('{{ formData.a.toUpperCase() }}')).toBeNull();
    expect(parseExpression('{{ $deps[0] + 1 > 2 }}')).toBeNull();
  });

  it('round-trip：build → parse → build 保持一致', () => {
    const src = "{{ formData.a === 'x' || formData.b >= 3 }}";
    const conds = parseExpression(src)!;
    expect(conds.length).toBe(2);
    const rebuilt = buildExpression(conds);
    expect(rebuilt).toBe(src);
  });
});

describe('变量工具', () => {
  it('stripBraces 去除包裹', () => {
    expect(stripBraces('{{ a === 1 }}')).toBe('a === 1');
    expect(stripBraces('a === 1')).toBe('a === 1');
  });

  it('variableToString 各来源', () => {
    expect(variableToString({ source: 'formData', path: 'user.name' })).toBe(
      'formData.user.name',
    );
    expect(variableToString({ source: 'deps', path: '2' })).toBe('$deps[2]');
    expect(variableToString({ source: 'self', path: '' })).toBe('$self.value');
    expect(variableToString({ source: 'index', path: '' })).toBe('$index');
    expect(variableToString({ source: 'root', path: '' })).toBe('rootValue');
  });

  it('parseVariable 非标识符字段用括号访问', () => {
    expect(parseVariable("formData['a-b']")).toEqual({
      source: 'formData',
      path: 'a-b',
    });
    expect(variableToString(parseVariable("formData['a-b']"))).toBe(
      "formData['a-b']",
    );
  });
});

describe('collectDataFieldPaths', () => {
  it('布局节点 Key 不进路径，对象 / 数组透传', () => {
    const schema = {
      type: 'object',
      properties: {
        card: {
          type: 'card',
          title: '卡片',
          properties: {
            name: { type: 'string', widget: 'input', title: '姓名' },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string', widget: 'input' },
              },
            },
            tags: {
              type: 'array',
              widget: 'list',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', widget: 'input' },
                },
              },
            },
          },
        },
      },
    } as unknown as NexusSchema;

    expect(collectDataFieldPaths(schema)).toEqual([
      'name',
      'address.city',
      'tags',
      'tags[0].label',
    ]);
  });

  it('子表单（带 widget 的 object）视为叶子字段', () => {
    const schema = {
      type: 'object',
      properties: {
        sub: { type: 'object', widget: 'subForm', properties: {} },
      },
    } as unknown as NexusSchema;
    expect(collectDataFieldPaths(schema)).toEqual(['sub']);
  });
});
