import { describe, expect, it } from 'vitest';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  formatFieldValue,
  getEmptyField,
  getEmptyItem,
  getEmptyObject,
  getEmptyValue,
  inferWidget,
} from '../src/widgets/_list-shared';

describe('arrayAdd', () => {
  it('追加元素返回新数组', () => {
    const arr = [1, 2];
    const result = arrayAdd(arr, 3);
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(arr);
  });

  it('空数组追加', () => {
    expect(arrayAdd([], 'a')).toEqual(['a']);
  });

  it('追加对象', () => {
    const obj = { name: 'test' };
    const result = arrayAdd([], obj);
    expect(result).toContainEqual(obj);
  });
});

describe('arrayRemove', () => {
  it('移除指定索引元素', () => {
    expect(arrayRemove([1, 2, 3], 1)).toEqual([1, 3]);
  });

  it('移除首元素', () => {
    expect(arrayRemove([1, 2, 3], 0)).toEqual([2, 3]);
  });

  it('移除末元素', () => {
    expect(arrayRemove([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it('返回新数组', () => {
    const arr = [1, 2];
    const result = arrayRemove(arr, 0);
    expect(result).not.toBe(arr);
  });
});

describe('arrayMove', () => {
  it('正常移动元素', () => {
    expect(arrayMove(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('前移', () => {
    expect(arrayMove(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('越界 to < 0 返回原数组', () => {
    const arr = [1, 2, 3];
    expect(arrayMove(arr, 1, -1)).toBe(arr);
  });

  it('越界 to >= length 返回原数组', () => {
    const arr = [1, 2, 3];
    expect(arrayMove(arr, 1, 3)).toBe(arr);
  });

  it('from 越界时 splice 行为：插入 undefined', () => {
    // arrayMove 只保护 to 边界，不保护 from；from 越界时 splice 返回空，插入 undefined
    expect(arrayMove([1, 2, 3], 10, 1)).toEqual([1, undefined, 2, 3]);
  });
});

describe('arrayCopy', () => {
  it('复制对象并插入', () => {
    const item = { name: 'test' };
    const result = arrayCopy([{ id: 1 }, item], 1);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual(item);
    expect(result[2]).not.toBe(item);
  });

  it('越界索引返回原数组', () => {
    const arr = [1, 2, 3];
    expect(arrayCopy(arr, 10)).toBe(arr);
  });

  it('复制 undefined 项返回原数组', () => {
    const arr = [1, 2, 3];
    arr[5] = undefined;
    expect(arrayCopy(arr, 5)).toBe(arr);
  });

  it('结构化深拷贝嵌套对象', () => {
    const nested = { a: { b: { c: 1 } } };
    const result = arrayCopy([nested], 0);
    result[1].a.b.c = 99;
    expect(nested.a.b.c).toBe(1);
  });

  it('数组项不深拷贝', () => {
    const arr = [[1, 2]];
    const result = arrayCopy(arr, 0);
    expect(result[1]).toEqual([1, 2]);
  });
});

describe('getEmptyValue', () => {
  it('string 返回空字符串', () => {
    expect(getEmptyValue('string')).toBe('');
  });

  it('number 返回 undefined', () => {
    expect(getEmptyValue('number')).toBeUndefined();
  });

  it('integer 返回 undefined', () => {
    expect(getEmptyValue('integer')).toBeUndefined();
  });

  it('boolean 返回 false', () => {
    expect(getEmptyValue('boolean')).toBe(false);
  });

  it('未知类型返回 undefined', () => {
    expect(getEmptyValue('unknown')).toBeUndefined();
  });

  it('undefined 类型返回 undefined', () => {
    expect(getEmptyValue(undefined)).toBeUndefined();
  });
});

describe('getEmptyField', () => {
  it('优先使用 default 值', () => {
    expect(getEmptyField({ type: 'string', default: 'hello' })).toBe('hello');
  });

  it('无 default 按 type 推断', () => {
    expect(getEmptyField({ type: 'string', widget: 'input' })).toBe('');
    expect(getEmptyField({ type: 'number', widget: 'input' })).toBeUndefined();
    expect(getEmptyField({ type: 'boolean', widget: 'switch' })).toBe(false);
  });
});

describe('getEmptyObject', () => {
  it('遍历 properties 生成空对象', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, widget: 'input' as const },
        age: { type: 'number' as const, widget: 'input-number' as const },
        active: { type: 'boolean' as const, widget: 'switch' as const },
      },
    };
    const result = getEmptyObject(schema);
    expect(result).toEqual({ name: '', age: undefined, active: false });
  });

  it('无 widget 的纯 type 节点使用 getEmptyValue', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        field: { type: 'string' as const },
      },
    };
    expect(getEmptyObject(schema)).toEqual({ field: '' });
  });

  it('null/undefined 节点跳过', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        valid: { type: 'string' as const, widget: 'input' as const },
        invalid: null,
      },
    };
    const result = getEmptyObject(schema as never);
    expect(result.valid).toBe('');
    expect(result.invalid).toBeUndefined();
  });
});

describe('getEmptyItem', () => {
  it('items 为 undefined 返回空字符串', () => {
    expect(getEmptyItem(undefined)).toBe('');
  });

  it('items.type === object 调用 getEmptyObject', () => {
    const items = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, widget: 'input' as const },
      },
    };
    const result = getEmptyItem(items);
    expect(result).toEqual({ name: '' });
  });

  it('items 为 field schema 调用 getEmptyField', () => {
    const items = { type: 'string' as const, widget: 'input' as const };
    expect(getEmptyItem(items)).toBe('');
  });

  it('items 有 default 时返回 default', () => {
    const items = {
      type: 'string' as const,
      widget: 'input' as const,
      default: 'default value',
    };
    expect(getEmptyItem(items)).toBe('default value');
  });
});

describe('inferWidget', () => {
  it('优先使用 widget 字段', () => {
    expect(inferWidget({ widget: 'custom' })).toBe('custom');
  });

  it('number 类型推断为 number', () => {
    expect(inferWidget({ type: 'number' })).toBe('number');
  });

  it('integer 类型推断为 number', () => {
    expect(inferWidget({ type: 'integer' })).toBe('number');
  });

  it('boolean 类型推断为 switch', () => {
    expect(inferWidget({ type: 'boolean' })).toBe('switch');
  });

  it('string + date format 推断为 date', () => {
    expect(inferWidget({ type: 'string', format: 'date' })).toBe('date');
  });

  it('string + date-time format 推断为 date', () => {
    expect(inferWidget({ type: 'string', format: 'date-time' })).toBe('date');
  });

  it('string + textarea format 推断为 textarea', () => {
    expect(inferWidget({ type: 'string', format: 'textarea' })).toBe(
      'textarea',
    );
  });

  it('默认推断为 input', () => {
    expect(inferWidget({ type: 'string' })).toBe('input');
  });

  it('无类型无格式默认 input', () => {
    expect(inferWidget({})).toBe('input');
  });
});

describe('formatFieldValue', () => {
  it('undefined/null/空值返回 -', () => {
    expect(formatFieldValue(undefined)).toBe('-');
    expect(formatFieldValue(null)).toBe('-');
    expect(formatFieldValue('')).toBe('-');
  });

  it('enum/enumNames 查找文案', () => {
    expect(
      formatFieldValue(1, {
        enum: [1, 2],
        enumNames: ['男', '女'],
        type: 'number',
      }),
    ).toBe('男');
  });

  it('enum 不在列表中返回原始值', () => {
    expect(
      formatFieldValue(3, {
        enum: [1, 2],
        enumNames: ['男', '女'],
        type: 'number',
      }),
    ).toBe('3');
  });

  it('boolean 返回 是/否', () => {
    expect(formatFieldValue(true)).toBe('是');
    expect(formatFieldValue(false)).toBe('否');
  });

  it('数组值 join', () => {
    expect(formatFieldValue(['a', 'b'])).toBe('a, b');
  });

  it('数字返回值', () => {
    expect(formatFieldValue(42)).toBe('42');
  });

  it('字符串返回值', () => {
    expect(formatFieldValue('hello')).toBe('hello');
  });
});
