/**
 * 多实例测试
 *
 * 实例路由（engine.instance(id) 视图）是引擎的内部机制，由 FormController
 * 按 NexusForm 挂载自动分配实例标识——用户侧不感知任何 instanceId。
 * 覆盖：不同实例的 schema/值/订阅/校验/重置隔离，引擎级能力（插件/组件）共享，
 * 以及不同引擎（不同 useForm()）之间的完全独立。
 */

import { describe, expect, it } from 'vitest';
import { AsyncValidatorPlugin } from '../src/async-validator';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

const schemaA: NexusSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', widget: 'input' },
  },
};

const schemaB: NexusSchema = {
  type: 'object',
  properties: {
    city: { type: 'string', widget: 'input' },
  },
};

describe('同一引擎宿主的多实例（engine.instance 视图）', () => {
  it('不同实例的 schema 与值互不影响', () => {
    const engine = new NexusEngine();
    const a = engine.instance('a');
    const b = engine.instance('b');

    a.init(schemaA, { name: '张三' });
    b.init(schemaB, { city: '北京' });

    expect(a.getFieldValue('name')).toBe('张三');
    expect(a.getFieldValue('city')).toBeUndefined();
    expect(b.getFieldValue('city')).toBe('北京');
    expect(b.getFieldValue('name')).toBeUndefined();
    expect(a.getFormData()).toEqual({ name: '张三' });
    expect(b.getFormData()).toEqual({ city: '北京' });
  });

  it('宿主引擎（default 实例）与视图实例隔离', () => {
    const engine = new NexusEngine();
    engine.init(schemaA, { name: '默认' });
    const view = engine.instance('other');
    view.init(schemaB, { city: '上海' });

    expect(engine.getFieldValue('name')).toBe('默认');
    expect(engine.getFieldValue('city')).toBeUndefined();
    expect(view.getFieldValue('city')).toBe('上海');
  });

  it('实例 A 的值变更不触发实例 B 的订阅', () => {
    const engine = new NexusEngine();
    const a = engine.instance('a');
    const b = engine.instance('b');
    a.init(schemaA);
    b.init(schemaB);

    let bNotified = 0;
    b.subscribeField('city', () => {
      bNotified++;
    });

    a.setFieldValue('name', '李四');
    expect(bNotified).toBe(0);
    expect(b.getFieldValue('city')).toBe('');
  });

  it('实例 A 的 reset / setSchema 不影响实例 B', () => {
    const engine = new NexusEngine();
    const a = engine.instance('a');
    const b = engine.instance('b');
    a.init(schemaA, { name: 'A1' });
    b.init(schemaB, { city: 'B1' });

    a.setFieldValue('name', 'A2');
    a.reset();
    expect(a.getFieldValue('name')).toBe('A1');
    expect(b.getFieldValue('city')).toBe('B1');

    a.setSchema({
      type: 'object',
      properties: { age: { type: 'number', widget: 'input' } },
    });
    expect(a.getFieldValue('age')).toBeUndefined();
    expect(a.getSchema()?.properties.age).toBeDefined();
    expect(b.getSchema()?.properties.city).toBeDefined();
  });

  it('实例间共享引擎级能力（插件/组件注册）', () => {
    const engine = new NexusEngine();
    engine.use(new AsyncValidatorPlugin(engine));
    const a = engine.instance('a');
    const b = engine.instance('b');
    expect(a.hasPlugin('async-validator')).toBe(true);
    expect(b.hasPlugin('async-validator')).toBe(true);
  });

  it('异步校验器按实例生效（onValidateField 携带实例视图）', async () => {
    const engine = new NexusEngine();
    engine.use(new AsyncValidatorPlugin(engine, { debounce: 10 }));
    const a = engine.instance('a');
    const b = engine.instance('b');
    a.init(schemaA);
    b.init(schemaB);

    a.registerFieldValidator('name', async (value) =>
      value === 'bad' ? ['A 校验失败'] : [],
    );
    a.setFieldValue('name', 'bad');

    await new Promise((r) => setTimeout(r, 50));
    expect(a.getFieldError('name')).toContain('A 校验失败');
    // B 实例没有该校验器，不受影响
    expect(b.getFieldError('name')).toEqual([]);
  });

  it('视图与宿主共享字段状态（同实例标识不同视图语义等价）', () => {
    const engine = new NexusEngine();
    const a1 = engine.instance('a');
    const a2 = engine.instance('a');
    a1.init(schemaA, { name: '共享' });
    expect(a2.getFieldValue('name')).toBe('共享');
    a2.setFieldValue('name', '更新');
    expect(a1.getFieldValue('name')).toBe('更新');
  });
});

describe('不同引擎（不同 useForm()）', () => {
  it('不同引擎的 schema 与值互不影响', () => {
    const a = new NexusEngine();
    const b = new NexusEngine();

    a.init(schemaA, { name: '张三' });
    b.init(schemaB, { city: '北京' });

    expect(a.getFormData()).toEqual({ name: '张三' });
    expect(b.getFormData()).toEqual({ city: '北京' });
  });

  it('插件按引擎注册，互不共享', () => {
    const a = new NexusEngine();
    const b = new NexusEngine();
    a.use(new AsyncValidatorPlugin(a));
    expect(a.hasPlugin('async-validator')).toBe(true);
    expect(b.hasPlugin('async-validator')).toBe(false);
  });
});
