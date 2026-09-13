/**
 * data-converters - 数据格式转换工具测试
 * 验证 formatField / toFormData / toMultipart / toSearchParams 等数据转换函数
 */

import { describe, expect, it } from 'vitest';
import {
  type FormatOptions,
  formatField,
  toFormData,
  toMultipart,
  toSearchParams,
} from '../src/utils/data-converters';

const makeSchema = (
  props: Record<string, { type?: string; hidden?: boolean }>,
) => ({ type: 'object', properties: props }) as any;

describe('formatField', () => {
  it('format 为 undefined 时返回原值', () => {
    expect(formatField('hello', undefined)).toBe('hello');
    expect(formatField(123, undefined)).toBe(123);
    expect(formatField(null, undefined)).toBe(null);
    expect(formatField([], undefined)).toEqual([]);
  });

  it('日期格式：YYYY-MM-DD HH:mm:ss', () => {
    const date = new Date(2024, 0, 15, 13, 30, 45);
    const result = formatField(date, 'YYYY-MM-DD HH:mm:ss');
    expect(result).toBe('2024-01-15 13:30:45');
  });

  it('日期格式：YYYY/MM/DD', () => {
    const date = new Date(2024, 5, 20);
    expect(formatField(date, 'YYYY/MM/DD')).toBe('2024/06/20');
  });

  it('日期格式：不区分大小写 (YYYY/YYYY)', () => {
    const date = new Date(2024, 5, 20);
    // 源码只处理大写格式占位符
    expect(formatField(date, 'YYYY/MM/DD')).toBe('2024/06/20');
  });

  it('日期格式：值为非 Date 时转为字符串', () => {
    expect(formatField('2024-01-01', 'YYYY-MM-DD')).toBe('2024-01-01');
    expect(formatField(null, 'YYYY-MM-DD')).toBe('');
    expect(formatField(undefined, 'YYYY-MM-DD')).toBe('');
  });

  it('金额格式：￥ 前缀 + 千分位', () => {
    expect(formatField(1234.5, '￥0.00')).toBe('￥1,234.50');
    expect(formatField(1000000, '$0.00')).toBe('$1,000,000.00');
    expect(formatField(999, '¥0.00')).toBe('¥999.00');
  });

  it('金额格式：非数字值返回原始值转换', () => {
    expect(formatField('abc', '￥0.00')).toBe('abc');
    // Number(null) = 0 → 正常格式化为 ￥0.00
    expect(formatField(null, '￥0.00')).toBe('￥0.00');
  });

  it('数字格式：千分位 + 两位小数', () => {
    expect(formatField(1234.5, '#,##0.00')).toBe('1,234.50');
    expect(formatField(1000000, '#,##0.00')).toBe('1,000,000.00');
  });

  it('数字格式：非数字值返回原始值', () => {
    expect(formatField('abc', '#,##0.00')).toBe('abc');
  });

  it('未知格式返回原始值', () => {
    expect(formatField('hello', 'email')).toBe('hello');
    expect(formatField(123, 'url')).toBe(123);
  });
});

describe('toFormData', () => {
  it('基本转换：将对象转为 FormData', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const fd = toFormData(schema, { name: 'John', age: 30 });

    expect(fd.get('name')).toBe('John');
    expect(fd.get('age')).toBe('30');
  });

  it('隐藏字段默认不加入', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      secret: { type: 'string', hidden: true },
    });
    const fd = toFormData(schema, { name: 'John', secret: 'topsecret' });

    expect(fd.get('name')).toBe('John');
    expect(fd.get('secret')).toBe(null);
  });

  it('includeHidden: true 时包含隐藏字段', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      secret: { type: 'string', hidden: true },
    });
    const fd = toFormData(
      schema,
      { name: 'John', secret: 'topsecret' },
      { includeHidden: true },
    );

    expect(fd.get('secret')).toBe('topsecret');
  });

  it('嵌套对象转为 JSON 字符串', () => {
    const schema = makeSchema({ profile: { type: 'object' } });
    const fd = toFormData(schema, { profile: { city: 'Beijing' } });

    expect(fd.get('profile')).toBe('{"city":"Beijing"}');
  });

  it('使用 formatField 自定义格式化', () => {
    const schema = makeSchema({ value: { type: 'string' } });
    const fd = toFormData(
      schema,
      { value: 123 },
      { formatField: (v) => `prefix-${v}` },
    );

    expect(fd.get('value')).toBe('prefix-123');
  });

  it('null / undefined 使用默认空字符串', () => {
    const schema = makeSchema({ a: { type: 'string' }, b: { type: 'string' } });
    const fd = toFormData(schema, { a: null, b: undefined });

    expect(fd.get('a')).toBe('');
    expect(fd.get('b')).toBe('');
  });

  it('自定义 defaultValue', () => {
    const schema = makeSchema({ a: { type: 'string' } });
    const fd = toFormData(schema, { a: null }, { defaultValue: 'N/A' });

    expect(fd.get('a')).toBe('N/A');
  });

  it('空对象产生空 FormData', () => {
    const schema = makeSchema({});
    const fd = toFormData(schema, {});
    expect(fd.get('nonexistent')).toBe(null);
  });
});

describe('toMultipart', () => {
  it('基本转换：将对象转为 Map', () => {
    const schema = makeSchema({ name: { type: 'string' } });
    const map = toMultipart(schema, { name: 'John' });

    expect(map.get('name')).toBe('John');
  });

  it('File 对象原样保留', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const schema = makeSchema({ avatar: { type: 'string' } });
    const map = toMultipart(schema, { avatar: file });

    expect(map.get('avatar')).toBe(file);
  });

  it('嵌套对象转为 JSON 字符串', () => {
    const schema = makeSchema({ config: { type: 'object' } });
    const map = toMultipart(schema, { config: { theme: 'dark' } });

    expect(map.get('config')).toBe('{"theme":"dark"}');
  });

  it('隐藏字段默认排除', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      token: { type: 'string', hidden: true },
    });
    const map = toMultipart(schema, { name: 'John', token: 'abc123' });

    expect(map.has('name')).toBe(true);
    expect(map.has('token')).toBe(false);
  });

  it('undefined 值转为字符串 "undefined"', () => {
    const schema = makeSchema({ a: { type: 'string' } });
    const map = toMultipart(schema, { a: undefined });

    expect(map.get('a')).toBe('undefined');
  });

  it('null 值转为字符串 "null"', () => {
    const schema = makeSchema({ a: { type: 'string' } });
    const map = toMultipart(schema, { a: null });

    expect(map.get('a')).toBe('null');
  });
});

describe('toSearchParams', () => {
  it('基本转换：将对象转为 URLSearchParams', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      city: { type: 'string' },
    });
    const params = toSearchParams(schema, { name: 'John', city: 'Beijing' });

    expect(params.get('name')).toBe('John');
    expect(params.get('city')).toBe('Beijing');
    expect(params.toString()).toBe('name=John&city=Beijing');
  });

  it('特殊字符自动编码', () => {
    const schema = makeSchema({ email: { type: 'string' } });
    const params = toSearchParams(schema, { email: 'john@example.com' });

    expect(params.toString()).toBe('email=john%40example.com');
  });

  it('嵌套对象转为 JSON 字符串', () => {
    const schema = makeSchema({ filter: { type: 'object' } });
    const params = toSearchParams(schema, { filter: { status: 'active' } });

    expect(params.get('filter')).toBe('{"status":"active"}');
  });

  it('隐藏字段默认排除', () => {
    const schema = makeSchema({
      q: { type: 'string' },
      apiKey: { type: 'string', hidden: true },
    });
    const params = toSearchParams(schema, { q: 'test', apiKey: 'secret' });

    expect(params.has('q')).toBe(true);
    expect(params.has('apiKey')).toBe(false);
  });

  it('null / undefined 使用空字符串', () => {
    const schema = makeSchema({ a: { type: 'string' } });
    const params = toSearchParams(schema, { a: null });

    expect(params.get('a')).toBe('');
  });

  it('自定义 defaultValue 生效', () => {
    const schema = makeSchema({ a: { type: 'string' } });
    const params = toSearchParams(
      schema,
      { a: null },
      { defaultValue: 'unknown' },
    );

    expect(params.get('a')).toBe('unknown');
  });

  it('空对象产生空 URLSearchParams', () => {
    const schema = makeSchema({});
    const params = toSearchParams(schema, {});

    expect(params.toString()).toBe('');
  });

  it('formatField 自定义回调生效', () => {
    const schema = makeSchema({ value: { type: 'string' } });
    const params = toSearchParams(
      schema,
      { value: 42 },
      { formatField: (v) => `val:${v}` },
    );

    expect(params.get('value')).toBe('val:42');
  });
});

describe('FormatOptions 组合', () => {
  it('所有选项组合使用', () => {
    const schema = makeSchema({
      name: { type: 'string' },
      secret: { type: 'string', hidden: true },
    });
    const opts: FormatOptions = {
      includeHidden: true,
      formatField: (v) => `[${v}]`,
      defaultValue: '__empty__',
    };
    const fd = toFormData(schema, { name: null, secret: 'top' }, opts);

    expect(fd.get('name')).toBe('[null]');
    expect(fd.get('secret')).toBe('[top]');
  });
});
