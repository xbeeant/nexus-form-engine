import { describe, expect, it } from 'vitest';
import { extractDepsFromExpression } from '../src/schema-parser';

describe('extractDepsFromExpression edge cases', () => {
  it('handles indexOf', () => {
    expect(extractDepsFromExpression("formData.name.indexOf('a')")).toEqual([
      'name',
    ]);
  });

  it('handles trim', () => {
    expect(
      extractDepsFromExpression("formData.name.trim() === 'hello'"),
    ).toEqual(['name']);
  });

  it('handles chain: trim().length', () => {
    // trim().length → name
    expect(
      extractDepsFromExpression('formData.name.trim().length > 5'),
    ).toEqual(['name']);
  });

  it('handles includes with unicode', () => {
    expect(
      extractDepsFromExpression("formData.implType.includes('关联附件')"),
    ).toEqual(['implType']);
  });

  it('handles simple comparison', () => {
    expect(extractDepsFromExpression("formData.name === 'hello'")).toEqual([
      'name',
    ]);
  });

  it('handles optional chaining', () => {
    expect(extractDepsFromExpression("formData.user?.name === 'a'")).toEqual([
      'user.name',
    ]);
  });

  it('handles multiple deps', () => {
    expect(extractDepsFromExpression('formData.a === formData.b')).toEqual([
      'a',
      'b',
    ]);
  });

  it('handles concat', () => {
    expect(extractDepsFromExpression("formData.list.concat(['x'])")).toEqual([
      'list',
    ]);
  });

  it('handles some', () => {
    expect(
      extractDepsFromExpression('formData.items.some(i => i > 0)'),
    ).toEqual(['items']);
  });

  it('handles map', () => {
    expect(
      extractDepsFromExpression(
        'formData.names.map(String.prototype.toString)',
      ),
    ).toEqual(['names']);
  });

  // 回归：方法调用前多段可选链 + Unicode 字符串字面量
  // 之前 bug：去方法名后只剥掉末尾 `?`，中间的 `?.` 残留，
  // 提取出 `demand_definition?.requirement_definition_v2`，
  // 依赖图 key 与真实 formData 路径不一致，导致联动永远不触发。
  it('strips all optional chaining from method-call path (multi-segment + unicode)', () => {
    expect(
      extractDepsFromExpression(
        "formData?.demand_definition?.requirement_definition_v2?.includes('完成需求定义')",
      ),
    ).toEqual(['demand_definition.requirement_definition_v2']);
  });

  it('strips all optional chaining even with single identifier + method', () => {
    expect(
      extractDepsFromExpression("formData?.implType?.includes('关联附件')"),
    ).toEqual(['implType']);
  });

  it('strips trailing ? on non-method path', () => {
    // 防御：即便 `field?.` 后没方法调用，残留 `?` 也应被清掉
    expect(extractDepsFromExpression('formData?.user?.name')).toEqual([
      'user.name',
    ]);
  });
});
