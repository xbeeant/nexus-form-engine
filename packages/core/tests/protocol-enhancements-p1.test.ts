/**
 * 协议增强测试（二）：P1 协议增强
 * 覆盖：
 * - reaction state.value 计算字段（formily 对齐）
 * - touched/dirty 字段状态（rc-field-form 对齐）
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

describe('reaction state.value 计算字段（formily 对齐）', () => {
  it('fulfill.state.value 表达式计算字段值', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        price: {
          type: 'number',
          widget: 'number',
          title: '单价',
          default: 10,
        },
        count: {
          type: 'number',
          widget: 'number',
          title: '数量',
          default: 2,
        },
        total: {
          type: 'number',
          widget: 'number',
          title: '总额',
          readOnly: true,
          reactions: [
            {
              dependencies: ['price', 'count'],
              fulfill: {
                state: { value: '{{ $deps[0] * $deps[1] }}' },
              },
            },
          ],
        },
      },
    };
    engine.init(schema);
    expect(engine.getFieldValue('total')).toBe(20);
    engine.setFieldValue('count', 5);
    expect(engine.getFieldValue('total')).toBe(50);
  });

  it('计算字段值变化沿依赖图继续传播', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: { type: 'number', widget: 'number', default: 2 },
        b: {
          type: 'number',
          widget: 'number',
          title: 'B',
          reactions: [
            {
              dependencies: ['a'],
              fulfill: { state: { value: '{{ $deps[0] * 3 }}' } },
            },
          ],
        },
        c: {
          type: 'number',
          widget: 'number',
          title: 'C',
          reactions: [
            {
              dependencies: ['b'],
              fulfill: { state: { value: '{{ $deps[0] + 1 }}' } },
            },
          ],
        },
      },
    };
    engine.init(schema);
    expect(engine.getFieldValue('c')).toBe(7);
    engine.setFieldValue('a', 10);
    expect(engine.getFieldValue('b')).toBe(30);
    expect(engine.getFieldValue('c')).toBe(31);
  });

  it('计算字段参与 formData 收集（可见时含值）', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        price: { type: 'number', widget: 'number', title: '单价', default: 4 },
        count: { type: 'number', widget: 'number', title: '数量', default: 3 },
        total: {
          type: 'number',
          widget: 'number',
          title: '总额',
          reactions: [
            {
              dependencies: ['price', 'count'],
              fulfill: { state: { value: '{{ $deps[0] * $deps[1] }}' } },
            },
          ],
        },
      },
    };
    engine.init(schema);
    expect(engine.getFormData().total).toBe(12);
  });
});

describe('touched/dirty 字段状态（rc-field-form 对齐）', () => {
  it('初始为 false，值写入后 touched/dirty 更新', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名', default: 'a' },
      },
    };
    engine.init(schema);
    expect(engine.isFieldTouched('name')).toBe(false);
    expect(engine.isFieldDirty('name')).toBe(false);
    engine.setFieldValue('name', 'b');
    expect(engine.isFieldTouched('name')).toBe(true);
    expect(engine.isFieldDirty('name')).toBe(true);
  });

  it('写回初始值后 dirty 归 false（touched 保留）', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名', default: 'a' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'b');
    engine.setFieldValue('name', 'a');
    expect(engine.isFieldTouched('name')).toBe(true);
    expect(engine.isFieldDirty('name')).toBe(false);
  });

  it('reset() 后 touched/dirty 归零', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名', default: 'a' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'b');
    expect(engine.isFieldDirty('name')).toBe(true);
    engine.reset();
    expect(engine.isFieldTouched('name')).toBe(false);
    expect(engine.isFieldDirty('name')).toBe(false);
    expect(engine.getFieldValue('name')).toBe('a');
  });

  it('setFieldValues 批量写入同步维护 dirty', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名' },
        age: { type: 'number', widget: 'number', title: '年龄' },
      },
    };
    engine.init(schema);
    engine.setFieldValues({ name: 'x', age: 20 });
    expect(engine.isFieldDirty('name')).toBe(true);
    expect(engine.isFieldDirty('age')).toBe(true);
  });

  it('数组/对象字段深比较判断 dirty', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          widget: 'list',
          title: '标签',
          default: ['a'],
          items: { type: 'string' },
        },
        info: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              widget: 'input',
              title: '城市',
              default: 'x',
            },
          },
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('tags', ['a']);
    expect(engine.isFieldDirty('tags')).toBe(false);
    engine.setFieldValue('tags', ['a', 'b']);
    expect(engine.isFieldDirty('tags')).toBe(true);
    engine.setFieldValue('info.city', 'y');
    expect(engine.isFieldDirty('info.city')).toBe(true);
  });
});
