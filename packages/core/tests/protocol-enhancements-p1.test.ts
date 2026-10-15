/**
 * 协议增强测试（二）：P1 协议增强
 * 覆盖：
 * - reaction state.value 计算字段（formily 对齐）
 * - touched/dirty 字段状态（rc-field-form 对齐）
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
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

describe('setFieldValue 副作用门控（changed 门控 / 死循环防护）', () => {
  it('同步校验器内 setFieldValue 设回原值不触发死循环', () => {
    const engine = new NexusEngine();
    let validatorCalls = 0;
    let exceeded = false;
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          widget: 'input',
          rules: [
            {
              // 幂等副作用：校验器内把字段设回当前值（模拟自动纠错 / 默认值回填）
              validator: (_value, _rule, _formData, path) => {
                validatorCalls++;
                if (validatorCalls > 5) {
                  // 回归护栏：若未做同值门控，校验会被反复触发直至此处兜底
                  exceeded = true;
                  return undefined;
                }
                engine.setFieldValue(path as string, engine.getFieldValue(path as string));
                return undefined;
              },
            },
          ],
        },
      },
    };
    engine.init(schema);
    // 不应无限循环 / 抛错
    expect(() => engine.setFieldValue('name', 'b')).not.toThrow();
    expect(engine.getFieldValue('name')).toBe('b');
    // 幂等设回原值不应重新进入校验：validator 仅被调用 1 次
    expect(validatorCalls).toBe(1);
    expect(exceeded).toBe(false);
    // dirty 语义保持正确：当前值 'b' ≠ 初始值 undefined → dirty true
    expect(engine.isFieldDirty('name')).toBe(true);
  });

  it('同值重复写入不触发校验/联动副作用（无变化）', () => {
    const engine = new NexusEngine();
    let validationRuns = 0;
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          widget: 'input',
          rules: [
            {
              validator: () => {
                validationRuns++;
                return undefined;
              },
            },
          ],
        },
      },
    };
    engine.init(schema);
    // 首次写入不同值 → 触发校验
    engine.setFieldValue('a', 'x');
    const afterFirst = validationRuns;
    expect(afterFirst).toBe(1);
    // 再次写入相同值 → changed=false，不应再触发校验
    engine.setFieldValue('a', 'x');
    expect(validationRuns).toBe(afterFirst);
    // 但 dirty 维持（值仍偏离初始值）
    expect(engine.isFieldDirty('a')).toBe(true);
  });
});
