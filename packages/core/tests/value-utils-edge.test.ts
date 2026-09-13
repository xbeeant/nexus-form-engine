/**
 * value-utils - 通用值操作工具边界条件测试
 * 验证 isThenable / toBoolean / isExpressionString / omitNilDeep 等边界场景
 */

import { describe, expect, it } from 'vitest';
import {
  getPathValue,
  isDeepEqual,
  isEmptyValue,
  isExpressionString,
  isThenable,
  omitNilDeep,
  setPathValue,
  toBoolean,
} from '../src/utils/value-utils';

// ============================================================================
// isEmptyValue
// ============================================================================

describe('isEmptyValue', () => {
  it('undefined 返回 true', () => {
    expect(isEmptyValue(undefined)).toBe(true);
  });

  it('null 返回 true', () => {
    expect(isEmptyValue(null)).toBe(true);
  });

  it('空字符串返回 true', () => {
    expect(isEmptyValue('')).toBe(true);
  });

  it('空数组返回 true', () => {
    expect(isEmptyValue([])).toBe(true);
  });

  it('非空字符串返回 false', () => {
    expect(isEmptyValue('hello')).toBe(false);
  });

  it('0 返回 false', () => {
    expect(isEmptyValue(0)).toBe(false);
  });

  it('false 返回 false', () => {
    expect(isEmptyValue(false)).toBe(false);
  });

  it('非空数组返回 false', () => {
    expect(isEmptyValue([0])).toBe(false);
    expect(isEmptyValue([null])).toBe(false);
  });

  it('对象返回 false', () => {
    expect(isEmptyValue({})).toBe(false);
    expect(isEmptyValue({ a: 1 })).toBe(false);
  });
});

// ============================================================================
// getPathValue
// ============================================================================

describe('getPathValue', () => {
  it('读取简单路径', () => {
    expect(getPathValue({ a: 1 }, 'a')).toBe(1);
  });

  it('读取嵌套路径', () => {
    const obj = { a: { b: { c: 'deep' } } };
    expect(getPathValue(obj, 'a.b.c')).toBe('deep');
  });

  it('源对象为 undefined 返回 undefined', () => {
    expect(getPathValue(undefined, 'a')).toBeUndefined();
  });

  it('源对象为 null 返回 undefined', () => {
    expect(getPathValue(null as any, 'a')).toBeUndefined();
  });

  it('路径中某段为 null 返回 undefined', () => {
    const obj = { a: null };
    expect(getPathValue(obj, 'a.b')).toBeUndefined();
  });

  it('路径中某段为 undefined 返回 undefined', () => {
    const obj = { a: undefined };
    expect(getPathValue(obj, 'a.b')).toBeUndefined();
  });

  it('路径中某段是非对象返回 undefined', () => {
    const obj = { a: 42 };
    expect(getPathValue(obj, 'a.b')).toBeUndefined();
  });

  it('路径不存在返回 undefined', () => {
    expect(getPathValue({ a: 1 }, 'nonexistent')).toBeUndefined();
  });

  it('空路径：split 产生 [""], 取 obj[""] 为 undefined', () => {
    const obj = { a: 1, b: 2 };
    // split('') 产生 [''], 取 obj[''] → undefined
    expect(getPathValue(obj, '')).toBeUndefined();
  });

  it('读取数组索引路径', () => {
    const obj = { items: [{ name: 'a' }, { name: 'b' }] };
    expect(getPathValue(obj, 'items.0.name')).toBe('a');
  });
});

// ============================================================================
// setPathValue
// ============================================================================

describe('setPathValue', () => {
  it('设置简单路径', () => {
    const obj: Record<string, unknown> = {};
    setPathValue(obj, 'a', 1);
    expect(obj).toEqual({ a: 1 });
  });

  it('设置嵌套路径自动创建中间对象', () => {
    const obj: Record<string, unknown> = {};
    setPathValue(obj, 'a.b.c', 'deep');
    expect(obj).toEqual({ a: { b: { c: 'deep' } } });
  });

  it('覆盖已存在的路径值', () => {
    const obj: Record<string, unknown> = { a: { b: 'old' } };
    setPathValue(obj, 'a.b', 'new');
    expect(obj).toEqual({ a: { b: 'new' } });
  });

  it('路径中间段已有值但类型不匹配时覆盖为对象', () => {
    const obj: Record<string, unknown> = { a: 'string' };
    setPathValue(obj, 'a.b', 'new');
    expect(obj).toEqual({ a: { b: 'new' } });
  });

  it('单段路径直接设置', () => {
    const obj: Record<string, unknown> = {};
    setPathValue(obj, 'name', 'John');
    expect(obj).toEqual({ name: 'John' });
  });
});

// ============================================================================
// isDeepEqual
// ============================================================================

describe('isDeepEqual', () => {
  it('原始值直接比较', () => {
    expect(isDeepEqual(1, 1)).toBe(true);
    expect(isDeepEqual('a', 'a')).toBe(true);
    expect(isDeepEqual(true, true)).toBe(true);
    expect(isDeepEqual(1, 2)).toBe(false);
  });

  it('引用相等返回 true', () => {
    const obj = { a: 1 };
    expect(isDeepEqual(obj, obj)).toBe(true);
  });

  it('不同类型返回 false', () => {
    expect(isDeepEqual(1, '1')).toBe(false);
    expect(isDeepEqual(true, 1)).toBe(false);
  });

  it('null vs null 返回 true（Object.is 先拦截）', () => {
    expect(isDeepEqual(null, null)).toBe(true);
  });

  it('Date 按时间戳比较', () => {
    const d1 = new Date(2024, 0, 1);
    const d2 = new Date(2024, 0, 1);
    const d3 = new Date(2024, 1, 1);
    expect(isDeepEqual(d1, d2)).toBe(true);
    expect(isDeepEqual(d1, d3)).toBe(false);
  });

  it('Date vs 非 Date 返回 false', () => {
    expect(isDeepEqual(new Date(2024, 0, 1), '2024-01-01')).toBe(false);
  });

  it('数组深比较', () => {
    expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('嵌套数组深比较', () => {
    expect(
      isDeepEqual(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [1, 2],
          [3, 4],
        ],
      ),
    ).toBe(true);
    expect(
      isDeepEqual(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [1, 2],
          [3, 5],
        ],
      ),
    ).toBe(false);
  });

  it('对象深比较', () => {
    expect(isDeepEqual({ a: 1, b: 'hello' }, { a: 1, b: 'hello' })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('不同键数的对象返回 false', () => {
    expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('嵌套对象深比较', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(isDeepEqual(obj, { a: { b: { c: 1 } } })).toBe(true);
    expect(isDeepEqual(obj, { a: { b: { c: 2 } } })).toBe(false);
  });

  it('数组 vs 对象返回 false', () => {
    expect(isDeepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('undefined vs null 返回 false', () => {
    // Object.is(undefined, null) → false → typeof 不同 → false
    expect(isDeepEqual(undefined, null)).toBe(false);
  });
});

// ============================================================================
// isThenable
// ============================================================================

describe('isThenable', () => {
  it('Promise 返回 true', () => {
    expect(isThenable(new Promise(() => {}))).toBe(true);
  });

  it('thenable 对象返回 true', () => {
    expect(isThenable({ then: () => {} })).toBe(true);
  });

  it('null 返回 false', () => {
    expect(isThenable(null)).toBe(false);
  });

  it('undefined 返回 false', () => {
    expect(isThenable(undefined)).toBe(false);
  });

  it('普通对象返回 false', () => {
    expect(isThenable({})).toBe(false);
    expect(isThenable({ a: 1 })).toBe(false);
  });

  it('函数返回 false', () => {
    // 函数有 call/apply 但不是 thenable
    expect(isThenable(() => {})).toBe(false);
  });

  it('数字返回 false', () => {
    expect(isThenable(42)).toBe(false);
  });

  it('字符串返回 false', () => {
    expect(isThenable('hello')).toBe(false);
  });

  it('then 不是函数的对象返回 false', () => {
    expect(isThenable({ then: 123 })).toBe(false);
  });
});

// ============================================================================
// toBoolean
// ============================================================================

describe('toBoolean', () => {
  it('true 返回 true', () => {
    expect(toBoolean(true)).toBe(true);
  });

  it('false 返回 false', () => {
    expect(toBoolean(false)).toBe(false);
  });

  it('布尔值直接返回', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(false)).toBe(false);
  });

  it('空字符串返回 false', () => {
    expect(toBoolean('')).toBe(false);
  });

  it('false 字符串返回 false', () => {
    expect(toBoolean('false')).toBe(false);
  });

  it("'0' 字符串返回 false", () => {
    expect(toBoolean('0')).toBe(false);
  });

  it('非空字符串返回 true', () => {
    expect(toBoolean('hello')).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('1')).toBe(true);
  });

  it('0 数字返回 false', () => {
    expect(toBoolean(0)).toBe(false);
  });

  it('非零数字返回 true', () => {
    expect(toBoolean(42)).toBe(true);
  });

  it('null 返回 false', () => {
    expect(toBoolean(null)).toBe(false);
  });

  it('undefined 返回 false', () => {
    expect(toBoolean(undefined)).toBe(false);
  });
});

// ============================================================================
// isExpressionString
// ============================================================================

describe('isExpressionString', () => {
  it('完整表达式 "{{ formData.a }}" 返回 true', () => {
    expect(isExpressionString('{{ formData.a }}')).toBe(true);
  });

  it('完整表达式 "{{ formData.a * 2 }}" 返回 true', () => {
    expect(isExpressionString('{{ formData.a * 2 }}')).toBe(true);
  });

  it('完整表达式 "{{ formData.a && formData.b }}" 返回 true', () => {
    expect(isExpressionString('{{ formData.a && formData.b }}')).toBe(true);
  });

  it('多行表达式 "{{\\n  formData.a\\n}}" 返回 true', () => {
    expect(isExpressionString('{{\n  formData.a\n}}')).toBe(true);
  });

  it('静态文本返回 false', () => {
    expect(isExpressionString('hello')).toBe(false);
    expect(isExpressionString('')).toBe(false);
  });

  it('前缀 + 表达式返回 false', () => {
    expect(isExpressionString('prefix {{ formData.a }}')).toBe(false);
  });

  it('表达式 + 后缀返回 false', () => {
    expect(isExpressionString('{{ formData.a }} suffix')).toBe(false);
  });

  it('前缀 + 表达式 + 后缀返回 false', () => {
    expect(isExpressionString('a {{ formData.b }} c')).toBe(false);
  });

  it('只有 {{ 没有 }} 返回 false', () => {
    expect(isExpressionString('{{ formData.a')).toBe(false);
  });

  it('只有 }} 没有 {{ 返回 false', () => {
    expect(isExpressionString('formData.a }}')).toBe(false);
  });

  it('空表达式 "{{ }}" 返回 true', () => {
    expect(isExpressionString('{{ }}')).toBe(true);
  });

  it('非字符串返回 false', () => {
    expect(isExpressionString(123)).toBe(false);
    expect(isExpressionString(null)).toBe(false);
    expect(isExpressionString(undefined)).toBe(false);
    expect(isExpressionString({})).toBe(false);
  });
});

// ============================================================================
// omitNilDeep
// ============================================================================

describe('omitNilDeep', () => {
  it('移除 undefined / null / 空字符串', () => {
    const obj = { a: undefined, b: null, c: '', d: 'hello' };
    const result = omitNilDeep(obj);
    expect(result).toEqual({ d: 'hello' });
  });

  it('保留 0 / false / NaN', () => {
    const obj = { a: 0, b: false, c: NaN, d: 'hello' };
    const result = omitNilDeep(obj);
    expect(result).toEqual({ a: 0, b: false, c: NaN, d: 'hello' });
  });

  it('嵌套对象递归处理', () => {
    const obj = {
      a: { b: undefined, c: { d: null } },
      e: 'keep',
    };
    const result = omitNilDeep(obj);
    // a.c 虽然内层全是空值，但 a.c 本身是个对象（{} 空对象保留）
    expect(result).toEqual({
      a: {
        c: {},
      },
      e: 'keep',
    });
  });

  it('数组逐项处理，保留结构（null 项通过 map 保留在数组中）', () => {
    const arr = [{ a: 1, b: null }, { a: 2, b: undefined }, null, 'hello'];
    const result = omitNilDeep(arr);
    // 数组的 map 保留位置，null 项递归调用 omitNilDeep(null) → 返回 null
    expect(result).toEqual([{ a: 1 }, { a: 2 }, null, 'hello']);
  });

  it('纯字符串保持不变', () => {
    expect(omitNilDeep('hello')).toBe('hello');
  });

  it('纯数字保持不变', () => {
    expect(omitNilDeep(42)).toBe(42);
  });

  it('空数组返回空数组', () => {
    expect(omitNilDeep([])).toEqual([]);
  });

  it('空对象返回空对象', () => {
    expect(omitNilDeep({})).toEqual({});
  });

  it('数组中的空对象保留（内部有键但值为空会被移除）', () => {
    const arr = [{ a: undefined }];
    const result = omitNilDeep(arr);
    expect(result).toEqual([{}]);
  });
});
