/**
 * setFieldValues 扁平键名支持测试
 *
 * 覆盖：setValues({ 'a.b': 'value' }) 时，引擎正确解析扁平键名赋值
 * 而非将路径拆分为嵌套对象路径导致取值失败。
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('setFieldValues 扁平键名支持', () => {
  it('setValues({ "a.b": "value" }) 正确赋值给路径 a.b 的字段', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    engine.init(schema);
    engine.setFieldValues({ 'a.b': 'hello' });

    expect(engine.getFieldValue('a.b')).toBe('hello');
  });

  it('setValues({ "a.b.c": "value" }) 正确赋值给深层路径字段', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: { type: 'string', widget: 'input' },
              },
            },
          },
        },
      },
    };

    engine.init(schema);
    engine.setFieldValues({ 'a.b.c': 'world' });

    expect(engine.getFieldValue('a.b.c')).toBe('world');
  });

  it('setValues 同时支持扁平键名和嵌套对象格式', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string', widget: 'input' },
            c: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    engine.init(schema);

    // 扁平键名
    engine.setFieldValues({ 'a.b': 'flat' });
    expect(engine.getFieldValue('a.b')).toBe('flat');

    // 嵌套对象格式（原有行为不变）
    engine.setFieldValues({ a: { b: 'nested', c: 'nested-c' } });
    expect(engine.getFieldValue('a.b')).toBe('nested');
    expect(engine.getFieldValue('a.c')).toBe('nested-c');
  });

  it('带 bind 配置的字段：优先匹配扁平键名', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', bind: 'user.name' },
      },
    };

    engine.init(schema);

    // 扁平键名 user.name
    engine.setFieldValues({ 'user.name': 'alice' });
    expect(engine.getFieldValue('name')).toBe('alice');
  });

  it('嵌套对象优先于扁平键名（values["a"] 存在时不取 values["a.b"]）', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    engine.init(schema);

    // values.a 存在时，应该用嵌套对象格式，忽略 values['a.b']
    engine.setFieldValues({ a: { b: 'from-nested' }, 'a.b': 'from-flat' });
    expect(engine.getFieldValue('a.b')).toBe('from-nested');
  });

  it('init 前 setFieldValues 缓冲也支持扁平键名', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    // init 前设置扁平键名
    engine.setFieldValues({ 'a.b': 'before-init' });
    engine.init(schema);

    expect(engine.getFieldValue('a.b')).toBe('before-init');
  });
});
